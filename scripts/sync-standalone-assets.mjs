import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, ".next", "standalone");
const standaloneNextDir = path.join(standaloneRoot, ".next");

if (!fs.existsSync(standaloneRoot)) {
  console.error("Standalone output not found. Run `npm run build` first.");
  process.exit(1);
}

copyDirectory(path.join(projectRoot, "public"), path.join(standaloneRoot, "public"));
copyDirectory(path.join(projectRoot, ".next", "static"), path.join(standaloneNextDir, "static"));

console.log("Synced public and .next/static into .next/standalone");

function copyDirectory(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    return;
  }

  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}
