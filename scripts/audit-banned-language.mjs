import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const scanRoots = ["app", "src", "backend", "docs", "assets", "outputs"];
const skippedDirectories = new Set([".git", "node_modules", ".expo", "dist", "coverage"]);
const allowedLegalPaths = [
  "src/legal/policy-outline.ts",
  "src/screens/privacy-support-legal-screen.tsx",
  "docs/release/COMPLIANCE_RULEBOOK.md",
  "docs/release/PRODUCT_CONTRACT.md",
  "docs/release/APP_REVIEW_NOTES.md",
  "docs/release/APP_PRIVACY_ANSWERS.md"
];

const bannedTerms = [
  "earn",
  "earn crypto",
  "earn money",
  "cash out",
  "cash-out",
  "profit",
  "passive income",
  "Bitcoin",
  "Ethereum",
  "Satoshi",
  "Hash",
  "mining",
  "miner",
  "wallet",
  "trading",
  "staking",
  "NFT",
  "airdrop",
  "investment",
  "rich",
  "moon",
  "real rewards",
  "financial freedom"
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
    return fullPath;
  });
}

function termPattern(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "[\\s-]+");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
}

const files = scanRoots
  .filter((root) => {
    try {
      return statSync(root).isDirectory();
    } catch {
      return false;
    }
  })
  .flatMap(listFiles)
  .filter((file) => /\.(tsx|ts|md|json|svg)$/.test(file));
const failures = [];
const allowed = [];

for (const file of files) {
  const relativePath = relative(process.cwd(), file);
  const text = readFileSync(file, "utf8");
  for (const term of bannedTerms) {
    if (!termPattern(term).test(text)) {
      continue;
    }
    if (allowedLegalPaths.includes(relativePath)) {
      allowed.push(`${relativePath}: ${term}`);
      continue;
    }
    failures.push(`${relativePath}: ${term}`);
  }
}

if (failures.length > 0) {
  console.error("Banned language found outside legal/compliance context:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  if (allowed.length > 0) {
    console.error("Allowed legal/compliance matches:");
    for (const item of allowed) {
      console.error(`- ${item}`);
    }
  }
  process.exit(1);
}

console.log(`Banned language scan passed for ${files.length} files.`);
if (allowed.length > 0) {
  console.log(`Allowed legal/compliance references: ${allowed.length}.`);
}
