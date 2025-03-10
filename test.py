from playwright.sync_api import sync_playwright, Playwright
from playwright_stealth import stealth_sync

path_to_extension = "./"
user_data_dir = "/tmp/test-user-data-dir"

proxy = {"server": "45.67.2.115:5689"}

def run(playwright: Playwright):
    context = playwright.chromium.launch_persistent_context(
        user_data_dir,
        headless=False,
        args=[
            f"--disable-extensions-except={path_to_extension}",
            f"--load-extension={path_to_extension}",
        ],
        proxy=proxy
    )

    page = context.new_page()
    page.goto("https://www.sadcaptcha.com")

    input("trigger the captcha")

    # Test the background page as you would any other page.
    context.close()


with sync_playwright() as playwright:
    run(playwright)
