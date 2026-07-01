import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const assetOutputDir = join(process.cwd(), "assets", "screenshots");
const userOutputDir = join(process.cwd(), "outputs", "vaultpop-screenshots");
mkdirSync(assetOutputDir, { recursive: true });
mkdirSync(userOutputDir, { recursive: true });

const scenes = [
  {
    file: "splash.svg",
    title: "VaultPop",
    subtitle: "Local-first loading screen",
    bullets: ["Portrait iPhone shell", "No network call before play", "Premium dark arcade"]
  },
  {
    file: "home.svg",
    title: "VaultPop",
    subtitle: "Pop Coins. Complete the Chain.",
    bullets: ["Start", "Shop", "Cosmetics", "Support"]
  },
  {
    file: "mode-select.svg",
    title: "Choose Mode",
    subtitle: "Classic Mode / Daily Vault / Streak Mode",
    bullets: ["60-second score attack", "Daily board seed", "Three-miss streak run"]
  },
  {
    file: "gameplay.svg",
    title: "Classic Mode",
    subtitle: "8 x 8 coin tile board",
    bullets: ["Score 1240", "Time 42s", "Combo 4x", "Vault Meter 72%"]
  },
  {
    file: "pause.svg",
    title: "Paused",
    subtitle: "Round control screen",
    bullets: ["Resume", "Settings", "Mode Select"]
  },
  {
    file: "results.svg",
    title: "Round Result",
    subtitle: "Local score summary",
    bullets: ["Score 3840", "Best 3840", "Fictional Points +15", "Replay"]
  },
  {
    file: "cosmetics.svg",
    title: "Cosmetics",
    subtitle: "Local theme progression",
    bullets: ["Midnight Vault", "Cyan Circuit", "Emerald Pulse", "Violet Neon"]
  },
  {
    file: "settings.svg",
    title: "Settings",
    subtitle: "Local preferences",
    bullets: ["Sound", "Haptics", "Restore Purchases", "Reset Local Progress"]
  },
  {
    file: "shop.svg",
    title: "Shop",
    subtitle: "Optional fixed packs and upgrades",
    bullets: ["Starter Booster Pack", "Vault Coin Packs", "Ad-Free Upgrade", "Restore Purchases"]
  },
  {
    file: "support.svg",
    title: "Support",
    subtitle: "Private in-app support request",
    bullets: ["Category", "Message", "Email (Optional)", "Submit Support Request"]
  },
  {
    file: "legal.svg",
    title: "Privacy and Support",
    subtitle: "Plain-language policy screen",
    bullets: ["Ads and purchases disclosed", "In-App Support", "Privacy Policy"]
  }
];

function escapeSvg(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderScene(scene) {
  const rows = scene.bullets
    .map(
      (bullet, index) => `
      <rect x="58" y="${258 + index * 82}" width="314" height="54" rx="10" fill="#151D2E" stroke="#27324A"/>
      <text x="78" y="${292 + index * 82}" fill="#F8FBFF" font-family="Arial" font-size="18" font-weight="700">${escapeSvg(
        bullet
      )}</text>`
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="430" height="932" viewBox="0 0 430 932">
  <rect width="430" height="932" fill="#070A12"/>
  <rect x="34" y="54" width="362" height="824" rx="34" fill="#0D1322" stroke="#27324A"/>
  <circle cx="350" cy="120" r="38" fill="#F6C65B" opacity="0.18"/>
  <circle cx="76" cy="182" r="44" fill="#43D9FF" opacity="0.12"/>
  <text x="58" y="146" fill="#43D9FF" font-family="Arial" font-size="13" font-weight="800">VAULTPOP IOS V1</text>
  <text x="58" y="194" fill="#F8FBFF" font-family="Arial" font-size="38" font-weight="800">${escapeSvg(
    scene.title
  )}</text>
  <text x="58" y="230" fill="#AAB6CE" font-family="Arial" font-size="17">${escapeSvg(
    scene.subtitle
  )}</text>
  ${rows}
  <rect x="58" y="760" width="314" height="28" rx="14" fill="#151D2E"/>
  <rect x="58" y="760" width="226" height="28" rx="14" fill="#43D9FF"/>
  <text x="58" y="824" fill="#AAB6CE" font-family="Arial" font-size="13">Generated reference from implemented in-app screen copy.</text>
</svg>`;
}

for (const scene of scenes) {
  const rendered = renderScene(scene);
  writeFileSync(join(assetOutputDir, scene.file), rendered);
  writeFileSync(join(userOutputDir, scene.file), rendered);
}

console.log(`Generated ${scenes.length} screenshot reference SVG files.`);
