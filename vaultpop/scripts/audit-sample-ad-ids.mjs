import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const roots = ["app", "src", "backend", "docs", "assets", "outputs"];
const skippedDirectories = new Set(["node_modules", ".git", ".expo", "dist", "coverage"]);
const sampleIdPattern = /ca-app-pub-3940256099942544[~/][0-9]+/g;
const failures = [];

function listFiles(path) {
  return readdirSync(path).flatMap((entry) => {
    if (skippedDirectories.has(entry)) {
      return [];
    }
    const fullPath = join(path, entry);
    return statSync(fullPath).isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

for (const root of roots) {
  if (!statExists(root)) {
    continue;
  }
  for (const file of listFiles(root)) {
    if (!/\.(ts|tsx|js|mjs|json|md|svg)$/.test(file)) {
      continue;
    }
    if (sampleIdPattern.test(readFileSync(file, "utf8"))) {
      failures.push(relative(process.cwd(), file));
    }
    sampleIdPattern.lastIndex = 0;
  }
}

if (failures.length > 0) {
  console.error(`Sample ad unit IDs found: ${failures.join(", ")}`);
  process.exit(1);
}

console.log("Sample ad unit ID scan passed.");

function statExists(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
