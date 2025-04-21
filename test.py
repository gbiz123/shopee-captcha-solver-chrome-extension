from playwright.sync_api import sync_playwright, Playwright
from playwright_stealth import stealth_sync, StealthConfig

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
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled"
        ],
        proxy=proxy
    )

    config = StealthConfig(navigator_languages=False, navigator_vendor=False, navigator_user_agent=False)
    page = context.new_page()
    page.goto("https://www.sadcaptcha.com")
    stealth_sync(page, config)

    input("trigger the captcha")

    # Test the background page as you would any other page.
    context.close()


with sync_playwright() as playwright:
    run(playwright)
