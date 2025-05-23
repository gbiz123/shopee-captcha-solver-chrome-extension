var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
(function () {
    // Avoid multiple instances running: 
    if (window.hasRun === true)
        return true;
    window.hasRun = true;
    var CONTAINER = document.documentElement || document.body;
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
        var apiKey = localStorage.getItem("sadCaptchaKey");
        if (apiKey) {
            return apiKey;
        }
        else {
            throw new Error("could not get sadCaptchaKey from localStorage");
        }
    }
    var creditsUrl = "https://www.sadcaptcha.com/api/v1/license/credits?licenseKey=";
    var imageCrawlUrl = "https://www.sadcaptcha.com/api/v1/shopee-image-crawl?licenseKey=";
    var puzzleUrl = "https://www.sadcaptcha.com/api/v1/puzzle?licenseKey=";
    var API_HEADERS = new Headers({ "Content-Type": "application/json" });
    var IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR = ".DfwepB";
    var IMAGE_CRAWL_PIECE_IMAGE_SELECTOR = "#puzzleImgComponent";
    var IMAGE_CRAWL_BUTTON_SELECTOR = "#sliderContainer > div > div";
    var IMAGE_CRAWL_RESET_BUTTON = "button.CtJZAZ";
    var IMAGE_CRAWL_UNIQUE_IDENTIFIERS = ["#NEW_CAPTCHA", "#captchaMask"];
    var PUZZLE_BUTTON_SELECTOR = "aside[aria-modal=true] div[style=\"width: 40px; height: 40px; transform: translateX(0px);\"]";
    var PUZZLE_PUZZLE_IMAGE_SELECTOR = "aside[aria-modal=true] div[aria-hidden=true] > div > div > img[draggable=false]";
    var PUZZLE_PIECE_IMAGE_SELECTOR = "aside[aria-modal=true] div[aria-hidden=true] > div > div > img[draggable=true]";
    var PUZZLE_UNIQUE_IDENTIFIERS = ["aside[aria-modal=true]"];
    var CAPTCHA_PRESENCE_INDICATORS = [
        "aside[aria-modal=true] div[style=\"width: 40px; height: 40px; transform: translateX(0px);\"]",
        "#NEW_CAPTCHA",
        "#captchaMask"
    ];
    var CaptchaType;
    (function (CaptchaType) {
        CaptchaType[CaptchaType["PUZZLE"] = 0] = "PUZZLE";
        CaptchaType[CaptchaType["IMAGE_CRAWL"] = 1] = "IMAGE_CRAWL";
        CaptchaType[CaptchaType["SEMANTIC_SHAPES"] = 2] = "SEMANTIC_SHAPES";
    })(CaptchaType || (CaptchaType = {}));
    function findFirstElementToAppear(selectors) {
        return new Promise(function (resolve) {
            var observer = new MutationObserver(function (mutations) {
                var _loop_1 = function (mutation) {
                    if (mutation.addedNodes === null)
                        return "continue";
                    var addedNode = [];
                    mutation.addedNodes.forEach(function (node) { return addedNode.push(node); });
                    for (var _a = 0, addedNode_1 = addedNode; _a < addedNode_1.length; _a++) {
                        var node = addedNode_1[_a];
                        var _loop_2 = function (selector) {
                            if (node instanceof HTMLIFrameElement) {
                                var iframe_1 = node;
                                setTimeout(function () {
                                    var iframeElement = iframe_1.contentWindow.document.body.querySelector(selector);
                                    if (iframeElement) {
                                        console.debug("element matched ".concat(selector, " in iframe"));
                                        observer.disconnect();
                                        console.dir(iframeElement);
                                        return resolve(iframeElement);
                                    }
                                }, 3000);
                            }
                            else if (node instanceof Element) {
                                var element = node;
                                if (element.querySelector(selector)) {
                                    console.debug("element matched ".concat(selector));
                                    observer.disconnect();
                                    console.dir(element);
                                    return { value: resolve(element) };
                                }
                            }
                        };
                        for (var _b = 0, selectors_1 = selectors; _b < selectors_1.length; _b++) {
                            var selector = selectors_1[_b];
                            var state_2 = _loop_2(selector);
                            if (typeof state_2 === "object")
                                return state_2;
                        }
                    }
                };
                for (var _i = 0, mutations_1 = mutations; _i < mutations_1.length; _i++) {
                    var mutation = mutations_1[_i];
                    var state_1 = _loop_1(mutation);
                    if (typeof state_1 === "object")
                        return state_1.value;
                }
            });
            observer.observe(CONTAINER, {
                childList: true,
                subtree: true
            });
        });
    }
    function waitForElement(selector, iframeSelector) {
        return new Promise(function (resolve) {
            var targetDocument;
            if (iframeSelector !== undefined) {
                var iframe = document.querySelector(iframeSelector);
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
                var observer_1 = new MutationObserver(function (_) {
                    if (targetDocument.querySelector(selector)) {
                        observer_1.disconnect();
                        console.log("Selector found by mutation observer: " + selector);
                        return resolve(targetDocument.querySelector(selector));
                    }
                });
                observer_1.observe(CONTAINER, {
                    childList: true,
                    subtree: true
                });
            }
        });
    }
    function creditsApiCall() {
        return __awaiter(this, void 0, void 0, function () {
            var resp, credits;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("making api call");
                        return [4 /*yield*/, fetch(creditsUrl + getApiKey(), {
                                method: "GET",
                                headers: API_HEADERS,
                            })];
                    case 1:
                        resp = _a.sent();
                        return [4 /*yield*/, resp.json()];
                    case 2:
                        credits = (_a.sent()).credits;
                        console.log("api credits = " + credits);
                        return [2 /*return*/, credits];
                }
            });
        });
    }
    function apiCall(url, body) {
        return __awaiter(this, void 0, void 0, function () {
            var resp;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("making api call");
                        return [4 /*yield*/, fetch(url + getApiKey(), {
                                method: "POST",
                                headers: API_HEADERS,
                                body: JSON.stringify(body)
                            })];
                    case 1:
                        resp = _a.sent();
                        console.log("got api response:");
                        console.log(resp);
                        return [2 /*return*/, resp];
                }
            });
        });
    }
    function imageCrawlApiCall(requestBody) {
        return __awaiter(this, void 0, void 0, function () {
            var resp, pixelsFromSliderOrigin;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, apiCall(imageCrawlUrl, requestBody)];
                    case 1:
                        resp = _a.sent();
                        return [4 /*yield*/, resp.json()];
                    case 2:
                        pixelsFromSliderOrigin = (_a.sent()).pixelsFromSliderOrigin;
                        console.log("pixels from slider origin = " + pixelsFromSliderOrigin);
                        return [2 /*return*/, pixelsFromSliderOrigin];
                }
            });
        });
    }
    function puzzleApiCall(puzzleB64, pieceB64) {
        return __awaiter(this, void 0, void 0, function () {
            var resp, slideXProportion;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, apiCall(puzzleUrl, {
                            puzzleImageB64: puzzleB64,
                            pieceImageB64: pieceB64
                        })];
                    case 1:
                        resp = _a.sent();
                        return [4 /*yield*/, resp.json()];
                    case 2:
                        slideXProportion = (_a.sent()).slideXProportion;
                        console.log("slideXProportion = " + slideXProportion);
                        return [2 /*return*/, slideXProportion];
                }
            });
        });
    }
    function anySelectorInListPresent(selectors) {
        for (var _i = 0, selectors_2 = selectors; _i < selectors_2.length; _i++) {
            var selector = selectors_2[_i];
            var ele = document.querySelector(selector);
            if (ele) {
                console.log("selector ".concat(selector, " is present"));
                return true;
            }
            var iframe = document.querySelector("iframe");
            if (iframe) {
                console.log("checking for selector in iframe");
                ele = iframe.contentWindow.document.body.querySelector(selector);
                if (ele) {
                    console.log("Selector is present in iframe: " + selector);
                    return true;
                }
            }
        }
        console.log("no selector in list is present");
        return false;
    }
    function identifyCaptcha() {
        return __awaiter(this, void 0, void 0, function () {
            var i;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < 30)) return [3 /*break*/, 6];
                        if (!anySelectorInListPresent(IMAGE_CRAWL_UNIQUE_IDENTIFIERS)) return [3 /*break*/, 2];
                        console.log("image crawl detected");
                        return [2 /*return*/, CaptchaType.IMAGE_CRAWL];
                    case 2:
                        if (!anySelectorInListPresent(PUZZLE_UNIQUE_IDENTIFIERS)) return [3 /*break*/, 3];
                        console.log("puzzle detected");
                        return [2 /*return*/, CaptchaType.PUZZLE];
                    case 3: return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1000); })];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        i++;
                        return [3 /*break*/, 1];
                    case 6: throw new Error("Could not identify CaptchaType");
                }
            });
        });
    }
    function getImageSource(selector, iframeSelector) {
        return __awaiter(this, void 0, void 0, function () {
            var ele, src;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, waitForElement(selector, iframeSelector)];
                    case 1:
                        ele = _a.sent();
                        src = ele.getAttribute("src");
                        console.log("src = " + selector);
                        return [2 /*return*/, src];
                }
            });
        });
    }
    function getBase64StringFromDataURL(dataUrl) {
        var img = dataUrl.replace('data:', '').replace(/^.+,/, '');
        console.log("got b64 string from data URL");
        return img;
    }
    function mouseUp(x, y) {
        CONTAINER.dispatchEvent(new MouseEvent("mouseup", {
            bubbles: true,
            view: window,
            clientX: x,
            clientY: y
        }));
        console.log("mouse up at " + x + ", " + y);
    }
    function mouseOver(x, y) {
        var underMouse = document.elementFromPoint(x, y);
        underMouse.dispatchEvent(new MouseEvent("mouseover", {
            cancelable: true,
            bubbles: true,
            view: window,
            clientX: x,
            clientY: y
        }));
        console.log("mouse over at " + x + ", " + y);
    }
    function mouseOut(x, y) {
        var underMouse = document.elementFromPoint(x, y);
        underMouse.dispatchEvent(new MouseEvent("mouseout", {
            cancelable: true,
            bubbles: true,
            view: window,
            clientX: x,
            clientY: y
        }));
        console.log("mouse over at " + x + ", " + y);
    }
    function mouseDown(x, y) {
        var underMouse = document.elementFromPoint(x, y);
        underMouse.dispatchEvent(new MouseEvent("mousedown", {
            cancelable: true,
            bubbles: true,
            view: window,
            clientX: x,
            clientY: y
        }));
        console.log("mouse down at " + x + ", " + y);
    }
    function mouseEnterPage() {
        var width = window.innerWidth;
        var centerX = window.innerWidth / 2;
        var centerY = window.innerHeight / 2;
        CONTAINER.dispatchEvent(new MouseEvent("mouseenter", {
            bubbles: true,
            view: window,
            clientX: width,
            clientY: centerY
        }));
        CONTAINER.dispatchEvent(new MouseEvent("mouseover", {
            cancelable: true,
            bubbles: true,
            view: window,
            clientX: width,
            clientY: centerY
        }));
        for (var i = 1; i < centerX; i++) {
            try {
                mouseMove(width - i, centerY);
                mouseOver(width - i, centerY);
            }
            catch (err) {
                console.log("error moving mouse into page: ");
                console.dir(err);
            }
        }
    }
    function randomMouseMovement() {
        //let randomX = aroundX + Math.round((Math.random() * 20) - 10)
        //let randomY = aroundY + Math.round((Math.random() * 20) - 10)
        var randomX = Math.round(window.innerWidth * Math.random());
        var randomY = Math.round(window.innerHeight * Math.random());
        mouseMove(randomX, randomX);
        mouseOver(randomX, randomY);
        mouseOut(randomX, randomY);
    }
    function clickElement(selector) {
        var ele = document.querySelector(selector);
        var rect = ele.getBoundingClientRect();
        var x = rect.x;
        var y = rect.y;
        mouseMove(x, y);
        mouseOver(x, y);
        ele.dispatchEvent(new PointerEvent("click", {
            pointerType: "mouse",
            cancelable: true,
            bubbles: true,
            view: window,
            clientX: x,
            clientY: y
        }));
    }
    function mouseMove(x, y, ele) {
        var c;
        if (ele === undefined) {
            c = CONTAINER;
        }
        else {
            c = ele;
        }
        c.dispatchEvent(new PointerEvent("mousemove", {
            pointerType: "mouse",
            cancelable: true,
            bubbles: true,
            view: window,
            clientX: x,
            clientY: y
        }));
        console.log("moved mouse to " + x + ", " + y);
    }
    function getElementCenter(element) {
        var rect = element.getBoundingClientRect();
        var center = {
            x: rect.x + (rect.width / 2),
            y: rect.y + (rect.height / 2),
        };
        console.log("element center: ");
        console.dir(center);
        return center;
    }
    function getElementWidth(element) {
        var rect = element.getBoundingClientRect();
        console.log("element width: " + rect.width);
        return rect.width;
    }
    function computePuzzleSlideDistance(proportionX, puzzleImageEle) {
        var distance = puzzleImageEle.getBoundingClientRect().width * proportionX;
        console.log("puzzle slide distance = " + distance);
        return distance;
    }
    function refreshImageCrawl() {
        return __awaiter(this, void 0, void 0, function () {
            var puzzleImageSrcOriginal;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getImageSource(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR)];
                    case 1:
                        puzzleImageSrcOriginal = _a.sent();
                        clickElement(IMAGE_CRAWL_RESET_BUTTON);
                        _a.label = 2;
                    case 2: return [4 /*yield*/, getImageSource(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR)];
                    case 3:
                        if (!((_a.sent()) === puzzleImageSrcOriginal)) return [3 /*break*/, 5];
                        console.log("waiting for refresh...");
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 100); })];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 2];
                    case 5:
                        console.log("refresh complete");
                        return [2 /*return*/];
                }
            });
        });
    }
    function generateNaturalApproach(start, end, steps) {
        var control1 = {
            x: start.x + (end.x - start.x) * (0.2 + Math.random() * 0.2),
            y: start.y + (Math.random() * 15 - 5)
        };
        var control2 = {
            x: start.x + (end.x - start.x) * (0.6 + Math.random() * 0.2),
            y: end.y + (Math.random() * 10 - 5)
        };
        var points = [];
        for (var i = 0; i <= steps; i++) {
            var t = i / steps;
            var x = Math.pow(1 - t, 3) * start.x +
                3 * Math.pow(1 - t, 2) * t * control1.x +
                3 * (1 - t) * Math.pow(t, 2) * control2.x +
                Math.pow(t, 3) * end.x;
            var y = Math.pow(1 - t, 3) * start.y +
                3 * Math.pow(1 - t, 2) * t * control1.y +
                3 * (1 - t) * Math.pow(t, 2) * control2.y +
                Math.pow(t, 3) * end.y;
            points.push({ x: x, y: y });
        }
        return points;
    }
    function moveMouseTo(x, y) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                CONTAINER.dispatchEvent(new MouseEvent("mousemove", {
                    bubbles: true,
                    view: window,
                    clientX: x,
                    clientY: y
                }));
                console.log("moved mouse to " + x + ", " + y);
                return [2 /*return*/];
            });
        });
    }
    function mouseApproach(x, y) {
        return __awaiter(this, void 0, void 0, function () {
            var approachStartX, approachStartY, approachPoints, _i, approachPoints_1, point;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        approachStartX = x - 80 - Math.random() * 40;
                        approachStartY = y + 40 + Math.random() * 30;
                        approachPoints = generateNaturalApproach({ x: approachStartX, y: approachStartY }, { x: x, y: y }, 8 + Math.floor(Math.random() * 4));
                        _i = 0, approachPoints_1 = approachPoints;
                        _a.label = 1;
                    case 1:
                        if (!(_i < approachPoints_1.length)) return [3 /*break*/, 4];
                        point = approachPoints_1[_i];
                        moveMouseTo(point.x, point.y);
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 15 + Math.random() * 25); })];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: 
                    // Hover on handle with slight jitter
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 200 + Math.random() * 150); })];
                    case 5:
                        // Hover on handle with slight jitter
                        _a.sent();
                        moveMouseTo(x + (Math.random() * 1.5 - 0.75), y + (Math.random() * 1.5 - 0.75));
                        return [2 /*return*/];
                }
            });
        });
    }
    function solveImageCrawl() {
        return __awaiter(this, void 0, void 0, function () {
            var puzzleImageSrc, pieceImageSrc, puzzleImg, pieceImg, slideButtonEle, startX, startY, puzzleEle, trajectory, solution, currentX, currentY, solutionDistanceBackwards, _loop_3, pixel, holdTime, veryFinalX, veryFinalY;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mouseEnterPage();
                        return [4 /*yield*/, refreshImageCrawl()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 500); })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, getImageSource(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR)];
                    case 3:
                        puzzleImageSrc = _a.sent();
                        return [4 /*yield*/, getImageSource(IMAGE_CRAWL_PIECE_IMAGE_SELECTOR)];
                    case 4:
                        pieceImageSrc = _a.sent();
                        puzzleImg = getBase64StringFromDataURL(puzzleImageSrc);
                        pieceImg = getBase64StringFromDataURL(pieceImageSrc);
                        slideButtonEle = document.querySelector(IMAGE_CRAWL_BUTTON_SELECTOR);
                        startX = getElementCenter(slideButtonEle).x;
                        startY = getElementCenter(slideButtonEle).y;
                        puzzleEle = document.querySelector(IMAGE_CRAWL_PUZZLE_IMAGE_SELECTOR);
                        mouseApproach(startX, startY);
                        // Press down after a natural delay
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 350 + Math.random() * 200); })];
                    case 5:
                        // Press down after a natural delay
                        _a.sent();
                        return [4 /*yield*/, getSlidePieceTrajectory(slideButtonEle, puzzleEle)];
                    case 6:
                        trajectory = _a.sent();
                        return [4 /*yield*/, imageCrawlApiCall({
                                piece_image_b64: pieceImg,
                                puzzle_image_b64: puzzleImg,
                                slide_piece_trajectory: trajectory
                            })];
                    case 7:
                        solution = _a.sent();
                        currentX = getElementCenter(slideButtonEle).x;
                        currentY = getElementCenter(slideButtonEle).y;
                        solutionDistanceBackwards = currentX - startX - solution;
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 100); })];
                    case 8:
                        _a.sent();
                        _loop_3 = function (pixel) {
                            var nextX, nextY, pauseTime;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        nextX = currentX - pixel;
                                        nextY = currentY - Math.log(pixel + 1);
                                        mouseMove(nextX, nextY);
                                        mouseOver(nextX, nextY);
                                        pauseTime = (200 / (pixel + 1)) + (Math.random() * 5);
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, pauseTime); })];
                                    case 1:
                                        _b.sent();
                                        return [2 /*return*/];
                                }
                            });
                        };
                        pixel = 0;
                        _a.label = 9;
                    case 9:
                        if (!(pixel < solutionDistanceBackwards)) return [3 /*break*/, 12];
                        return [5 /*yield**/, _loop_3(pixel)];
                    case 10:
                        _a.sent();
                        _a.label = 11;
                    case 11:
                        pixel += 1;
                        return [3 /*break*/, 9];
                    case 12:
                        holdTime = 1000 + Math.random() * 3000;
                        console.log("Holding at final position for ".concat(Math.round(holdTime), "ms"));
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, holdTime); })];
                    case 13:
                        _a.sent();
                        veryFinalX = startX + solution + (Math.random() * 0.3 - 0.15);
                        veryFinalY = currentY + (Math.random() * 0.3 - 0.15);
                        moveMouseTo(veryFinalX, veryFinalY);
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 50 + Math.random() * 30); })];
                    case 14:
                        _a.sent();
                        mouseMove(startX + solution, startY);
                        mouseUp(startX + solution, startY);
                        return [2 /*return*/];
                }
            });
        });
    }
    function getSlidePieceTrajectory(slideButton, puzzle) {
        return __awaiter(this, void 0, void 0, function () {
            var sliderPieceContainer, slideBarWidth, timesPieceDidNotMove, slideButtonCenter, puzzleImageBoundingBox, trajectory, mouseStep, numSegments, _loop_4, pixel, state_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sliderPieceContainer = document.querySelector(IMAGE_CRAWL_PIECE_IMAGE_SELECTOR);
                        console.log("got slider piece container");
                        slideBarWidth = getElementWidth(puzzle);
                        console.log("slide bar width: " + slideBarWidth);
                        timesPieceDidNotMove = 0;
                        slideButtonCenter = getElementCenter(slideButton);
                        puzzleImageBoundingBox = puzzle.getBoundingClientRect();
                        trajectory = [];
                        mouseStep = 3;
                        mouseDown(slideButtonCenter.x, slideButtonCenter.y);
                        slideButton.dispatchEvent(new MouseEvent("mousedown", {
                            cancelable: true,
                            bubbles: true,
                            view: window,
                            clientX: slideButtonCenter.x,
                            clientY: slideButtonCenter.y
                        }));
                        numSegments = 4;
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 180 + Math.random() * 120); })];
                    case 1:
                        _a.sent();
                        _loop_4 = function (pixel) {
                            var nextX, nextY, tremorX, tremorY, pauseTime, trajectoryElement;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        nextX = slideButtonCenter.x + pixel;
                                        nextY = slideButtonCenter.y - Math.log(pixel + 1);
                                        if (!(Math.random() > 0.9)) return [3 /*break*/, 2];
                                        tremorX = nextX + (Math.random() * 0.6 - 0.3);
                                        tremorY = nextY + (Math.random() * 0.6 - 0.3);
                                        moveMouseTo(tremorX, tremorY);
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, Math.random() * 500); })];
                                    case 1:
                                        _b.sent();
                                        moveMouseTo(nextX, nextY);
                                        _b.label = 2;
                                    case 2:
                                        pauseTime = (200 / (pixel + 1)) + (Math.random() * 5);
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, pauseTime); })];
                                    case 3:
                                        _b.sent();
                                        //moveMouseTo(slideButtonCenter.x + pixel, slideButtonCenter.y - pixel)
                                        slideButton.dispatchEvent(new MouseEvent("mousemove", {
                                            cancelable: true,
                                            bubbles: true,
                                            view: window,
                                            clientX: nextX,
                                            clientY: nextY
                                        }));
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 10); })];
                                    case 4:
                                        _b.sent();
                                        trajectoryElement = getTrajectoryElement(pixel, puzzleImageBoundingBox, sliderPieceContainer);
                                        trajectory.push(trajectoryElement);
                                        if (trajectory.length < 100 / mouseStep)
                                            return [2 /*return*/, "continue"];
                                        if (pieceIsNotMoving(trajectory))
                                            timesPieceDidNotMove++;
                                        else
                                            timesPieceDidNotMove = 0;
                                        if (timesPieceDidNotMove >= 10 / mouseStep)
                                            return [2 /*return*/, "break"];
                                        console.log("trajectory element:");
                                        console.dir(trajectoryElement);
                                        return [2 /*return*/];
                                }
                            });
                        };
                        pixel = 0;
                        _a.label = 2;
                    case 2:
                        if (!(pixel < slideBarWidth * 0.85)) return [3 /*break*/, 5];
                        return [5 /*yield**/, _loop_4(pixel)];
                    case 3:
                        state_3 = _a.sent();
                        if (state_3 === "break")
                            return [3 /*break*/, 5];
                        _a.label = 4;
                    case 4:
                        pixel += mouseStep;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, trajectory];
                }
            });
        });
    }
    function getTrajectoryElement(currentSliderPixel, largeImgBoundingBox, sliderPiece) {
        var sliderPieceStyle = sliderPiece.getAttribute("style");
        var rotateAngle = rotateAngleFromStyle(sliderPieceStyle);
        var pieceCenter = getElementCenter(sliderPiece);
        var pieceCenterProp = xyToProportionalPoint(largeImgBoundingBox, pieceCenter); // This returns undefined
        var ele = {
            piece_center: pieceCenterProp,
            piece_rotation_angle: rotateAngle,
            pixels_from_slider_origin: currentSliderPixel
        };
        console.dir(ele);
        return ele;
    }
    function rotateAngleFromStyle(style) {
        var rotateRegex = /.*rotate\(|deg.*/gi;
        var rotateAngle;
        if (style.search(rotateRegex) === -1) {
            rotateAngle = 0;
        }
        else {
            var rotateStr = style.replace(rotateRegex, "");
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
        var xInContainer = point.x - container.x;
        var yInContainer = point.y - container.y;
        return {
            proportionX: xInContainer / container.width,
            proportionY: yInContainer / container.height,
        };
    }
    function solvePuzzle() {
        return __awaiter(this, void 0, void 0, function () {
            var sliderButton, buttonCenter, preRequestSlidePixels, i, puzzleSrc, pieceSrc, puzzleImg, pieceImg, solution, puzzleImageEle, distance, currentX, currentY, i;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                    case 1:
                        _a.sent();
                        sliderButton = document.querySelector(PUZZLE_BUTTON_SELECTOR);
                        buttonCenter = getElementCenter(sliderButton);
                        preRequestSlidePixels = 10;
                        mouseEnterPage();
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 133.7); })];
                    case 2:
                        _a.sent();
                        mouseMove(buttonCenter.x, buttonCenter.y);
                        mouseOver(buttonCenter.x, buttonCenter.y);
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 133.7); })];
                    case 3:
                        _a.sent();
                        mouseDown(buttonCenter.x, buttonCenter.y);
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 133.7); })];
                    case 4:
                        _a.sent();
                        i = 1;
                        _a.label = 5;
                    case 5:
                        if (!(i < preRequestSlidePixels)) return [3 /*break*/, 8];
                        mouseMove(buttonCenter.x + i, buttonCenter.y - Math.log(i) + Math.random() * 3);
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, Math.random() * 5 + 10); })];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7:
                        i++;
                        return [3 /*break*/, 5];
                    case 8: return [4 /*yield*/, getImageSource(PUZZLE_PUZZLE_IMAGE_SELECTOR)];
                    case 9:
                        puzzleSrc = _a.sent();
                        return [4 /*yield*/, getImageSource(PUZZLE_PIECE_IMAGE_SELECTOR)];
                    case 10:
                        pieceSrc = _a.sent();
                        console.log("got image sources");
                        puzzleImg = getBase64StringFromDataURL(puzzleSrc);
                        pieceImg = getBase64StringFromDataURL(pieceSrc);
                        console.log("converted image sources to b64 string");
                        return [4 /*yield*/, puzzleApiCall(puzzleImg, pieceImg)];
                    case 11:
                        solution = _a.sent();
                        console.log("got API result: " + solution);
                        puzzleImageEle = document.querySelector(PUZZLE_PUZZLE_IMAGE_SELECTOR);
                        distance = computePuzzleSlideDistance(solution, puzzleImageEle);
                        i = 1;
                        _a.label = 12;
                    case 12:
                        if (!(i < distance - preRequestSlidePixels)) return [3 /*break*/, 15];
                        currentX = buttonCenter.x + i + preRequestSlidePixels;
                        currentY = buttonCenter.y - Math.log(i) + Math.random() * 3;
                        mouseMove(currentX, currentY);
                        mouseOver(currentX, currentY);
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, Math.random() * 5 + 10); })];
                    case 13:
                        _a.sent();
                        _a.label = 14;
                    case 14:
                        i += Math.random() * 5;
                        return [3 /*break*/, 12];
                    case 15: return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 133.7); })];
                    case 16:
                        _a.sent();
                        mouseOver(buttonCenter.x + distance, buttonCenter.x - distance);
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 133.7); })];
                    case 17:
                        _a.sent();
                        mouseUp(buttonCenter.x + distance, buttonCenter.x - distance);
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 3000); })];
                    case 18:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }
    function captchaIsPresent() {
        for (var i = 0; i < CAPTCHA_PRESENCE_INDICATORS.length; i++) {
            if (document.querySelector(CAPTCHA_PRESENCE_INDICATORS[i])) {
                console.log("captcha present based on selector: " + CAPTCHA_PRESENCE_INDICATORS[i]);
                return true;
            }
        }
        console.log("captcha not present");
        return false;
    }
    var isCurrentSolve = false;
    function solveCaptchaLoop() {
        return __awaiter(this, void 0, void 0, function () {
            var captchaType, err_1, e_1, _a, err_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!isCurrentSolve) return [3 /*break*/, 21];
                        if (!captchaIsPresent()) return [3 /*break*/, 1];
                        console.log("captcha detected by css selector");
                        return [3 /*break*/, 3];
                    case 1:
                        console.log("waiting for captcha");
                        return [4 /*yield*/, findFirstElementToAppear(CAPTCHA_PRESENCE_INDICATORS)];
                    case 2:
                        _b.sent();
                        console.log("captcha detected by mutation observer");
                        _b.label = 3;
                    case 3:
                        isCurrentSolve = true;
                        captchaType = void 0;
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 6, , 8]);
                        return [4 /*yield*/, identifyCaptcha()];
                    case 5:
                        captchaType = _b.sent();
                        return [3 /*break*/, 8];
                    case 6:
                        err_1 = _b.sent();
                        console.log("could not detect captcha type. restarting captcha loop");
                        isCurrentSolve = false;
                        return [4 /*yield*/, solveCaptchaLoop()];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 8:
                        _b.trys.push([8, 10, , 11]);
                        return [4 /*yield*/, creditsApiCall()];
                    case 9:
                        if ((_b.sent()) <= 0) {
                            console.log("out of credits");
                            alert("Out of SadCaptcha credits. Please boost your balance on sadcaptcha.com/dashboard.");
                            return [2 /*return*/];
                        }
                        return [3 /*break*/, 11];
                    case 10:
                        e_1 = _b.sent();
                        console.log("error making check credits api call");
                        console.error(e_1);
                        console.log("proceeding to attempt solution anyways");
                        return [3 /*break*/, 11];
                    case 11:
                        _b.trys.push([11, 17, 18, 21]);
                        _a = captchaType;
                        switch (_a) {
                            case CaptchaType.PUZZLE: return [3 /*break*/, 12];
                            case CaptchaType.IMAGE_CRAWL: return [3 /*break*/, 14];
                        }
                        return [3 /*break*/, 16];
                    case 12: return [4 /*yield*/, solvePuzzle()];
                    case 13:
                        _b.sent();
                        return [3 /*break*/, 16];
                    case 14: return [4 /*yield*/, solveImageCrawl()];
                    case 15:
                        _b.sent();
                        return [3 /*break*/, 16];
                    case 16: return [3 /*break*/, 21];
                    case 17:
                        err_2 = _b.sent();
                        console.log("error solving captcha");
                        console.error(err_2);
                        console.log("restarting captcha loop");
                        return [3 /*break*/, 21];
                    case 18:
                        isCurrentSolve = false;
                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 5000); })];
                    case 19:
                        _b.sent();
                        return [4 /*yield*/, solveCaptchaLoop()];
                    case 20:
                        _b.sent();
                        return [7 /*endfinally*/];
                    case 21: return [2 /*return*/];
                }
            });
        });
    }
    solveCaptchaLoop();
})();
