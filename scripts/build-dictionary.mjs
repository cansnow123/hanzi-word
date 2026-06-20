import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const projectRoot = path.resolve(process.cwd());
const sourcePath = path.join(projectRoot, "cedict_ts.u8.gz");
const outputPath = path.join(projectRoot, "src", "data", "dictionary.generated.json");

const raw = zlib.gunzipSync(fs.readFileSync(sourcePath)).toString("utf8");
const words = new Set();

for (const line of raw.split("\n")) {
  if (!line || line.startsWith("#")) {
    continue;
  }

  const match = line.match(/^\S+\s+(\S+)\s+\[[^\]]+\]\s+\//);
  if (!match) {
    continue;
  }

  const word = match[1].trim();
  if (!/^[\u3400-\u9fff]{2,6}$/.test(word)) {
    continue;
  }

  words.add(word);
}

const ordered = [...words].sort((left, right) => left.length - right.length || left.localeCompare(right, "zh-Hans-CN"));

const payload = {
  metadataVersion: "cedict-mdbg-ts-utf8",
  words: ordered,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(`Generated ${ordered.length} words to ${outputPath}`);
