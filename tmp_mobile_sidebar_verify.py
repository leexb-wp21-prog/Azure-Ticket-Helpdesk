from playwright.sync_api import sync_playwright
import json


def main():
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 390, "height": 844})
        context.add_init_script(
            """
            window.localStorage.setItem(
              "quickaid-session-v1",
              JSON.stringify({ email: "admin@campus.edu", role: "admin" })
            );
            """
        )
        page = context.new_page()
        page.goto("http://127.0.0.1:5500/admin.html", wait_until="networkidle")
        page.wait_for_timeout(300)

        sidebar = page.locator(".admin-sidebar")
        mobile_toggle = page.locator("#mobileSidebarToggleBtn")
        overlay = page.locator("#sidebarOverlay")

        results["initial"] = {
            "collapsed": sidebar.evaluate("el => el.classList.contains('collapsed')"),
            "overlay_hidden": overlay.evaluate("el => el.hidden"),
        }

        mobile_toggle.click()
        page.wait_for_timeout(320)
        results["after_open"] = {
            "collapsed": sidebar.evaluate("el => el.classList.contains('collapsed')"),
            "overlay_hidden": overlay.evaluate("el => el.hidden"),
        }

        overlay.click()
        page.wait_for_timeout(320)
        results["after_overlay_close"] = {
            "collapsed": sidebar.evaluate("el => el.classList.contains('collapsed')"),
            "overlay_hidden": overlay.evaluate("el => el.hidden"),
        }

        browser.close()

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
