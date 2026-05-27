# /// script
# requires-python = ">=3.10"
# dependencies = ["playwright"]
# ///

"""Скриншоты для презентации GigaSamobranka MVP."""

import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get("SMOKE_BASE", "https://gs-mvp-six.vercel.app")
OUT = Path(__file__).parent.parent / "docs" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

def capture(page, name, path, full_page=False):
    page.screenshot(path=str(path), full_page=full_page)
    print(f"Saved {path}")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # 1. Главная
        page.goto(f"{BASE}/")
        page.wait_for_load_state("networkidle")
        capture(page, "01_home", OUT / "01_home.png")

        # 2. Создаём демо-набор и скриншотим страницу набора
        resp = page.goto(f"{BASE}/api/demo?id=winter-vocab")
        page.wait_for_url(lambda url: "/sets/" in url)
        page.wait_for_load_state("networkidle")
        set_url = page.url
        capture(page, "02_set", OUT / "02_set.png")

        # 3. Библиотека
        page.goto(f"{BASE}/library")
        page.wait_for_load_state("networkidle")
        capture(page, "03_library", OUT / "03_library.png")

        # 4. Печать
        set_id = set_url.split("/sets/")[-1]
        page.goto(f"{BASE}/print/{set_id}")
        page.wait_for_load_state("networkidle")
        capture(page, "04_print", OUT / "04_print.png")

        # 5. Настройки
        page.goto(f"{BASE}/settings")
        page.wait_for_load_state("networkidle")
        capture(page, "05_settings", OUT / "05_settings.png")

        browser.close()
    print("Done")

if __name__ == "__main__":
    main()
