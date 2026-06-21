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

function pushBucket(bucket, key, value) {
  if (!bucket[key]) {
    bucket[key] = [];
  }
  bucket[key].push(value);
}

function buildShapeKey(chars) {
  const counts = new Map();
  chars.forEach((char) => {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  });
  const pattern = chars
    .map((char) => counts.get(char))
    .join("");
  const uniqueCount = counts.size;
  const repeated = [...counts.values()]
    .filter((count) => count > 1)
    .sort((left, right) => right - left)
    .join("");

  return `${chars.length}:${uniqueCount}:${pattern}:${repeated || "0"}`;
}

const wordMeta = [];
const lengthBuckets = {};
const shapeBuckets = {};
const headBuckets = {};
const tailBuckets = {};
const charBuckets = {};

ordered.forEach((word, index) => {
  const chars = [...word];
  const uniqueChars = [...new Set(chars)];
  const meta = {
    length: chars.length,
    chars,
    uniqueChars,
    headChar: chars[0],
    tailChar: chars[chars.length - 1],
    charHash: uniqueChars.slice().sort((left, right) => left.localeCompare(right, "zh-Hans-CN")).join(""),
    shapeKey: buildShapeKey(chars),
  };

  wordMeta.push(meta);
  pushBucket(lengthBuckets, String(meta.length), index);
  pushBucket(shapeBuckets, meta.shapeKey, index);
  pushBucket(headBuckets, meta.headChar, index);
  pushBucket(tailBuckets, meta.tailChar, index);
  uniqueChars.forEach((char) => pushBucket(charBuckets, char, index));
});

const payload = {
  metadataVersion: "cedict-mdbg-ts-utf8",
  words: ordered,
  wordMeta,
  lengthBuckets,
  shapeBuckets,
  headBuckets,
  tailBuckets,
  charBuckets,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(`Generated ${ordered.length} words to ${outputPath}`);
