import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const WIDTH = 1284;
const HEIGHT = 2778;
const outputDir = join(process.cwd(), "outputs", "app-store", "screenshots");

const colors = {
  background: "#070A12",
  surface: "#0D1322",
  surfaceRaised: "#151D2E",
  textPrimary: "#F8FBFF",
  textSecondary: "#AAB6CE",
  gold: "#F6C65B",
  goldMuted: "#3A2E18",
  cyan: "#43D9FF",
  emerald: "#3EE38C",
  violet: "#9D7CFF",
  ruby: "#FF5F7A",
  border: "#27324A"
};

const font = "Helvetica,Arial,sans-serif";

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function text(x, y, value, options = {}) {
  const {
    color = colors.textPrimary,
    size = 42,
    weight = 400,
    anchor = "start",
    opacity = 1
  } = options;
  return `<text x="${x}" y="${y}" fill="${color}" fill-opacity="${opacity}" font-family="${font}" font-size="${size}" font-weight="${weight}" letter-spacing="0" text-anchor="${anchor}">${escapeXml(
    value
  )}</text>`;
}

function multilineText(x, y, lines, options = {}) {
  const { lineHeight = 56, ...textOptions } = options;
  return lines.map((line, index) => text(x, y + index * lineHeight, line, textOptions)).join("");
}

function panel(x, y, width, height, options = {}) {
  const {
    fill = colors.surfaceRaised,
    stroke = colors.border,
    strokeWidth = 3,
    radius = 24
  } = options;
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

function button(x, y, width, label, detail = "", accent = colors.gold) {
  return [
    panel(x, y, width, detail ? 162 : 126, { stroke: accent }),
    text(x + 44, y + 60, label, { size: 42, weight: 700 }),
    detail
      ? text(x + 44, y + 114, detail, { color: colors.textSecondary, size: 30 })
      : ""
  ].join("");
}

function metric(x, y, width, label, value, accent) {
  return [
    panel(x, y, width, 174),
    text(x + 34, y + 56, label, { color: colors.textSecondary, size: 29 }),
    text(x + 34, y + 128, value, { color: accent, size: 55, weight: 700 })
  ].join("");
}

function meter(x, y, width, percent, opening = false) {
  const barWidth = Math.round((width - 68) * (percent / 100));
  const accent = opening ? colors.gold : colors.cyan;
  return [
    panel(x, y, width, 182, { stroke: opening ? colors.gold : colors.border }),
    text(x + 34, y + 58, "Vault Meter", { size: 37, weight: 700 }),
    text(x + width - 34, y + 58, `${percent}%`, {
      color: colors.textSecondary,
      size: 29,
      anchor: "end"
    }),
    `<rect x="${x + 34}" y="${y + 102}" width="${width - 68}" height="36" rx="18" fill="${colors.surface}"/>`,
    `<rect x="${x + 34}" y="${y + 102}" width="${barWidth}" height="36" rx="18" fill="${accent}"/>`
  ].join("");
}

function coinGlyph(cx, cy, typeIndex, accent, size = 40) {
  const stroke = Math.max(4, Math.round(size * 0.1));
  if (typeIndex === 0) {
    return `<path d="M ${cx} ${cy - size / 2} L ${cx + size / 2} ${cy} L ${cx} ${cy + size / 2} L ${cx - size / 2} ${cy} Z" fill="none" stroke="${accent}" stroke-width="${stroke}" stroke-linejoin="round"/>
      <line x1="${cx - size * 0.28}" y1="${cy}" x2="${cx + size * 0.28}" y2="${cy}" stroke="${accent}" stroke-width="${stroke}" stroke-linecap="round"/>`;
  }
  if (typeIndex === 1) {
    return `<path d="M ${cx + 4} ${cy - size / 2} L ${cx - size * 0.2} ${cy + 2} L ${cx + 4} ${cy + 2} L ${cx - size * 0.18} ${cy + size / 2} L ${cx + size * 0.32} ${cy - 4} L ${cx} ${cy - 4}" fill="none" stroke="${accent}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (typeIndex === 2) {
    return `<polygon points="${cx},${cy - size / 2} ${cx + size * 0.45},${cy - size * 0.15} ${cx + size * 0.35},${cy + size * 0.42} ${cx - size * 0.35},${cy + size * 0.42} ${cx - size * 0.45},${cy - size * 0.15}" fill="none" stroke="${accent}" stroke-width="${stroke}" stroke-linejoin="round"/>
      <line x1="${cx - size * 0.22}" y1="${cy + size * 0.18}" x2="${cx + size * 0.22}" y2="${cy - size * 0.18}" stroke="${accent}" stroke-width="${stroke}" stroke-linecap="round"/>`;
  }
  if (typeIndex === 3) {
    return `<circle cx="${cx}" cy="${cy}" r="${size / 2}" fill="none" stroke="${accent}" stroke-width="${stroke}"/>
      <circle cx="${cx}" cy="${cy}" r="${size * 0.24}" fill="none" stroke="${accent}" stroke-width="${stroke}"/>`;
  }
  return `<line x1="${cx}" y1="${cy - size / 2}" x2="${cx}" y2="${cy + size / 2}" stroke="${accent}" stroke-width="${stroke}" stroke-linecap="round"/>
    <line x1="${cx - size / 2}" y1="${cy}" x2="${cx + size / 2}" y2="${cy}" stroke="${accent}" stroke-width="${stroke}" stroke-linecap="round"/>
    <line x1="${cx - size * 0.35}" y1="${cy - size * 0.35}" x2="${cx + size * 0.35}" y2="${cy + size * 0.35}" stroke="${accent}" stroke-width="${stroke}" stroke-linecap="round"/>
    <line x1="${cx - size * 0.35}" y1="${cy + size * 0.35}" x2="${cx + size * 0.35}" y2="${cy - size * 0.35}" stroke="${accent}" stroke-width="${stroke}" stroke-linecap="round"/>`;
}

function tileGrid(x, y, tileSize = 108, gap = 10, highlight = []) {
  const tileTypes = [
    colors.gold,
    colors.cyan,
    colors.emerald,
    colors.violet,
    colors.ruby
  ];
  const rows = [
    [0, 0, 2, 4, 1, 3, 3, 2],
    [1, 0, 2, 4, 1, 3, 2, 2],
    [1, 1, 4, 4, 0, 0, 3, 2],
    [3, 1, 4, 2, 0, 3, 3, 4],
    [3, 2, 2, 2, 1, 1, 4, 4],
    [0, 0, 3, 1, 1, 4, 2, 4],
    [0, 3, 3, 1, 4, 4, 2, 0],
    [2, 2, 1, 1, 3, 0, 0, 0]
  ];

  return rows
    .flatMap((row, rowIndex) =>
      row.map((typeIndex, columnIndex) => {
        const tileX = x + columnIndex * (tileSize + gap);
        const tileY = y + rowIndex * (tileSize + gap);
        const accent = tileTypes[typeIndex];
        const isHighlighted = highlight.some(
          ([highlightRow, highlightColumn]) =>
            highlightRow === rowIndex && highlightColumn === columnIndex
        );
        const cx = tileX + tileSize / 2;
        const cy = tileY + tileSize / 2;
        return [
          `<circle cx="${cx + 6}" cy="${cy + 10}" r="${tileSize / 2}" fill="#000000" opacity="0.35"/>`,
          `<circle cx="${cx}" cy="${cy}" r="${tileSize / 2}" fill="${accent}${isHighlighted ? "55" : "24"}" stroke="${accent}" stroke-width="${isHighlighted ? 7 : 3}"/>`,
          `<circle cx="${cx}" cy="${cy}" r="${tileSize * 0.36}" fill="${accent}18" stroke="${accent}88" stroke-width="3"/>`,
          `<ellipse cx="${tileX + tileSize * 0.34}" cy="${tileY + tileSize * 0.27}" rx="${tileSize * 0.11}" ry="${tileSize * 0.07}" fill="#FFFFFF" opacity="0.72"/>`,
          coinGlyph(cx, cy, typeIndex, accent, tileSize * 0.35)
        ].join("");
      })
    )
    .join("");
}

function shell(headline, subhead, content, accent = colors.cyan) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${colors.background}"/>
  <rect width="${WIDTH}" height="18" fill="${colors.gold}"/>
  <rect x="321" width="321" height="18" fill="${colors.cyan}"/>
  <rect x="642" width="321" height="18" fill="${colors.emerald}"/>
  <rect x="963" width="321" height="18" fill="${colors.violet}"/>
  ${text(84, 122, "VAULTPOP  •  ARCADE PUZZLE", {
    color: accent,
    size: 31,
    weight: 800
  })}
  ${text(84, 250, headline, { size: 78, weight: 800 })}
  ${multilineText(84, 340, subhead, {
    color: colors.textSecondary,
    size: 38,
    lineHeight: 52
  })}
  <rect x="60" y="520" width="1164" height="2168" rx="34" fill="${colors.surface}" stroke="${colors.border}" stroke-width="4"/>
  ${content}
  </svg>`;
}

function appHeader(title, lead, eyebrow = "") {
  return [
    eyebrow
      ? text(120, 668, eyebrow.toUpperCase(), {
          color: colors.cyan,
          size: 28,
          weight: 800
        })
      : "",
    text(120, eyebrow ? 770 : 700, title, { size: 74, weight: 800 }),
    text(120, eyebrow ? 836 : 770, lead, { color: colors.textSecondary, size: 34 })
  ].join("");
}

function homeScene() {
  const content = [
    appHeader("VaultPop", "Pop Coins. Complete the Chain.", "Premium Neon Arcade"),
    `<rect x="120" y="890" width="282" height="62" rx="31" fill="${colors.cyan}22" stroke="${colors.cyan}" stroke-width="3"/>`,
    text(261, 932, "PLAYS OFFLINE", {
      color: colors.cyan,
      size: 27,
      weight: 800,
      anchor: "middle"
    }),
    multilineText(
      120,
      1030,
      ["Tap connected groups, build combos, fill the vault meter,", "and chase local high scores."],
      { color: colors.textSecondary, size: 31, lineHeight: 46 }
    ),
    metric(120, 1160, 500, "Best Score", "3,840", colors.gold),
    metric(664, 1160, 440, "Vault Coins", "42", colors.emerald),
    button(120, 1390, 984, "Start", "Choose Classic, Daily Vault, or Streak."),
    button(120, 1580, 984, "Settings"),
    button(120, 1736, 984, "Shop", "Optional purchases and booster counter."),
    button(120, 1926, 984, "Cosmetics"),
    button(120, 2082, 984, "Support", "Private in-app help request.")
  ].join("");
  return shell(
    "FAST PUZZLE. PURE COMBOS.",
    ["Clear connected groups and chase", "your next best score."],
    content
  );
}

function gameplayScene() {
  const content = [
    appHeader("Classic Mode", "Tap 2 or more connected matching coin tiles."),
    metric(120, 840, 310, "Score", "1,240", colors.gold),
    metric(457, 840, 310, "Time", "42s", colors.cyan),
    metric(794, 840, 310, "Combo", "4x", colors.emerald),
    meter(120, 1055, 984, 72),
    panel(120, 1280, 984, 984, { fill: "#2B2148", stroke: colors.gold }),
    tileGrid(154, 1314),
    panel(120, 2310, 984, 220),
    text(158, 2380, "Combo 4x", { size: 39, weight: 700 }),
    text(158, 2440, "8 x 8 board  •  Best group: 12  •  Streak: 8", {
      color: colors.textSecondary,
      size: 29
    })
  ].join("");
  return shell(
    "TAP. CLEAR. COMBO.",
    ["Every connected group can push", "your score higher."],
    content,
    colors.gold
  );
}

function vaultScene() {
  const highlights = [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 0],
    [2, 1]
  ];
  const content = [
    appHeader("Classic Mode", "The vault is ready to open."),
    metric(120, 840, 310, "Score", "2,760", colors.gold),
    metric(457, 840, 310, "Time", "24s", colors.cyan),
    metric(794, 840, 310, "Combo", "6x", colors.emerald),
    meter(120, 1055, 984, 100, true),
    panel(120, 1280, 984, 984, { fill: colors.goldMuted, stroke: colors.gold }),
    tileGrid(154, 1314, 108, 10, highlights),
    panel(120, 2310, 984, 220, { stroke: colors.gold }),
    text(158, 2380, "Vault opened", { color: colors.gold, size: 39, weight: 700 }),
    text(158, 2440, "Bonus clear activated. Keep the combo moving.", {
      color: colors.textSecondary,
      size: 29
    })
  ].join("");
  return shell(
    "CHARGE THE VAULT.",
    ["Fill the meter and trigger a", "satisfying bonus clear."],
    content,
    colors.emerald
  );
}

function modeCard(y, titleValue, detail, footer, accent) {
  return [
    panel(120, y, 984, 300, { stroke: accent }),
    text(164, y + 82, titleValue, { size: 48, weight: 700 }),
    text(164, y + 142, detail, { color: colors.textSecondary, size: 31 }),
    `<rect x="164" y="${y + 194}" width="896" height="3" fill="${colors.border}"/>`,
    text(164, y + 252, footer, { color: accent, size: 29, weight: 700 })
  ].join("");
}

function modesScene() {
  const content = [
    appHeader("Choose Mode", "Pick a run and start popping."),
    modeCard(
      870,
      "Classic Mode",
      "Fast, focused score attack.",
      "60 SECONDS",
      colors.gold
    ),
    modeCard(
      1210,
      "Daily Vault",
      "A fresh deterministic board each day.",
      "DAILY CHALLENGE",
      colors.cyan
    ),
    modeCard(
      1550,
      "Streak Mode",
      "Keep successful clears going.",
      "THREE MISSES END THE RUN",
      colors.emerald
    ),
    panel(120, 1930, 984, 360),
    text(164, 2010, "Your progress stays local", { size: 42, weight: 700 }),
    multilineText(
      164,
      2080,
      ["Best scores, daily results, settings, and", "cosmetic unlocks are stored on your device."],
      { color: colors.textSecondary, size: 31, lineHeight: 48 }
    )
  ].join("");
  return shell(
    "THREE WAYS TO PLAY.",
    ["Race the clock, solve today’s board,", "or protect your streak."],
    content,
    colors.violet
  );
}

function resultsScene() {
  const content = [
    appHeader("Round Result", "Classic Mode complete."),
    panel(120, 860, 984, 360, { stroke: colors.gold }),
    text(612, 965, "SCORE", {
      color: colors.textSecondary,
      size: 30,
      weight: 700,
      anchor: "middle"
    }),
    text(612, 1110, "3,840", {
      color: colors.gold,
      size: 118,
      weight: 800,
      anchor: "middle"
    }),
    metric(120, 1280, 310, "Best Score", "3,840", colors.gold),
    metric(457, 1280, 310, "Combo", "6x", colors.emerald),
    metric(794, 1280, 310, "Best Group", "12", colors.cyan),
    panel(120, 1510, 984, 360),
    text(164, 1595, "Combo Summary", { size: 43, weight: 700 }),
    text(164, 1678, "Longest streak", { color: colors.textSecondary, size: 31 }),
    text(1060, 1678, "18", { color: colors.emerald, size: 38, weight: 700, anchor: "end" }),
    text(164, 1760, "Vault bonuses", { color: colors.textSecondary, size: 31 }),
    text(1060, 1760, "2", { color: colors.gold, size: 38, weight: 700, anchor: "end" }),
    button(120, 1940, 984, "Replay", "Start another Classic Mode round."),
    button(120, 2130, 984, "Mode Select")
  ].join("");
  return shell(
    "BEAT YOUR BEST.",
    ["Review every combo, vault bonus,", "and record-setting run."],
    content,
    colors.gold
  );
}

function themeCard(y, titleValue, detail, accent, active = false) {
  return [
    panel(120, y, 984, 220, { stroke: active ? accent : colors.border }),
    `<rect x="160" y="${y + 50}" width="120" height="120" rx="24" fill="${accent}22" stroke="${accent}" stroke-width="4"/>`,
    `<circle cx="220" cy="${y + 110}" r="30" fill="${accent}"/>`,
    text(320, y + 88, titleValue, { size: 42, weight: 700 }),
    text(320, y + 142, detail, { color: colors.textSecondary, size: 29 }),
    active
      ? text(1055, y + 122, "ACTIVE", {
          color: accent,
          size: 27,
          weight: 800,
          anchor: "end"
        })
      : ""
  ].join("");
}

function cosmeticsScene() {
  const content = [
    appHeader("Cosmetics", "Unlock local-only visual themes and effects."),
    panel(120, 850, 984, 150),
    text(164, 910, "Vault Coins", { color: colors.textSecondary, size: 29 }),
    text(1060, 932, "42", { color: colors.emerald, size: 58, weight: 700, anchor: "end" }),
    themeCard(1060, "Midnight Vault", "Deep navy glow with gold tiles.", colors.gold, true),
    themeCard(1310, "Cyan Circuit", "Electric highlights for fast runs.", colors.cyan),
    themeCard(1560, "Emerald Pulse", "Green trails for clean chains.", colors.emerald),
    themeCard(1810, "Violet Neon", "Soft violet late-round highlights.", colors.violet),
    panel(120, 2090, 984, 250),
    multilineText(
      164,
      2170,
      ["Visual unlocks stay on this device.", "No account is required."],
      { color: colors.textSecondary, size: 32, lineHeight: 52 }
    )
  ].join("");
  return shell(
    "MAKE THE BOARD YOURS.",
    ["Unlock colorful themes and choose", "the look for your next run."],
    content,
    colors.cyan
  );
}

const scenes = [
  ["01-home.png", homeScene()],
  ["02-gameplay.png", gameplayScene()],
  ["03-vault-bonus.png", vaultScene()],
  ["04-modes.png", modesScene()],
  ["05-results.png", resultsScene()],
  ["06-cosmetics.png", cosmeticsScene()]
];

mkdirSync(outputDir, { recursive: true });

for (const [fileName, svg] of scenes) {
  writeFileSync(join(outputDir, fileName.replace(/\.png$/, ".svg")), svg);
  await sharp(Buffer.from(svg))
    .flatten({ background: colors.background })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(join(outputDir, fileName));
}

console.log(`Generated ${scenes.length} App Store screenshots at ${WIDTH} x ${HEIGHT}.`);
