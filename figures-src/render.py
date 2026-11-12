"""Render each HTML figure in this folder to a PNG at 2x. Usage: python3 render.py [name ...]"""
import sys, pathlib
from playwright.sync_api import sync_playwright

here = pathlib.Path(__file__).parent
out = here / 'png'
out.mkdir(exist_ok=True)
names = sys.argv[1:] or sorted(p.stem for p in here.glob('*.html'))

with sync_playwright() as p:
    browser = p.chromium.launch()
    for name in names:
        page = browser.new_page(viewport={'width': 2000, 'height': 1200}, device_scale_factor=2)
        page.goto((here / f'{name}.html').as_uri())
        page.wait_for_timeout(250)
        el = page.locator('.fig').first
        box = el.bounding_box()
        el.screenshot(path=str(out / f'{name}.png'))
        # overflow check: any text element wider than its box
        clipped = page.evaluate("""() => [...document.querySelectorAll('.fig *')]
            .filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible')
            .map(e => e.className + ':' + e.textContent.slice(0, 40))""")
        print(f"{name}: {int(box['width'])}x{int(box['height'])} css px", ('CLIPPED ' + str(clipped)) if clipped else '')
        page.close()
    browser.close()
