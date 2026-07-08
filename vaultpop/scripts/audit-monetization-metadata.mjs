import { readFileSync } from "node:fs";

const catalog = readFileSync("src/monetization/catalog.ts", "utf8");
const ads = readFileSync("src/ads/constants.ts", "utf8");
const appConfig = JSON.parse(readFileSync("app.json", "utf8"));
const reviewNotes = readFileSync("docs/release/APP_REVIEW_NOTES.md", "utf8");
const privacyAnswers = readFileSync("docs/release/APP_PRIVACY_ANSWERS.md", "utf8");
const failures = [];

const products = [
  ["app.vaultpop.boosters.starter", "US$2.99"],
  ["app.vaultpop.coins.small", "US$0.99"],
  ["app.vaultpop.coins.medium", "US$3.99"],
  ["app.vaultpop.coins.large", "US$8.99"],
  ["app.vaultpop.remove_ads", "US$4.99"],
  ["app.vaultpop.vaultpass.monthly", "US$2.99/month"]
];
let previousIndex = -1;
for (const [productId, price] of products) {
  const index = catalog.indexOf(productId);
  if (index < 0) {
    failures.push(`Missing product ID: ${productId}`);
  }
  if (!catalog.includes(price)) {
    failures.push(`Missing price: ${price}`);
  }
  if (index <= previousIndex) {
    failures.push(`Incorrect Shop order at: ${productId}`);
  }
  previousIndex = index;
}

const adIds = [
  "ca-app-pub-6035003811280283~7349136854",
  "ca-app-pub-6035003811280283/7582473518",
  "ca-app-pub-6035003811280283/4722973514",
  "ca-app-pub-6035003811280283/3409891849",
  "ca-app-pub-6035003811280283/9333822278",
  "ca-app-pub-6035003811280283/3675018099"
];
for (const adId of adIds) {
  if (!ads.includes(adId) && !JSON.stringify(appConfig).includes(adId)) {
    failures.push(`Missing AdMob ID: ${adId}`);
  }
}

if (appConfig.expo.ios.bundleIdentifier !== "app.vaultpop") {
  failures.push("Bundle ID mismatch.");
}
for (const phrase of ["in-app purchases", "AdMob", "Support"]) {
  if (!reviewNotes.includes(phrase)) {
    failures.push(`App Review notes missing: ${phrase}`);
  }
}
for (const phrase of ["Purchases", "Advertising data", "anonymous install ID"]) {
  if (!privacyAnswers.includes(phrase)) {
    failures.push(`App Privacy draft missing: ${phrase}`);
  }
}

if (failures.length > 0) {
  console.error("Monetization metadata audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Monetization metadata audit passed.");
