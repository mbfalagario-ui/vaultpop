from playwright.sync_api import sync_playwright

OUT = "/app/vaultpop/outputs/build8-proof"
import os
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    mobile.goto("http://127.0.0.1:8787/support", wait_until="networkidle")
    mobile.screenshot(path=f"{OUT}/12-public-support-mobile.png", full_page=True)
    desktop = browser.new_page(viewport={"width": 1280, "height": 900})
    desktop.goto("http://127.0.0.1:8787/support", wait_until="networkidle")
    desktop.screenshot(path=f"{OUT}/13-public-support-desktop.png")
    browser.close()
print("support page screenshots captured")
