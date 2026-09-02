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
    if (window.hasRun === true)
        return true;
    window.hasRun = true;
    const CONTAINER = document.documentElement || document.body;
    chrome.runtime.onMessage.addListener(function (request, _, sendResponse) {
        if (request.apiKey !== null) {
            localStorage.setItem("sadCaptchaKey", request.apiKey);
            sendResponse({ message: "API key set.", success: 1 });
        }
        else {
            sendResponse({ message: "API key cannot be empty.", success: 0 });
        }
    });
    function getApiKey() {
        let apiKey = localStorage.getItem("sadCaptchaKey");
        if (apiKey) {
            return apiKey;
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
    const SCATTER_SWEEP = true;
    const SCATTER_BLOCK_PX = 30;
    const GESTURE_AMP_U = 1.5;
    const GESTURE_PASSES = 4;
    const GESTURE_PACE_MS = 2;
    const SWING_SAFE_PX = 12;
    const PAUSE_BEFORE_NUDGE_MS = [900, 2100];
    const PAUSE_BEFORE_RELEASE_MS = [750, 1450];
    const SKIP_CAP = 3;
    const PRESS_SETTLE_MS = 150;
    const SAMPLE_SETTLE_MS = 20;
    const OVERSHOOT_PX = 15;
    const MIN_TRAJECTORY_ROWS = 12;
    const INTERPOLATE_MOVES = false;
    function between(range) {
        return range[0] + Math.random() * (range[1] - range[0]);
    }
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
                                                observer.disconnect();
                                                return resolve(iframeElement);
                                            }
                                        }
                                    }, 3000);
                                }
                                if (node instanceof Element) {
                                    let element = node;
                                    if (element.querySelector(selector)) {
                                        observer.disconnect();
                                        return resolve(element);
                                    }
                                }
                            }
                            catch (err) {
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
                        return resolve(targetDocument.querySelector(selector));
                    }
                    else {
                        const observer = new MutationObserver(_ => {
                            if (targetDocument.querySelector(selector)) {
                                observer.disconnect();
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
            }
        }
        throw new Error(`Could not get element ${selector} after 5 tries`);
    }
    function creditsApiCall() {
        return __awaiter(this, void 0, void 0, function* () {
            let resp = yield fetch(creditsUrl + getApiKey(), {
                method: "GET",
                headers: API_HEADERS,
            });
            let credits = (yield resp.json()).credits;
            return credits;
        });
    }
    function apiCall(url, body) {
        return __awaiter(this, void 0, void 0, function* () {
            let resp = yield fetch(url + getApiKey(), {
                method: "POST",
                headers: API_HEADERS,
                body: JSON.stringify(body)
            });
            return resp;
        });
    }
    function imageCrawlPreAnalyzeApiCall(requestBody) {
        return __awaiter(this, void 0, void 0, function* () {
            let resp = yield apiCall(imageCrawlPreAnalyzeUrl, requestBody);
            let result = yield resp.json();
            return result;
        });
    }
    function imageCrawlApiCall(requestBody) {
        return __awaiter(this, void 0, void 0, function* () {
            let resp = yield apiCall(imageCrawlUrl, requestBody);
            let pixelsFromSliderOrigin = (yield resp.json()).pixelsFromSliderOrigin;
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
            return j;
        });
    }
    function anySelectorInListPresent(selectors) {
        for (const selector of selectors) {
            let ele = document.querySelector(selector);
            if (ele) {
                return true;
            }
            let iframe = document.querySelector("iframe");
            if (iframe) {
                if (iframe.contentWindow) {
                    ele = iframe.contentWindow.document.body.querySelector(selector);
                    if (ele) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    function identifyCaptcha() {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < 30; i++) {
                if (anySelectorInListPresent(IMAGE_CRAWL_UNIQUE_IDENTIFIERS)) {
                    return CaptchaType.IMAGE_CRAWL;
                }
                else if (anySelectorInListPresent(PUZZLE_UNIQUE_IDENTIFIERS)) {
                    return CaptchaType.PUZZLE;
                }
                else if (anySelectorInListPresent(IMAGE_DRAG_UNIQUE_IDENTIFIERS)) {
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
            return src;
        });
    }
    function getBase64StringFromDataURL(dataUrl) {
        let img = dataUrl.replace('data:', '').replace(/^.+,/, '');
        return img;
    }
    let trustedInputAvailable = null;
    let mouseIsDown = false;
    function sendInputMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let resp = yield chrome.runtime.sendMessage(message);
                return resp !== undefined && resp !== null && resp.ok === true;
            }
            catch (err) {
                return false;
            }
        });
    }
    function toDeviceLattice(v) {
        const dpr = window.devicePixelRatio || 1;
        return Math.round(v * dpr) / dpr;
    }
    let cursor = { x: null, y: null };
    function acquireTrustedInput() {
        return __awaiter(this, void 0, void 0, function* () {
            trustedInputAvailable = yield sendInputMessage({ sadCaptchaInput: "acquire" });
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
    function dispatchTrustedMouse(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const prevX = cursor.x;
            const prevY = cursor.y;
            if (typeof params.x === "number" && typeof params.y === "number") {
                cursor.x = params.x;
                cursor.y = params.y;
            }
            if (trustedInputAvailable === false)
                return false;
            if (trustedInputAvailable === null)
                yield acquireTrustedInput();
            if (trustedInputAvailable !== true)
                return false;
            let msg;
            let paceMs = 0;
            if (INTERPOLATE_MOVES && params.type === "mouseMoved"
                && prevX !== null && prevY !== null
                && typeof params.x === "number") {
                const dist = Math.sqrt(Math.pow(params.x - prevX, 2)
                    + Math.pow(params.y - prevY, 2));
                const pts = Math.max(2, Math.min(12, Math.round(dist / 4)));
                let batch = [];
                for (let i = 1; i <= pts; i++) {
                    const f = i / pts;
                    batch.push(Object.assign({}, params, {
                        x: toDeviceLattice(prevX + (params.x - prevX) * f),
                        y: toDeviceLattice(prevY + (params.y - prevY) * f)
                    }));
                }
                paceMs = pts * 2 + 4;
                msg = { sadCaptchaInput: "mouseBatch", batch: batch };
            }
            else {
                msg = { sadCaptchaInput: "mouse", params: params };
            }
            const t0 = performance.now();
            let ok = yield sendInputMessage(msg);
            if (!ok) {
                trustedInputAvailable = null;
                yield acquireTrustedInput();
                if (trustedInputAvailable === true)
                    ok = yield sendInputMessage(msg);
            }
            const spent = performance.now() - t0;
            if (paceMs > spent)
                yield new Promise(r => setTimeout(r, paceMs - spent));
            if (!ok) {
                trustedInputAvailable = false;
            }
            return ok;
        });
    }
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
        });
    }
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
            let entryPath = generateNaturalApproach({ x: 0, y: centerY * 0.9 }, { x: centerX, y: centerY }, (Math.random() * 10) + 50);
            for (let i = 0; i < entryPath.length; i++) {
                let pt = entryPath[i];
                yield mouseMove(pt.x, pt.y);
                yield new Promise(r => setTimeout(r, 5 + Math.random() * 10));
            }
        });
    }
    function clickElement(selector) {
        return __awaiter(this, void 0, void 0, function* () {
            let ele = document.querySelector(selector);
            let center = getElementCenter(ele);
            yield mouseMove(center.x, center.y);
            yield new Promise(r => setTimeout(r, 30 + Math.random() * 50));
            yield mouseDown(center.x, center.y);
            yield new Promise(r => setTimeout(r, 40 + Math.random() * 60));
            yield mouseUp(center.x, center.y);
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
        return center;
    }
    function getElementWidth(element) {
        let rect = viewportRect(element);
        return rect.width;
    }
    function computePuzzleSlideDistance(proportionX, puzzleImageEle) {
        let distance = viewportRect(puzzleImageEle).width * proportionX;
        return distance;
    }
    function refreshImageCrawl() {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise(r => setTimeout(r, 1000));
            let puzzleImageSrcOriginal = elementToDataUrl(document.querySelector(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR));
            yield clickElement(IMAGE_CRAWL_RESET_BUTTON);
            while ((elementToDataUrl(document.querySelector(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR)))
                === puzzleImageSrcOriginal) {
                yield new Promise(r => setTimeout(r, 100));
                continue;
            }
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
            const approachStartX = x - 80 - Math.random() * 40;
            const approachStartY = y + 40 + Math.random() * 30;
            const approachPoints = generateNaturalApproach({ x: approachStartX, y: approachStartY }, { x: x, y: y }, 8 + Math.floor(Math.random() * 4));
            for (const point of approachPoints) {
                yield moveMouseTo(point.x, point.y);
                yield new Promise(r => setTimeout(r, 15 + Math.random() * 25));
            }
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
        return __awaiter(this, arguments, void 0, function* (attempt = 1) {
            yield refreshImageCrawl();
            yield new Promise(r => setTimeout(r, 100));
            let puzzleImageEle = yield waitForElement(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR);
            let puzzleImg = getBase64StringFromDataURL(elementToDataUrl(puzzleImageEle));
            let imageCrawlInfo = yield imageCrawlPreAnalyzeApiCall({ image_b64: puzzleImg });
            if (imageCrawlInfo === undefined) {
                throw new Error("imageCrawlInfo was never initialized");
            }
            if (imageCrawlInfo.skipRecommended) {
                if (attempt >= SKIP_CAP) {
                }
                else {
                    return yield solveImageCrawl(attempt + 1);
                }
            }
            else {
            }
            const targetProp = imageCrawlInfo.slideXProportion;
            if (typeof targetProp === "number" && targetProp >= 0.99 && attempt < SKIP_CAP) {
                return yield solveImageCrawl(attempt + 1);
            }
            let pieceImageEle = yield waitForElement(IMAGE_CRAWL_PIECE_IMAGE_SELECTOR);
            let pieceImg = getBase64StringFromDataURL(elementToDataUrl(pieceImageEle));
            let slideButtonEle = document.querySelector(IMAGE_CRAWL_BUTTON_SELECTOR);
            const startX = getElementCenter(slideButtonEle).x;
            const startY = getElementCenter(slideButtonEle).y;
            let puzzleEle = document.querySelector(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR);
            yield mouseApproach(startX, startY);
            yield new Promise(r => setTimeout(r, 50 * Math.random()));
            let trajectory = yield getSlidePieceTrajectory(slideButtonEle, puzzleEle, imageCrawlInfo.slideXProportion);
            if (trajectory.length < MIN_TRAJECTORY_ROWS) {
                yield mouseUp(getElementCenter(slideButtonEle).x, startY);
                if (attempt < SKIP_CAP)
                    yield solveImageCrawl(attempt + 1);
                return;
            }
            let request = {
                piece_image_b64: pieceImg,
                puzzle_image_b64: puzzleImg,
                slide_piece_trajectory: trajectory
            };
            let solution = yield imageCrawlApiCall(request);
            if (!solution) {
                yield mouseUp(getElementCenter(slideButtonEle).x, startY);
                if (attempt < SKIP_CAP)
                    yield solveImageCrawl(attempt + 1);
                return;
            }
            const maxPx = getElementWidth(puzzleEle) * 0.85;
            const toU = (px) => px / maxPx * 4 - 2;
            const toPx = (u) => (u + 2) / 4 * maxPx;
            const aimU = toU(solution);
            const releaseY = getElementCenter(slideButtonEle).y;
            const leg = (fromPx, toPx_, step) => __awaiter(this, void 0, void 0, function* () {
                const dist = toPx_ - fromPx;
                const n = Math.max(1, Math.ceil(Math.abs(dist) / step));
                for (let i = 1; i <= n; i++) {
                    yield mouseMove(startX + fromPx + dist * (i / n), releaseY + (Math.random() * 1.6 - 0.8));
                    yield new Promise(r => setTimeout(r, GESTURE_PACE_MS));
                }
                return toPx_;
            });
            const loU = toU(SWING_SAFE_PX);
            let sides = [];
            for (let c = 0; c < GESTURE_PASSES; c++) {
                let a = GESTURE_AMP_U * (1 - c / GESTURE_PASSES);
                const room = (c % 2 === 0) ? (2 - aimU) : (aimU - loU);
                a = Math.max(0, Math.min(a, room));
                sides.push(aimU + (c % 2 === 0 ? a : -a));
            }
            let at = getElementCenter(slideButtonEle).x - startX;
            for (const u of sides)
                at = yield leg(at, toPx(u), 13);
            at = yield leg(at, solution, 15);
            const releasePx = toPx(Math.round((toU(solution) + 0.02) * 1e4) / 1e4);
            yield new Promise(r => setTimeout(r, between(PAUSE_BEFORE_NUDGE_MS)));
            yield mouseMove(startX + releasePx, startY);
            yield new Promise(r => setTimeout(r, between(PAUSE_BEFORE_RELEASE_MS)));
            yield mouseUp(startX + releasePx, startY);
        });
    }
    function getSlidePieceTrajectory(slideButton, puzzle, maxProportionX) {
        return __awaiter(this, void 0, void 0, function* () {
            let sliderPieceContainer = document.querySelector(IMAGE_CRAWL_PIECE_IMAGE_SELECTOR);
            let slideBarWidth = getElementWidth(puzzle);
            let timesPieceDidNotMove = 0;
            let slideButtonCenter = getElementCenter(slideButton);
            let puzzleImageBoundingBox = viewportRect(puzzle);
            let trajectory = [];
            let mouseStep = 3;
            const limit = slideBarWidth * 0.85;
            const haveMaxProp = typeof maxProportionX === "number" && isFinite(maxProportionX);
            yield mouseDown(slideButtonCenter.x, slideButtonCenter.y);
            let blocks = [];
            let planned = 0;
            for (let base = 0; base < limit; base += SCATTER_BLOCK_PX) {
                let block = [];
                for (let x = base; x < Math.min(base + SCATTER_BLOCK_PX, limit); x += mouseStep)
                    block.push(Math.round(x));
                if (SCATTER_SWEEP)
                    for (let i = block.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        const t = block[i];
                        block[i] = block[j];
                        block[j] = t;
                    }
                planned += block.length;
                blocks.push(block);
            }
            let stopPx = null;
            let stopped = false;
            yield new Promise(r => setTimeout(r, PRESS_SETTLE_MS));
            for (const block of blocks) {
                for (const pixel of block) {
                    yield mouseMove(slideButtonCenter.x + pixel, slideButtonCenter.y);
                    yield new Promise(r => setTimeout(r, SAMPLE_SETTLE_MS));
                    let trajectoryElement = getTrajectoryElement(pixel, puzzleImageBoundingBox, sliderPieceContainer);
                    trajectory.push(trajectoryElement);
                    if (haveMaxProp
                        && trajectoryElement.piece_center.proportionX >= maxProportionX) {
                        if (stopPx === null) {
                            stopPx = pixel;
                        }
                        else if (pixel - stopPx >= OVERSHOOT_PX) {
                            stopped = true;
                            break;
                        }
                    }
                    if (trajectory.length < 100 / mouseStep)
                        continue;
                    if (pieceIsNotMoving(trajectory))
                        timesPieceDidNotMove++;
                    else
                        timesPieceDidNotMove = 0;
                    if (timesPieceDidNotMove >= 10 / mouseStep) {
                        stopped = true;
                        break;
                    }
                }
                if (stopped)
                    break;
                const last = trajectory.length
                    ? trajectory[trajectory.length - 1].pixels_from_slider_origin : 0;
                if (stopPx !== null && last - stopPx >= OVERSHOOT_PX)
                    break;
            }
            trajectory.sort((a, b) => a.pixels_from_slider_origin - b.pixels_from_slider_origin);
            return trajectory;
        });
    }
    function getTrajectoryElement(currentSliderPixel, largeImgBoundingBox, sliderPiece) {
        let sliderPieceStyle = sliderPiece.getAttribute("style");
        let rotateAngle = rotateAngleFromStyle(sliderPieceStyle);
        let pieceCenter = getElementCenter(sliderPiece);
        let raw = xyToProportionalPoint(largeImgBoundingBox, pieceCenter);
        let pieceCenterProp = {
            proportionX: Math.round(raw.proportionX * 1e4) / 1e4,
            proportionY: Math.round(raw.proportionY * 1e4) / 1e4
        };
        let ele = {
            piece_center: pieceCenterProp,
            piece_rotation_angle: rotateAngle,
            pixels_from_slider_origin: currentSliderPixel
        };
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
        return rotateAngle;
    }
    function pieceIsNotMoving(trajetory) {
        if (trajetory[trajetory.length - 1].piece_center.proportionX ==
            trajetory[trajetory.length - 2].piece_center.proportionX) {
            return true;
        }
        else {
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
            let puzzleImg = getBase64StringFromDataURL(puzzleSrc);
            let pieceImg = getBase64StringFromDataURL(pieceSrc);
            let solution = yield puzzleApiCall(puzzleImg, pieceImg);
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
            yield mouseApproach(startPoint.x, startPoint.y);
            let apiResp = yield imageDragApiCall(puzzleImg, pieceImg);
            let bbox = viewportRect(puzzleImageEle);
            let answerX = bbox.x + (apiResp.proportionalPoints[0].proportionX * bbox.width);
            let answerY = bbox.y + (apiResp.proportionalPoints[0].proportionY * bbox.height);
            yield new Promise(r => setTimeout(r, 150 + Math.random() * 200));
            yield mouseDown(startPoint.x, startPoint.y);
            const dragPoints = generateNaturalApproach(startPoint, { x: answerX, y: answerY }, 20);
            for (const point of dragPoints) {
                yield moveMouseTo(point.x, point.y);
                yield new Promise(r => setTimeout(r, 10 + Math.random() * 20));
            }
            yield new Promise(r => setTimeout(r, 150 + Math.random() * 200));
            yield mouseUp(answerX, answerY);
            yield new Promise(r => setTimeout(r, 150 + Math.random() * 200));
            yield clickElement(IMAGE_DRAG_VERIFY_BUTTON_SELECTOR);
            yield new Promise(r => setTimeout(r, 5000));
        });
    }
    function captchaIsPresent() {
        for (let i = 0; i < CAPTCHA_PRESENCE_INDICATORS.length; i++) {
            if (document.querySelector(CAPTCHA_PRESENCE_INDICATORS[i])) {
                return true;
            }
        }
        return false;
    }
    let isCurrentSolve = false;
    function solveCaptchaLoop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!isCurrentSolve) {
                if (captchaIsPresent()) {
                }
                else {
                    yield findFirstElementToAppear(CAPTCHA_PRESENCE_INDICATORS);
                }
                isCurrentSolve = true;
                let captchaType = CaptchaType.IMAGE_CRAWL;
                try {
                    captchaType = yield identifyCaptcha();
                }
                catch (err) {
                    isCurrentSolve = false;
                    yield solveCaptchaLoop();
                }
                try {
                    if ((yield creditsApiCall()) <= 0) {
                        alert("Out of SadCaptcha credits. Please boost your balance on sadcaptcha.com/dashboard.");
                        return;
                    }
                }
                catch (e) {
                }
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
