from playwright.sync_api import sync_playwright, Playwright

path_to_extension = "./"
user_data_dir = "/tmp/test-user-data-dir"


def run(playwright: Playwright):
    context = playwright.chromium.launch_persistent_context(
        user_data_dir,
        headless=False,
        args=[
            f"--disable-extensions-except={path_to_extension}",
            f"--load-extension={path_to_extension}",
        ],
    )

    input("trigger the captcha")

    # Test the background page as you would any other page.
    context.close()


with sync_playwright() as playwright:
    run(playwright)
