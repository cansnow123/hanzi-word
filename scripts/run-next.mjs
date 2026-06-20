import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const [, , command] = process.argv;

if (command !== "dev" && command !== "start") {
  console.error("Usage: node scripts/run-next.mjs <dev|start>");
  process.exit(1);
}

const projectRoot = process.cwd();
const envFiles =
  command === "dev"
    ? [".env.local", ".env"]
    : [".env.production.local", ".env.production", ".env.local", ".env"];

for (const fileName of envFiles) {
  loadEnvFile(path.join(projectRoot, fileName));
}

const port = normalizePort(process.env.PORT);
const hostname = process.env.HOSTNAME?.trim() || "0.0.0.0";
const args =
  command === "dev"
    ? [path.join(projectRoot, "node_modules", "next", "dist", "bin", "next"), "dev", "--webpack", "--port", port, "--hostname", hostname]
    : [path.join(projectRoot, ".next", "standalone", "server.js")];

const child = spawn(process.execPath, args, {
  cwd: command === "start" ? path.join(projectRoot, ".next", "standalone") : projectRoot,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    const value = stripQuotes(line.slice(separatorIndex + 1).trim());
    process.env[key] = value;
  }
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function normalizePort(value) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0 && parsed < 65536) {
    return String(parsed);
  }
  return "3000";
}
