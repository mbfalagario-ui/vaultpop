import { existsSync, readFileSync } from "node:fs";

const requiredRoutes = [
  "app/index.tsx",
  "app/modes.tsx",
  "app/gameplay.tsx",
  "app/pause.tsx",
  "app/results.tsx",
  "app/how-to-play.tsx",
  "app/cosmetics.tsx",
  "app/settings.tsx",
  "app/shop.tsx",
  "app/support.tsx",
  "app/account.tsx",
  "app/legal.tsx"
];

const requiredScreenCopy = [
  ["src/screens/home-screen.tsx", ["PLAY", "How to Play", "Settings", "Shop", "Styles", "Support", "Privacy & Legal"]],
  ["src/screens/how-to-play-screen.tsx", ["THE CORE LOOP", "COMBO AND VAULT", "CHOOSE YOUR VAULT", "BOOSTERS"]],
  ["src/screens/mode-select-screen.tsx", ["GAME_MODES", "ModeCard"]],
  ["src/game/constants.ts", ["Classic Mode", "Daily Vault", "Streak Mode"]],
  ["src/screens/gameplay-screen.tsx", ["Restart", "Finish", "Pause", "BoosterControl"]],
  ["src/screens/round-result-screen.tsx", ["PLAY AGAIN", "Choose Another Mode"]],
  ["src/screens/settings-screen.tsx", ["Sound", "Haptics", "Reduced Motion", "Restore Purchases", "Reset Local Progress"]],
  ["src/screens/cosmetics-screen.tsx", ["Arcade Styles", "Use", "STYLE POINTS"]],
  ["src/screens/shop-screen.tsx", ["Restore Purchases", "Watch for 1 Bonus Life", "IAP_PRODUCTS"]],
  ["src/screens/support-screen.tsx", ["SUPPORT_CATEGORIES", "Submit Support Request", "Email (Optional)"]],
  ["src/screens/account-screen.tsx", ["Sign In", "Sign Out", "Play offline anytime"]],
  ["src/screens/privacy-support-legal-screen.tsx", ["In-App Support", "Email Support", "Privacy Policy"]]
];

const failures = [];

for (const route of requiredRoutes) {
  if (!existsSync(route)) {
    failures.push(`Missing route: ${route}`);
  }
}

for (const [file, snippets] of requiredScreenCopy) {
  if (!existsSync(file)) {
    failures.push(`Missing screen: ${file}`);
    continue;
  }
  const text = readFileSync(file, "utf8");
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      failures.push(`Missing reachable action/copy in ${file}: ${snippet}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Navigation audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Navigation audit passed for all main screens and actions.");
