"""VaultPop Build 8 readiness proof capture: screenshots + contact sheet + zip."""
import os
import time
import zipfile

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

BASE = "https://vaultpop-premium.preview.emergentagent.com"
LOCAL = "http://127.0.0.1:8787"
OUT = "/app/vaultpop/outputs/build8-proof"
ZIP = "/app/vaultpop-build8-readiness-proof.zip"
EXEC = "/pw-browsers/chromium_headless_shell-1208/chrome-linux/headless_shell"
os.makedirs(OUT, exist_ok=True)

def shoot(page, name):
    time.sleep(1.4)
    page.screenshot(path=f"{OUT}/{name}.png")
    print("captured", name)

def set_profile(page, mutate_js):
    """Mutate the persisted save profile in localStorage."""
    page.evaluate(
        """(fn) => {
            const key = "vaultpop.saveProfile.v1";
            const raw = window.localStorage.getItem(key);
            if (!raw) return "no-profile";
            const profile = JSON.parse(raw);
            (new Function("profile", fn))(profile);
            window.localStorage.setItem(key, JSON.stringify(profile));
            return "ok";
        }""",
        mutate_js,
    )

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EXEC, args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    page = ctx.new_page()

    # 01 home (creates default profile)
    page.goto(BASE + "/", wait_until="networkidle", timeout=60000)
    page.wait_for_selector("text=PLAY", timeout=30000)
    time.sleep(2)
    shoot(page, "01-home")

    # grant coins for forge demo
    set_profile(page, "profile.economy.vaultCoins = 680;")

    # 02 shop top: VaultPass hero + rewarded CTAs
    page.goto(BASE + "/shop", wait_until="networkidle", timeout=60000)
    page.wait_for_selector('[data-testid="shop-rewarded-coins-button"]', timeout=30000)
    shoot(page, "02-shop-top-vaultpass-rewarded")

    # 03 booster forge confirmation
    forge = page.locator('[data-testid="shop-forge-bonusLives"]')
    forge.scroll_into_view_if_needed()
    time.sleep(0.6)
    forge.click(force=True)
    page.wait_for_selector('[data-testid="shop-forge-result-bonusLives"]', timeout=10000)
    shoot(page, "03-shop-booster-forge-confirmation")

    # 04 styles & customization section
    page.locator('[data-testid="cosmetic-theme-vaultpass-prism"]').scroll_into_view_if_needed()
    shoot(page, "04-shop-styles-customization")

    # 05 leaderboard (real submitted scores)
    page.goto(BASE + "/leaderboard", wait_until="networkidle", timeout=60000)
    shoot(page, "05-leaderboard-updated")

    # 06 settings hub
    page.goto(BASE + "/settings", wait_until="networkidle", timeout=60000)
    page.wait_for_selector('[data-testid="settings-gameplay-link"]', timeout=30000)
    shoot(page, "06-settings-hub")

    # 07 gameplay settings
    page.goto(BASE + "/gameplay-settings", wait_until="networkidle", timeout=60000)
    page.wait_for_selector('[data-testid="settings-sound-switch"]', timeout=30000)
    shoot(page, "07-gameplay-settings")

    # 08 faq with one item open
    page.goto(BASE + "/faq", wait_until="networkidle", timeout=60000)
    page.wait_for_selector('[data-testid="faq-item-gameplay-basics"]', timeout=30000)
    page.locator('[data-testid="faq-item-gameplay-basics"]').click(force=True)
    shoot(page, "08-faq")

    # 09 support assistant with suggestions
    page.goto(BASE + "/assistant", wait_until="networkidle", timeout=60000)
    box = page.locator('[data-testid="assistant-search-input"]')
    box.wait_for(timeout=30000)
    box.fill("cancel subscription")
    time.sleep(1)
    shoot(page, "09-support-assistant")

    # 10 in-app support form
    page.goto(BASE + "/support", wait_until="networkidle", timeout=60000)
    shoot(page, "10-support-form-inapp")

    # 11 results
    page.goto(
        BASE + "/results?mode=classic&score=2430&combo=6&group=9&streak=4&vaults=2",
        wait_until="networkidle",
        timeout=60000,
    )
    page.wait_for_selector('[data-testid="result-home"]', timeout=30000)
    shoot(page, "11-results")

    # 14 gameplay standard motion with an active combo
    page.goto(BASE + "/gameplay?mode=classic", wait_until="networkidle", timeout=60000)
    page.wait_for_selector('[data-testid="hud-score"]', timeout=30000)
    time.sleep(2)
    for attempt in range(40):
        x = 40 + (attempt * 37) % 310
        y = 300 + (attempt * 53) % 260
        page.mouse.click(x, y)
        time.sleep(0.4)
        txt = page.locator('[data-testid="hud-score"]').inner_text()
        digits = "".join(ch for ch in txt.split("\n")[0] if ch.isdigit())
        if digits and int(digits) >= 120:
            break
    shoot(page, "14-gameplay-standard-motion")

    # 15 gameplay reduced motion
    page.goto(BASE + "/", wait_until="networkidle", timeout=60000)
    page.wait_for_selector("text=PLAY", timeout=30000)
    set_profile(page, "profile.settings.reducedMotion = true;")
    page.goto(BASE + "/gameplay?mode=classic", wait_until="networkidle", timeout=60000)
    page.wait_for_selector('[data-testid="hud-score"]', timeout=30000)
    time.sleep(2)
    for attempt in range(20):
        x = 50 + (attempt * 41) % 300
        y = 310 + (attempt * 59) % 250
        page.mouse.click(x, y)
        time.sleep(0.35)
        txt = page.locator('[data-testid="hud-score"]').inner_text()
        digits = "".join(ch for ch in txt.split("\n")[0] if ch.isdigit())
        if digits and int(digits) > 0:
            break
    shoot(page, "15-gameplay-reduced-motion")

    # 12/13 public support page (patched TS backend running locally)
    page.goto(LOCAL + "/support", wait_until="networkidle", timeout=30000)
    shoot(page, "12-public-support-mobile")
    desktop = browser.new_page(viewport={"width": 1280, "height": 900})
    desktop.goto(LOCAL + "/support", wait_until="networkidle", timeout=30000)
    time.sleep(1)
    desktop.screenshot(path=f"{OUT}/13-public-support-desktop.png")
    print("captured 13-public-support-desktop")
    browser.close()

# contact sheet
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
print("zip written:", ZIP)
