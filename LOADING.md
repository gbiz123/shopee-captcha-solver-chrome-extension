# Loading and testing this extension

## Build first

`script.js`, `background.js` and `ext_script.js` are **build output**. TypeScript is the
source; editing the `.js` directly means the next build silently discards the change.

```bash
npm install
npm run build
```

The build prints nothing at all when it succeeds. `noEmitOnError` is on, so if it prints
errors then nothing was written and the old `.js` is still in place.

## Load it in Chrome

1. `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. **Load unpacked** → pick this directory
4. Chrome shows a "started debugging this browser" bar while a solve is running. That is
   `chrome.debugger`, and it is expected — it is the only supported way for an extension
   to send input the page treats as trusted. Closing that bar stops the solve.

Chrome does not re-read changed files on its own. After every build, press **reload** on
the extension card.

## Give it an API key

Use the extension's own popup. Doing it any other way races the solver, which starts as
soon as a captcha appears and reads the key immediately.

1. Open any page on the Shopee domain you will be solving on — **not** the captcha page
2. Click the extension icon in the toolbar
3. Paste the key into *Enter API key* and press **Submit**
4. `API key set successfully` confirms it

The key is stored in `localStorage` for that origin, so it survives reloads and new tabs
on the same domain. Repeat once per Shopee domain.

To bake the key into the code instead, so it survives without the popup:

**Windows** — double-click `set-api-key.bat` and paste the key when it asks. Run it again
and type `remove` to take the key back out.

**Anywhere else**, patch the built file after every build:

```py
API_KEY = "YOUR_API_KEY"
with open("script.js", "r", encoding="utf-8") as f:
    script = f.read()
script = script.replace('localStorage.getItem("sadCaptchaKey")', f'"{API_KEY}"')
with open("script.js", "w", encoding="utf-8") as f:
    f.write(script)
```

Either way the key then sits in `script.js` in plain text. Take it out before sharing the
folder — `set-api-key.bat` then `remove`, or `npm run build`; both restore the file
exactly.

## Checking that it works

The extension logs nothing. A solve is silent by design, so judge it by the captcha: it
should complete and the page should move on, without the pointer or the piece being
touched by hand.

A round takes roughly ten seconds — about three seconds tracing the slider, a short
gesture onto the answer, then a pause of two to three seconds before the button is
released. Releasing much sooner than that means something is wrong.

Roughly one round in six is thrown away before the button is even pressed, because
pre-analysis says the puzzle is not worth solving. That costs a page refresh and no API
credit.

## If it does not work

**Nothing happens at all** — the content script did not match the page.
`manifest.json` lists the Shopee domains explicitly; add the one you are on and reload
the extension.

**The captcha is dragged but never accepted** — most often the API key. Set it through
the popup as above, then reload the captcha page. Without a valid key the solve endpoint
rejects every request.

**No "started debugging this browser" bar appears during a solve** — the service worker
did not attach, so events are being sent as ordinary synthetic events, which are
`isTrusted: false` and cannot solve anything. Reload the extension from
`chrome://extensions`, then reload the page.
