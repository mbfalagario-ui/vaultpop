"""Capture VaultPop Iteration 4 visual proof screenshots + contact sheet + zip."""
import os
import time
import zipfile

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

BASE = "https://vaultpop-premium.preview.emergentagent.com"
OUT = "/app/vaultpop/outputs/iteration4-proof"
ZIP = "/app/vaultpop-iteration4-polish-proof.zip"
os.makedirs(OUT, exist_ok=True)

SIMPLE_SCREENS = [
    ("01-home", "/", "text=PLAY"),
    ("02-mode-select", "/modes", '[data-testid="modes-home"]'),
    ("03-gameplay-classic", "/gameplay?mode=classic", '[data-testid="hud-score"]'),
    ("04-gameplay-daily", "/gameplay?mode=dailyVault", '[data-testid="hud-score"]'),
    ("05-gameplay-streak", "/gameplay?mode=streak", '[data-testid="hud-score"]'),
    ("06-gameplay-blitz", "/gameplay?mode=blitz", '[data-testid="hud-score"]'),
    ("08-results", "/results?mode=classic&score=2430&combo=6&group=9&streak=4&vaults=2", '[data-testid="result-home"]'),
    ("09-leaderboard", "/leaderboard", None),
    ("10-shop", "/shop", None),
    ("11-account", "/account", None),
    ("12-settings", "/settings", None),
]

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)

    for name, path, wait_sel in SIMPLE_SCREENS:
        page.goto(BASE + path, wait_until="networkidle", timeout=45000)
        if wait_sel:
            try:
                page.wait_for_selector(wait_sel, timeout=20000)
            except Exception as e:
                print(f"WARN {name}: wait failed {e}")
        time.sleep(2.2)
        page.screenshot(path=f"{OUT}/{name}.png")
        print(f"captured {name}")

    # 07: active combo mid-round — tap groups until the score moves.
    page.goto(BASE + "/gameplay?mode=classic", wait_until="networkidle", timeout=45000)
    page.wait_for_selector('[data-testid="hud-score"]', timeout=20000)
    time.sleep(2.5)
    board = page.locator('[data-testid="hud-score"]')  # anchor exists; board fills center
    score = 0
    for attempt in range(40):
        # tap random-ish grid positions across the 8x8 board area
        x = 40 + (attempt * 37) % 310
        y = 300 + (attempt * 53) % 260
        page.mouse.click(x, y)
        time.sleep(0.45)
        txt = page.locator('[data-testid="hud-score"]').inner_text()
        digits = "".join(ch for ch in txt.split("\n")[0] if ch.isdigit())
        score = int(digits) if digits else 0
        if score >= 120:
            break
    time.sleep(0.4)
    page.screenshot(path=f"{OUT}/07-active-combo-vault.png")
    print(f"captured 07-active-combo-vault (score={score})")
    browser.close()

# Contact sheet: 4 cols x 3 rows.
names = sorted(f for f in os.listdir(OUT) if f.endswith(".png") and f != "contact-sheet.png")
thumb_w = 390
imgs = []
for n in names:
    im = Image.open(f"{OUT}/{n}")
    ratio = thumb_w / im.width
    imgs.append((n, im.resize((thumb_w, int(im.height * ratio)))))
cols, pad, label_h = 4, 24, 40
rows = (len(imgs) + cols - 1) // cols
cell_h = max(im.height for _, im in imgs) + label_h
sheet = Image.new("RGB", (cols * (thumb_w + pad) + pad, rows * (cell_h + pad) + pad), "#0B0820")
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
except Exception:
    font = ImageFont.load_default()
for i, (n, im) in enumerate(imgs):
    cx = pad + (i % cols) * (thumb_w + pad)
    cy = pad + (i // cols) * (cell_h + pad)
    sheet.paste(im, (cx, cy))
    draw.text((cx, cy + im.height + 8), n.replace(".png", ""), fill="#FFC93E", font=font)
sheet.save(f"{OUT}/contact-sheet.png")
print("contact sheet done")

with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
    for n in sorted(os.listdir(OUT)):
        if n.endswith(".png"):
            zf.write(f"{OUT}/{n}", n)
print(f"zip written: {ZIP}")
