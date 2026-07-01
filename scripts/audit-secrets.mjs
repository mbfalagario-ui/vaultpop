import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const skippedDirectories = new Set([".git", "node_modules", ".expo", "dist", "coverage"]);
const skippedFiles = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "scripts/audit-secrets.mjs"
]);
const patterns = [
  { label: "GitHub token", regex: /ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+/ },
  { label: "Fly token", regex: /FlyV1|fm2_[A-Za-z0-9+/=]+/ },
  { label: "Private key material", regex: /BEGIN (?:EC |RSA |OPENSSH |)?PRIVATE KEY/ },
  { label: "Apple key filename", regex: /AuthKey_[A-Z0-9]+\.p8|SubscriptionKey_[A-Z0-9]+\.p8/ },
  { label: "Certificate filename", regex: /Certificates\.p12/ },
  { label: "Non-empty secret env", regex: /^(EXPO_TOKEN|GITHUB_TOKEN|FLY_API_TOKEN)=\S+/m }
];

function listFiles(path) {
  const entries = readdirSync(path);
  return entries.flatMap((entry) => {
    if (skippedDirectories.has(entry)) {
      return [];
    }
    const fullPath = join(path, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      return listFiles(fullPath);
    }
    if (skippedFiles.has(entry) || skippedFiles.has(relativePathFromRoot(fullPath))) {
      return [];
    }
    return fullPath;
  });
}

const failures = [];

function relativePathFromRoot(path) {
  return path.replace(`${process.cwd()}/`, "");
}

for (const file of listFiles(process.cwd())) {
  const relativePath = relative(process.cwd(), file);
  const text = readFileSync(file, "utf8");
  for (const pattern of patterns) {
    if (pattern.regex.test(text)) {
      failures.push(`${relativePath}: ${pattern.label}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Secret scan failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Secret scan passed.");
