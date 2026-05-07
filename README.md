# SadCaptcha Chrome Extension
This is it, yall. If you are working in Python I highly recommend just using the [Python client](https://github.com/gbiz123/shopee-captcha-solver)

## How to use it
You can use this extension by loading it as an "unpacked" extension in Google Chrome.
You can also programmatically load it into your browser automation framework of choice.

## How to patch the code with your API key
A common use case is the need to make the API key persistent across sessions.
The "script.js" file contains the code that processes your API key. 
You can patch it programmatically by cloning this repo running this script against the script.js file:

```py
API_KEY = "YOUR_API_KEY"

# Run this in the cloned repo directory

with open("script.js", "r", encoding="utf-8") as f:
    script = f.read()

script = script.replace('localStorage.getItem("sadCaptchaKey")', f"\"{API_KEY}\";")

with open("script.js", "w", encoding="utf-8") as f:
    f.write(script)
    
print("patched chrome extension with your key")

```
