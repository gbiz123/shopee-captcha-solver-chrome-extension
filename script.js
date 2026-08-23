"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(function () {
    // Avoid multiple instances running: 
    if (window.hasRun === true)
        return true;
    window.hasRun = true;
    const CONTAINER = document.documentElement || document.body;
    // Api key is passed from extension via message
    chrome.runtime.onMessage.addListener(function (request, _, sendResponse) {
        if (request.apiKey !== null) {
            console.log("Api key: " + request.apiKey);
            localStorage.setItem("sadCaptchaKey", request.apiKey);
            sendResponse({ message: "API key set.", success: 1 });
        }
        else {
            sendResponse({ message: "API key cannot be empty.", success: 0 });
        }
    });
    function getApiKey() {
        let apiKey = true;
        if (apiKey) {
            return "9ffdd94840dc3f32f811b6eddd11cd69";
        }
        else {
            throw new Error("could not get sadCaptchaKey from localStorage");
        }
    }
    let creditsUrl = "https://www.sadcaptcha.com/api/v1/license/credits?licenseKey=";
    let imageCrawlUrl = "https://www.sadcaptcha.com/api/v1/shopee-image-crawl?licenseKey=";
    let imageCrawlPreAnalyzeUrl = "https://www.sadcaptcha.com/api/v1/shopee-image-crawl-pre-analyze?licenseKey=";
    let puzzleUrl = "https://www.sadcaptcha.com/api/v1/puzzle?licenseKey=";
    let imageDragUrl = "https://www.sadcaptcha.com/api/v1/shopee-image-drag?licenseKey=";
    const API_HEADERS = new Headers({ "Content-Type": "application/json" });
    const IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR = "#NEW_CAPTCHA canvas[draggable=false], aside canvas[draggable=false], div:not(#puzzleContainer) > img";
    const IMAGE_CRAWL_PIECE_IMAGE_SELECTOR = "#NEW_CAPTCHA canvas[draggable=true], aside canvas[draggable=true], #puzzleContainer > #puzzleImgComponent";
    const IMAGE_CRAWL_BUTTON_SELECTOR = "div:has(> svg + svg)";
    const IMAGE_CRAWL_RESET_BUTTON = "#NEW_CAPTCHA svg[viewBox='0 0 16 16'], aside svg[viewBox='0 0 16 16']";
    const IMAGE_CRAWL_UNIQUE_IDENTIFIERS = [IMAGE_CRAWL_PIECE_IMAGE_SELECTOR];
    const PUZZLE_BUTTON_SELECTOR = "aside[aria-modal=true] div[style=\"width: 40px; height: 40px; transform: translateX(0px);\"]";
    const PUZZLE_PUZZLE_IMAGE_SELECTOR = "aside[aria-modal=true] div[aria-hidden=true] > div > div > img[draggable=false]";
    const PUZZLE_PIECE_IMAGE_SELECTOR = "aside[aria-modal=true] div[aria-hidden=true] > div > div > img[draggable=true]";
    const PUZZLE_UNIQUE_IDENTIFIERS = [PUZZLE_PIECE_IMAGE_SELECTOR];
    const IMAGE_DRAG_VERIFY_BUTTON_SELECTOR = ".rb6XLo, #NEW_CAPTCHA button:not(:has(*)), aside button:not(:has(*)) ";
    const IMAGE_DRAG_PUZZLE_IMAGE_SELECTOR = "#NEW_CAPTCHA canvas, aside canvas";
    const IMAGE_DRAG_PIECE_IMAGE_SELECTOR = "#NEW_CAPTCHA img, aside img";
    const IMAGE_DRAG_UNIQUE_IDENTIFIERS = [IMAGE_DRAG_PUZZLE_IMAGE_SELECTOR, IMAGE_DRAG_VERIFY_BUTTON_SELECTOR];
    const CAPTCHA_PRESENCE_INDICATORS = [
        "aside[aria-modal=true] div[style=\"width: 40px; height: 40px; transform: translateX(0px);\"]",
        "#NEW_CAPTCHA",
        "#captchaMask",
        IMAGE_CRAWL_PIECE_IMAGE_SELECTOR,
        IMAGE_DRAG_PUZZLE_IMAGE_SELECTOR,
        IMAGE_CRAWL_RESET_BUTTON
    ];
    let CaptchaType;
    (function (CaptchaType) {
        CaptchaType[CaptchaType["PUZZLE"] = 0] = "PUZZLE";
        CaptchaType[CaptchaType["IMAGE_CRAWL"] = 1] = "IMAGE_CRAWL";
        CaptchaType[CaptchaType["SEMANTIC_SHAPES"] = 2] = "SEMANTIC_SHAPES";
        CaptchaType[CaptchaType["IMAGE_DRAG"] = 3] = "IMAGE_DRAG";
    })(CaptchaType || (CaptchaType = {}));
    function findFirstElementToAppear(selectors) {
        return new Promise(resolve => {
            const observer = new MutationObserver(mutations => {
                for (const mutation of mutations) {
                    if (mutation.addedNodes === null)
                        continue;
                    let addedNode = [];
                    mutation.addedNodes.forEach(node => addedNode.push(node));
                    for (const node of addedNode)
                        for (const selector of selectors) {
                            try {
                                if (node instanceof HTMLIFrameElement) {
                                    let iframe = node;
                                    setTimeout(() => {
                                        if (iframe.contentWindow) {
                                            let iframeElement = iframe.contentWindow.document.body.querySelector(selector);
                                            if (iframeElement) {
                                                console.debug(`element matched ${selector} in iframe`);
                                                observer.disconnect();
                                                console.dir(iframeElement);
                                                return resolve(iframeElement);
                                            }
                                        }
                                        else {
                                            console.log(`no iframe with selector ${selector}, contentWindow was null`);
                                        }
                                    }, 3000);
                                }
                                if (node instanceof Element) {
                                    let element = node;
                                    if (element.querySelector(selector)) {
                                        console.debug(`element matched ${selector}`);
                                        observer.disconnect();
                                        console.dir(element);
                                        return resolve(element);
                                    }
                                }
                            }
                            catch (err) {
                                console.log(`error occurred when finding element with css selector ${selector}, error was: ` + err);
                                console.log("trying again");
                            }
                        }
                }
            });
            observer.observe(CONTAINER, {
                childList: true,
                subtree: true
            });
        });
    }
    function waitForElement(selector, iframeSelector) {
        for (let i = 0; i < 5; i++) {
            try {
                return new Promise(resolve => {
                    let targetDocument;
                    if (iframeSelector !== undefined) {
                        let iframe = document.querySelector(iframeSelector);
                        targetDocument = iframe.contentWindow.document;
                    }
                    else {
                        targetDocument = window.document;
                    }
                    if (targetDocument.querySelector(selector)) {
                        console.log("Selector found: " + selector);
                        return resolve(targetDocument.querySelector(selector));
                    }
                    else {
                        const observer = new MutationObserver(_ => {
                            if (targetDocument.querySelector(selector)) {
                                observer.disconnect();
                                console.log("Selector found by mutation observer: " + selector);
                                return resolve(targetDocument.querySelector(selector));
                            }
                        });
                        observer.observe(CONTAINER, {
                            childList: true,
                            subtree: true
                        });
                    }
                });
            }
            catch (err) {
                console.log(`error occurred when finding element with css selector ${selector}, error was: ` + err);
                console.log("trying again");
            }
        }
        throw new Error(`Could not get element ${selector} after 5 tries`);
    }
    function creditsApiCall() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("making api call");
            let resp = yield fetch(creditsUrl + getApiKey(), {
                method: "GET",
                headers: API_HEADERS,
            });
            let credits = (yield resp.json()).credits;
            console.log("api credits = " + credits);
            return credits;
        });
    }
    function apiCall(url, body) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("making api call");
            let resp = yield fetch(url + getApiKey(), {
                method: "POST",
                headers: API_HEADERS,
                body: JSON.stringify(body)
            });
            console.log("got api response:");
            console.log(resp);
            return resp;
        });
    }
    function imageCrawlPreAnalyzeApiCall(requestBody) {
        return __awaiter(this, void 0, void 0, function* () {
            let resp = yield apiCall(imageCrawlPreAnalyzeUrl, requestBody);
            let result = yield resp.json();
            console.log("image crawl pre-analyze result: ");
            console.log(result);
            return result;
        });
    }
    function imageCrawlApiCall(requestBody) {
        return __awaiter(this, void 0, void 0, function* () {
            let resp = yield apiCall(imageCrawlUrl, requestBody);
            let pixelsFromSliderOrigin = (yield resp.json()).pixelsFromSliderOrigin;
            console.log("pixels from slider origin = " + pixelsFromSliderOrigin);
            return pixelsFromSliderOrigin;
        });
    }
    function puzzleApiCall(puzzleB64, pieceB64) {
        return __awaiter(this, void 0, void 0, function* () {
            let resp = yield apiCall(puzzleUrl, {
                puzzleImageB64: puzzleB64,
                pieceImageB64: pieceB64
            });
            let slideXProportion = (yield resp.json()).slideXProportion;
            console.log("slideXProportion = " + slideXProportion);
            return slideXProportion;
        });
    }
    function imageDragApiCall(puzzleB64, pieceB64) {
        return __awaiter(this, void 0, void 0, function* () {
            let resp = yield apiCall(imageDragUrl, {
                puzzleImageB64: puzzleB64,
                pieceImageB64: pieceB64
            });
            let j = yield resp.json();
            console.log("image drag response: " + j);
            return j;
        });
    }
    function anySelectorInListPresent(selectors) {
        for (const selector of selectors) {
            let ele = document.querySelector(selector);
            if (ele) {
                console.log(`selector ${selector} is present`);
                return true;
            }
            let iframe = document.querySelector("iframe");
            if (iframe) {
                console.log("checking for selector in iframe");
                if (iframe.contentWindow) {
                    ele = iframe.contentWindow.document.body.querySelector(selector);
                    if (ele) {
                        console.log("Selector is present in iframe: " + selector);
                        return true;
                    }
                }
            }
        }
        console.log(`no selector in list is present`);
        return false;
    }
    function identifyCaptcha() {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < 30; i++) {
                if (anySelectorInListPresent(IMAGE_CRAWL_UNIQUE_IDENTIFIERS)) {
                    console.log("image crawl detected");
                    return CaptchaType.IMAGE_CRAWL;
                }
                else if (anySelectorInListPresent(PUZZLE_UNIQUE_IDENTIFIERS)) {
                    console.log("puzzle detected");
                    return CaptchaType.PUZZLE;
                }
                else if (anySelectorInListPresent(IMAGE_DRAG_UNIQUE_IDENTIFIERS)) {
                    console.log("image drag detected");
                    return CaptchaType.IMAGE_DRAG;
                }
                else {
                    yield new Promise(r => setTimeout(r, 1000));
                }
            }
            throw new Error("Could not identify CaptchaType");
        });
    }
    function getImageSource(selector, iframeSelector) {
        return __awaiter(this, void 0, void 0, function* () {
            let ele = yield waitForElement(selector, iframeSelector);
            let src = ele.getAttribute("src");
            console.log("src = " + selector);
            return src;
        });
    }
    function getBase64StringFromDataURL(dataUrl) {
        let img = dataUrl.replace('data:', '').replace(/^.+,/, '');
        console.log("got b64 string from data URL");
        return img;
    }
    /*
        * Input layer.
        *
        * Events built with `new MouseEvent(...)` and dispatchEvent() always have
        * isTrusted === false, which a captcha can check in one line. The
        * background service worker can instead dispatch the same input over the
        * DevTools protocol, which enters the browser's real input pipeline and
        * produces trusted events.
        *
        * CDP is unavailable in Firefox, when the debugger permission is denied,
        * and when DevTools is already attached to this tab, so every helper falls
        * back to the old synthetic dispatch. The fallback is detectable; it is
        * only here so the extension keeps working rather than dying outright.
    */
    let trustedInputAvailable = null;
    let mouseIsDown = false;
    function sendInputMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let resp = yield chrome.runtime.sendMessage(message);
                return resp !== undefined && resp !== null && resp.ok === true;
            }
            catch (err) {
                console.log("input request to background failed: " + err);
                return false;
            }
        });
    }
    function acquireTrustedInput() {
        return __awaiter(this, void 0, void 0, function* () {
            trustedInputAvailable = yield sendInputMessage({ sadCaptchaInput: "acquire" });
            if (trustedInputAvailable)
                console.log("using trusted input events via the devtools protocol");
            else
                console.log("trusted input unavailable, falling back to synthetic events");
            return trustedInputAvailable;
        });
    }
    function releaseTrustedInput() {
        return __awaiter(this, void 0, void 0, function* () {
            if (trustedInputAvailable === true)
                yield sendInputMessage({ sadCaptchaInput: "release" });
            trustedInputAvailable = null;
            mouseIsDown = false;
        });
    }
    /*
        * Returns false when the event could not be dispatched as trusted input,
        * in which case the caller is responsible for the synthetic fallback.
    */
    function dispatchTrustedMouse(params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (trustedInputAvailable === false)
                return false;
            if (trustedInputAvailable === null)
                yield acquireTrustedInput();
            if (trustedInputAvailable !== true)
                return false;
            let ok = yield sendInputMessage({ sadCaptchaInput: "mouse", params: params });
            if (!ok) {
                console.log("trusted input dispatch failed, falling back to synthetic events");
                trustedInputAvailable = false;
            }
            return ok;
        });
    }
    /*
        * Coordinates handed to the devtools protocol are CSS pixels relative to
        * the top level viewport, but getBoundingClientRect() on an element we
        * reached through an iframe's contentWindow is relative to that iframe.
        * Everything that feeds a coordinate to the input layer goes through here.
    */
    function frameOffset(element) {
        let offset = { x: 0, y: 0 };
        try {
            let win = element.ownerDocument.defaultView;
            while (win !== null && win !== window) {
                let frame = win.frameElement;
                if (frame === null)
                    break;
                let rect = frame.getBoundingClientRect();
                offset.x += rect.x + frame.clientLeft;
                offset.y += rect.y + frame.clientTop;
                win = win.parent;
            }
        }
        catch (err) {
            console.log("could not walk frame chain, assuming top level: " + err);
        }
        return offset;
    }
    function viewportRect(element) {
        let rect = element.getBoundingClientRect();
        let offset = frameOffset(element);
        if (offset.x === 0 && offset.y === 0)
            return rect;
        return new DOMRect(rect.x + offset.x, rect.y + offset.y, rect.width, rect.height);
    }
    /*
        * document.elementFromPoint() stops at the iframe element, so descend into
        * same origin frames to find what is actually under the cursor. Only the
        * synthetic fallback needs this; real input is hit tested by the browser.
    */
    function elementFromViewportPoint(x, y) {
        let element = document.elementFromPoint(x, y);
        let localX = x;
        let localY = y;
        while (element instanceof HTMLIFrameElement) {
            try {
                let rect = element.getBoundingClientRect();
                localX -= rect.x + element.clientLeft;
                localY -= rect.y + element.clientTop;
                let inner = element.contentWindow.document.elementFromPoint(localX, localY);
                if (inner === null)
                    break;
                element = inner;
            }
            catch (err) {
                console.log("could not descend into iframe for hit test: " + err);
                break;
            }
        }
        return element;
    }
    function syntheticMouseEvent(type, x, y) {
        let target = elementFromViewportPoint(x, y);
        if (target === null)
            target = CONTAINER;
        target.dispatchEvent(new PointerEvent(type, {
            pointerType: "mouse",
            cancelable: true,
            bubbles: true,
            view: window,
            clientX: x,
            clientY: y,
            button: 0,
            buttons: mouseIsDown ? 1 : 0
        }));
    }
    function mouseDown(x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            mouseIsDown = true;
            let trusted = yield dispatchTrustedMouse({
                type: "mousePressed",
                x: x,
                y: y,
                button: "left",
                buttons: 1,
                clickCount: 1,
                pointerType: "mouse"
            });
            if (!trusted) {
                syntheticMouseEvent("pointerdown", x, y);
                syntheticMouseEvent("mousedown", x, y);
            }
            console.log("mouse down at " + x + ", " + y);
        });
    }
    function mouseUp(x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            let trusted = yield dispatchTrustedMouse({
                type: "mouseReleased",
                x: x,
                y: y,
                button: "left",
                buttons: 1,
                clickCount: 1,
                pointerType: "mouse"
            });
            if (!trusted) {
                syntheticMouseEvent("pointerup", x, y);
                syntheticMouseEvent("mouseup", x, y);
            }
            mouseIsDown = false;
            console.log("mouse up at " + x + ", " + y);
        });
    }
    /*
        * The button state has to ride along on every move: a drag handler that
        * checks event.buttons sees nothing without it, and the browser will not
        * infer it for us.
    */
    function mouseMove(x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            let trusted = yield dispatchTrustedMouse({
                type: "mouseMoved",
                x: x,
                y: y,
                button: mouseIsDown ? "left" : "none",
                buttons: mouseIsDown ? 1 : 0,
                pointerType: "mouse"
            });
            if (!trusted) {
                syntheticMouseEvent("pointermove", x, y);
                syntheticMouseEvent("mousemove", x, y);
            }
        });
    }
    function mouseEnterPage() {
        return __awaiter(this, void 0, void 0, function* () {
            let width = window.innerWidth;
            let centerX = window.innerWidth / 2;
            let centerY = window.innerHeight / 2;
            /*
                * Every trusted dispatch is a round trip to the service worker, so walk
                * in over a fixed number of steps rather than one per pixel.
            */
            let steps = 40;
            for (let i = 1; i <= steps; i++) {
                try {
                    yield mouseMove(width - (centerX * (i / steps)), centerY);
                }
                catch (err) {
                    console.log("error moving mouse into page: ");
                    console.dir(err);
                }
                yield new Promise(r => setTimeout(r, 5 + Math.random() * 10));
            }
        });
    }
    function clickElement(selector) {
        return __awaiter(this, void 0, void 0, function* () {
            let ele = document.querySelector(selector);
            console.log("sending mouse event click");
            let center = getElementCenter(ele);
            yield mouseMove(center.x, center.y);
            yield new Promise(r => setTimeout(r, 30 + Math.random() * 50));
            yield mouseDown(center.x, center.y);
            yield new Promise(r => setTimeout(r, 40 + Math.random() * 60));
            yield mouseUp(center.x, center.y);
            /*
                * Trusted input generates the click from the press/release pair; the
                * synthetic path has to emit it explicitly.
            */
            if (trustedInputAvailable !== true)
                syntheticMouseEvent("click", center.x, center.y);
        });
    }
    function getElementCenter(element) {
        let rect = viewportRect(element);
        let center = {
            x: rect.x + (rect.width / 2),
            y: rect.y + (rect.height / 2),
        };
        console.log("element center: ");
        console.dir(center);
        return center;
    }
    function getElementWidth(element) {
        let rect = viewportRect(element);
        console.log("element width: " + rect.width);
        return rect.width;
    }
    function computePuzzleSlideDistance(proportionX, puzzleImageEle) {
        let distance = viewportRect(puzzleImageEle).width * proportionX;
        console.log("puzzle slide distance = " + distance);
        return distance;
    }
    function refreshImageCrawl() {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise(r => setTimeout(r, 1000));
            let puzzleImageSrcOriginal = elementToDataUrl(document.querySelector(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR));
            yield clickElement(IMAGE_CRAWL_RESET_BUTTON);
            while ((elementToDataUrl(document.querySelector(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR)))
                === puzzleImageSrcOriginal) {
                console.log("waiting for refresh...");
                yield new Promise(r => setTimeout(r, 100));
                continue;
            }
            console.log("refresh complete");
        });
    }
    function generateNaturalApproach(start, end, steps) {
        const control1 = {
            x: start.x + (end.x - start.x) * (0.2 + Math.random() * 0.2),
            y: start.y + (Math.random() * 15 - 5)
        };
        const control2 = {
            x: start.x + (end.x - start.x) * (0.6 + Math.random() * 0.2),
            y: end.y + (Math.random() * 10 - 5)
        };
        const points = [];
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = Math.pow(1 - t, 3) * start.x +
                3 * Math.pow(1 - t, 2) * t * control1.x +
                3 * (1 - t) * Math.pow(t, 2) * control2.x +
                Math.pow(t, 3) * end.x;
            const y = Math.pow(1 - t, 3) * start.y +
                3 * Math.pow(1 - t, 2) * t * control1.y +
                3 * (1 - t) * Math.pow(t, 2) * control2.y +
                Math.pow(t, 3) * end.y;
            points.push({ x, y });
        }
        return points;
    }
    function moveMouseTo(x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            yield mouseMove(x, y);
        });
    }
    function mouseApproach(x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            // Natural approach to the handle
            const approachStartX = x - 80 - Math.random() * 40;
            const approachStartY = y + 40 + Math.random() * 30;
            const approachPoints = generateNaturalApproach({ x: approachStartX, y: approachStartY }, { x: x, y: y }, 8 + Math.floor(Math.random() * 4));
            // Move cursor to approach the handle naturally
            for (const point of approachPoints) {
                yield moveMouseTo(point.x, point.y);
                yield new Promise(r => setTimeout(r, 15 + Math.random() * 25));
            }
            // Hover on handle with slight jitter
            yield new Promise(r => setTimeout(r, 200 + Math.random() * 150));
            yield moveMouseTo(x + (Math.random() * 1.5 - 0.75), y + (Math.random() * 1.5 - 0.75));
        });
    }
    function elementToDataUrl(ele) {
        if (ele instanceof HTMLCanvasElement) {
            return ele.toDataURL();
        }
        else if (ele instanceof HTMLImageElement) {
            return ele.src;
        }
        else {
            throw new Error("cannot get data url from non-image or canvas element");
        }
    }
    function solveImageCrawl() {
        return __awaiter(this, void 0, void 0, function* () {
            yield mouseEnterPage();
            let puzzleImageEle = yield waitForElement(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR);
            let puzzleImg = getBase64StringFromDataURL(elementToDataUrl(puzzleImageEle));
            let imageCrawlInfo = {
                version: "na",
                slideXProportion: 0.9,
                skipRecommended: true
            };
            // The pre-analyze API on the sadcaptcha side 
            // recommends whether or not we should skip this one.
            // Try until skipRecommended = false
            for (let i = 0; i < 5; i++) {
                puzzleImageEle = yield waitForElement(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR);
                puzzleImg = getBase64StringFromDataURL(elementToDataUrl(puzzleImageEle));
                // Pre-analyze to determine the max distance to drag the slider
                imageCrawlInfo = yield imageCrawlPreAnalyzeApiCall({ image_b64: puzzleImg });
                if (imageCrawlInfo.skipRecommended) {
                    console.log("skip is recommended, refreshing captcha and checking for a better one");
                    yield refreshImageCrawl();
                    yield new Promise(r => setTimeout(r, 500));
                    continue;
                }
                else {
                    console.log("skip is not recommended, proceeding to solve the current captcha");
                    break;
                }
            }
            if (imageCrawlInfo === undefined) {
                throw new Error("imageCrawlInfo was never initialized");
            }
            let pieceImageEle = yield waitForElement(IMAGE_CRAWL_PIECE_IMAGE_SELECTOR);
            let pieceImg = getBase64StringFromDataURL(elementToDataUrl(pieceImageEle));
            let slideButtonEle = document.querySelector(IMAGE_CRAWL_BUTTON_SELECTOR);
            const startX = getElementCenter(slideButtonEle).x;
            const startY = getElementCenter(slideButtonEle).y;
            let puzzleEle = document.querySelector(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR);
            yield mouseApproach(startX, startY);
            // Press down after a natural delay
            yield new Promise(r => setTimeout(r, 150 + Math.random() * 200));
            let trajectory = yield getSlidePieceTrajectory(slideButtonEle, puzzleEle, imageCrawlInfo.slideXProportion);
            let request = {
                piece_image_b64: pieceImg,
                puzzle_image_b64: puzzleImg,
                slide_piece_trajectory: trajectory
            };
            console.log("image crawl request:");
            console.log(JSON.stringify(request));
            let solution = yield imageCrawlApiCall(request);
            let currentX = getElementCenter(slideButtonEle).x;
            let currentY = getElementCenter(slideButtonEle).y;
            let solutionDistanceBackwards = currentX - startX - solution;
            yield new Promise(r => setTimeout(r, 100));
            for (let pixel = 0; pixel < solutionDistanceBackwards; pixel += 1) {
                let nextX = currentX - pixel;
                let nextY = currentY - Math.log(pixel + 1);
                yield mouseMove(nextX, nextY);
                let pauseTime = (100 / (pixel + 1)) + (Math.random() * 5);
                yield new Promise(r => setTimeout(r, pauseTime));
            }
            // Hold at final position
            const holdTime = Math.random() * 500;
            console.log(`Holding at final position for ${Math.round(holdTime)}ms`);
            yield new Promise(r => setTimeout(r, holdTime));
            // Small final tremor
            const veryFinalX = startX + solution + (Math.random() * 0.3 - 0.15);
            const veryFinalY = currentY + (Math.random() * 0.3 - 0.15);
            yield moveMouseTo(veryFinalX, veryFinalY);
            yield new Promise(r => setTimeout(r, 50 + Math.random() * 30));
            yield mouseMove(startX + solution, startY);
            yield mouseUp(startX + solution, startY);
            // await new Promise(r => setTimeout(r, 3000));
        });
    }
    /*
        * @param slideButton: Element containing the slide button that the user drage
        * @param puzzle: Element containing the puzzle itself
        * @param maxProportionX: The maximum distance to drag the piece expressed as ratio
    */
    function getSlidePieceTrajectory(slideButton, puzzle, maxProportionX) {
        return __awaiter(this, void 0, void 0, function* () {
            let sliderPieceContainer = document.querySelector(IMAGE_CRAWL_PIECE_IMAGE_SELECTOR);
            console.log("got slider piece container");
            let slideBarWidth = getElementWidth(puzzle);
            console.log("slide bar width: " + slideBarWidth);
            let timesPieceDidNotMove = 0;
            let slideButtonCenter = getElementCenter(slideButton);
            let puzzleImageBoundingBox = viewportRect(puzzle);
            let trajectory = [];
            let mouseStep = 3;
            yield mouseDown(slideButtonCenter.x, slideButtonCenter.y);
            const numSegments = 4;
            yield new Promise(r => setTimeout(r, Math.random() * 50));
            for (let pixel = 0; pixel < slideBarWidth * 0.85; pixel += mouseStep) {
                let nextX = slideButtonCenter.x + pixel;
                let nextY = slideButtonCenter.y - Math.log(pixel + 1);
                if (Math.random() > 0.9) {
                    const tremorX = nextX + (Math.random() * 0.6 - 0.3);
                    const tremorY = nextY + (Math.random() * 0.6 - 0.3);
                    yield moveMouseTo(tremorX, tremorY);
                    // await new Promise(r => setTimeout(r, Math.random() * 200));
                    yield new Promise(r => setTimeout(r, Math.random() * 100));
                    yield moveMouseTo(nextX, nextY);
                }
                // Speed up as we go
                let pauseTime = (100 / (pixel + 1)) + (Math.random() * 5);
                yield new Promise(r => setTimeout(r, pauseTime));
                yield mouseMove(nextX, nextY);
                yield new Promise(r => setTimeout(r, 10));
                let trajectoryElement = getTrajectoryElement(pixel, puzzleImageBoundingBox, sliderPieceContainer);
                // Break the loop if we have surpassed the 
                // max slide x proportion from pre-analysis
                if (trajectoryElement.piece_center.proportionX >= maxProportionX) {
                    console.log("piece center has surpassed max proportion X from pre-analysis, breaking loop now");
                    break;
                }
                trajectory.push(trajectoryElement);
                if (trajectory.length < 100 / mouseStep)
                    continue;
                if (pieceIsNotMoving(trajectory))
                    timesPieceDidNotMove++;
                else
                    timesPieceDidNotMove = 0;
                if (timesPieceDidNotMove >= 10 / mouseStep)
                    break;
            }
            return trajectory;
        });
    }
    function getTrajectoryElement(currentSliderPixel, largeImgBoundingBox, sliderPiece) {
        let sliderPieceStyle = sliderPiece.getAttribute("style");
        let rotateAngle = rotateAngleFromStyle(sliderPieceStyle);
        let pieceCenter = getElementCenter(sliderPiece);
        let pieceCenterProp = xyToProportionalPoint(largeImgBoundingBox, pieceCenter); // This returns undefined
        let ele = {
            piece_center: pieceCenterProp,
            piece_rotation_angle: rotateAngle,
            pixels_from_slider_origin: currentSliderPixel
        };
        console.dir(ele);
        return ele;
    }
    function rotateAngleFromStyle(style) {
        let rotateRegex = /.*rotate\(|deg.*/gi;
        let rotateAngle;
        if (style.search(rotateRegex) === -1) {
            rotateAngle = 0;
        }
        else {
            let rotateStr = style.replace(rotateRegex, "");
            rotateAngle = parseFloat(rotateStr);
        }
        console.log("rotate angle: " + rotateAngle);
        return rotateAngle;
    }
    function pieceIsNotMoving(trajetory) {
        console.dir(trajetory);
        if (trajetory[trajetory.length - 1].piece_center.proportionX ==
            trajetory[trajetory.length - 2].piece_center.proportionX) {
            console.log("piece is not moving");
            return true;
        }
        else {
            console.log("piece is moving");
            return false;
        }
    }
    function xyToProportionalPoint(container, point) {
        let xInContainer = point.x - container.x;
        let yInContainer = point.y - container.y;
        return {
            proportionX: xInContainer / container.width,
            proportionY: yInContainer / container.height,
        };
    }
    function solvePuzzle() {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise(r => setTimeout(r, 3000));
            let sliderButton = document.querySelector(PUZZLE_BUTTON_SELECTOR);
            let buttonCenter = getElementCenter(sliderButton);
            let preRequestSlidePixels = 10;
            yield mouseEnterPage();
            yield new Promise(r => setTimeout(r, 133.7));
            yield mouseMove(buttonCenter.x, buttonCenter.y);
            yield new Promise(r => setTimeout(r, 133.7));
            yield mouseDown(buttonCenter.x, buttonCenter.y);
            yield new Promise(r => setTimeout(r, 133.7));
            for (let i = 1; i < preRequestSlidePixels; i++) {
                yield mouseMove(buttonCenter.x + i, buttonCenter.y - Math.log(i) + Math.random() * 3);
                yield new Promise(r => setTimeout(r, Math.random() * 5 + 10));
            }
            let puzzleSrc = yield getImageSource(PUZZLE_PUZZLE_IMAGE_SELECTOR);
            let pieceSrc = yield getImageSource(PUZZLE_PIECE_IMAGE_SELECTOR);
            console.log("got image sources");
            let puzzleImg = getBase64StringFromDataURL(puzzleSrc);
            let pieceImg = getBase64StringFromDataURL(pieceSrc);
            console.log("converted image sources to b64 string");
            let solution = yield puzzleApiCall(puzzleImg, pieceImg);
            console.log("got API result: " + solution);
            let puzzleImageEle = document.querySelector(PUZZLE_PUZZLE_IMAGE_SELECTOR);
            let distance = computePuzzleSlideDistance(solution, puzzleImageEle);
            let currentX;
            let currentY;
            for (let i = 1; i < distance - preRequestSlidePixels; i += Math.random() * 5) {
                currentX = buttonCenter.x + i + preRequestSlidePixels;
                currentY = buttonCenter.y - Math.log(i) + Math.random() * 3;
                yield mouseMove(currentX, currentY);
                yield new Promise(r => setTimeout(r, Math.random() * 5 + 10));
            }
            yield new Promise(r => setTimeout(r, 133.7));
            /*
                * The release has to land on the handle. This used to pass
                * buttonCenter.x - distance as the y coordinate, which the synthetic
                * events largely ignored because they were dispatched straight at the
                * container. Real input is hit tested, so releasing off target drops
                * the drag.
            */
            yield mouseMove(buttonCenter.x + distance, buttonCenter.y);
            yield new Promise(r => setTimeout(r, 133.7));
            yield mouseUp(buttonCenter.x + distance, buttonCenter.y);
            yield new Promise(r => setTimeout(r, 3000));
        });
    }
    function solveImageDrag() {
        return __awaiter(this, void 0, void 0, function* () {
            let pieceImageEle = yield waitForElement(IMAGE_DRAG_PIECE_IMAGE_SELECTOR);
            let puzzleImageEle = yield waitForElement(IMAGE_DRAG_PUZZLE_IMAGE_SELECTOR);
            let pieceImageSrc = yield getImageSource(IMAGE_DRAG_PIECE_IMAGE_SELECTOR);
            let puzzleImageSrc = elementToDataUrl(puzzleImageEle);
            let puzzleImg = getBase64StringFromDataURL(puzzleImageSrc);
            let pieceImg = getBase64StringFromDataURL(pieceImageSrc);
            let startPoint = getElementCenter(pieceImageEle);
            console.log("got start point for image drag piece element: " + startPoint);
            yield mouseApproach(startPoint.x, startPoint.y);
            // Call the API and determine loc in viewport to release piece
            let apiResp = yield imageDragApiCall(puzzleImg, pieceImg);
            let bbox = viewportRect(puzzleImageEle);
            let answerX = bbox.x + (apiResp.proportionalPoints[0].proportionX * bbox.width);
            let answerY = bbox.y + (apiResp.proportionalPoints[0].proportionY * bbox.height);
            console.log("got API response for image drag");
            // Press down after a natural delay
            yield new Promise(r => setTimeout(r, 150 + Math.random() * 200));
            yield mouseDown(startPoint.x, startPoint.y);
            console.log("started drag");
            /*
                * Lift the mouse up at the correct location. A single jump used to be
                * enough for synthetic events, but a drag driven by real input needs
                * intermediate moves for the page to track the piece.
            */
            const dragPoints = generateNaturalApproach(startPoint, { x: answerX, y: answerY }, 20);
            for (const point of dragPoints) {
                yield moveMouseTo(point.x, point.y);
                yield new Promise(r => setTimeout(r, 10 + Math.random() * 20));
            }
            console.log("moved mouse to answer");
            yield new Promise(r => setTimeout(r, 150 + Math.random() * 200));
            yield mouseUp(answerX, answerY);
            console.log("lifting mouse");
            // Click verify
            yield new Promise(r => setTimeout(r, 150 + Math.random() * 200));
            yield clickElement(IMAGE_DRAG_VERIFY_BUTTON_SELECTOR);
            console.log("clicked verify button");
            // wait before continuing to avoid excessive solving
            yield new Promise(r => setTimeout(r, 5000));
        });
    }
    function captchaIsPresent() {
        for (let i = 0; i < CAPTCHA_PRESENCE_INDICATORS.length; i++) {
            if (document.querySelector(CAPTCHA_PRESENCE_INDICATORS[i])) {
                console.log("captcha present based on selector: " + CAPTCHA_PRESENCE_INDICATORS[i]);
                return true;
            }
        }
        console.log("captcha not present");
        return false;
    }
    let isCurrentSolve = false;
    function solveCaptchaLoop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!isCurrentSolve) {
                if (captchaIsPresent()) {
                    console.log("captcha detected by css selector");
                }
                else {
                    console.log("waiting for captcha");
                    yield findFirstElementToAppear(CAPTCHA_PRESENCE_INDICATORS);
                    console.log("captcha detected by mutation observer");
                }
                isCurrentSolve = true;
                let captchaType = CaptchaType.IMAGE_CRAWL;
                try {
                    captchaType = yield identifyCaptcha();
                }
                catch (err) {
                    console.log("could not detect captcha type. restarting captcha loop");
                    isCurrentSolve = false;
                    yield solveCaptchaLoop();
                }
                try {
                    if ((yield creditsApiCall()) <= 0) {
                        console.log("out of credits");
                        alert("Out of SadCaptcha credits. Please boost your balance on sadcaptcha.com/dashboard.");
                        return;
                    }
                }
                catch (e) {
                    console.log("error making check credits api call");
                    console.error(e);
                    console.log("proceeding to attempt solution anyways");
                }
                /*
                    * Attach the debugger only for the duration of the solve: Chrome
                    * shows an infobar on the tab for as long as we hold the session.
                */
                yield acquireTrustedInput();
                try {
                    switch (captchaType) {
                        case CaptchaType.PUZZLE:
                            yield solvePuzzle();
                            break;
                        case CaptchaType.IMAGE_DRAG:
                            yield solveImageDrag();
                            break;
                        case CaptchaType.IMAGE_CRAWL:
                            yield solveImageCrawl();
                            break;
                    }
                }
                catch (err) {
                    console.log("error solving captcha");
                    console.error(err);
                    console.log("restarting captcha loop");
                }
                finally {
                    yield releaseTrustedInput();
                    isCurrentSolve = false;
                    yield new Promise(r => setTimeout(r, 5000));
                    yield solveCaptchaLoop();
                }
            }
        });
    }
    solveCaptchaLoop();
})();
//# sourceMappingURL=script.js.map