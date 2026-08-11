"use strict";
/*
    * Trusted input dispatcher.
    *
    * Events built in the content script with `new MouseEvent(...)` and
    * dispatchEvent() always have isTrusted === false. There is no way to change
    * that from page or content script context. The DevTools protocol is the only
    * supported path from an extension to input that the browser itself marks as
    * trusted: Input.dispatchMouseEvent is injected below the DOM, into the same
    * pipeline a real mouse feeds, so the page cannot distinguish it.
    *
    * The cost is that Chrome shows a "started debugging this browser" infobar for
    * as long as we stay attached, so we attach when a solve begins and detach as
    * soon as it finishes. chrome.debugger does not exist in Firefox; there the
    * content script falls back to synthetic events on its own.
*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
console.log("service worker loaded");
const DEBUGGER_VERSION = "1.3";
const ATTACHED_TABS_KEY = "attachedTabs";
const IDLE_ALARM = "sadcaptcha-idle-check";
const IDLE_DETACH_MS = 120000;
const TIMESTAMP_WRITE_INTERVAL_MS = 5000;
/*
    * The set of tabs we hold a debugger session on lives in session storage
    * rather than a module variable, because the service worker can be torn down
    * mid-solve while the attachment itself survives. Without this we would lose
    * track of an attached tab and leave its infobar up indefinitely.
*/
function getAttachedTabs() {
    return __awaiter(this, void 0, void 0, function* () {
        let stored = yield chrome.storage.session.get(ATTACHED_TABS_KEY);
        return stored[ATTACHED_TABS_KEY] || {};
    });
}
function setAttachedTabs(tabs) {
    return __awaiter(this, void 0, void 0, function* () {
        yield chrome.storage.session.set({ [ATTACHED_TABS_KEY]: tabs });
    });
}
function markAttached(tabId) {
    return __awaiter(this, void 0, void 0, function* () {
        let tabs = yield getAttachedTabs();
        tabs[String(tabId)] = Date.now();
        yield setAttachedTabs(tabs);
    });
}
function markDetached(tabId) {
    return __awaiter(this, void 0, void 0, function* () {
        let tabs = yield getAttachedTabs();
        delete tabs[String(tabId)];
        yield setAttachedTabs(tabs);
    });
}
function touchAttached(tabId) {
    return __awaiter(this, void 0, void 0, function* () {
        let tabs = yield getAttachedTabs();
        let last = tabs[String(tabId)];
        if (last !== undefined && Date.now() - last < TIMESTAMP_WRITE_INTERVAL_MS)
            return;
        tabs[String(tabId)] = Date.now();
        yield setAttachedTabs(tabs);
    });
}
function debuggerIsAvailable() {
    return typeof chrome !== "undefined" && chrome.debugger !== undefined;
}
function attachDebugger(tabId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.attach({ tabId: tabId }, DEBUGGER_VERSION, () => {
            let err = chrome.runtime.lastError;
            if (err === undefined) {
                return resolve();
            }
            /*
                * Chrome reports the same "already attached" error whether the
                * session is ours (service worker restarted, attachment survived)
                * or DevTools has the tab. Treat it as success here; if it was
                * DevTools, the first sendCommand fails and the content script
                * falls back to synthetic events.
            */
            if (/already attached/i.test(err.message || "")) {
                console.log("debugger already attached to tab " + tabId);
                return resolve();
            }
            return reject(new Error(err.message));
        });
    });
}
function detachDebugger(tabId) {
    return new Promise(resolve => {
        chrome.debugger.detach({ tabId: tabId }, () => {
            // Nothing actionable if this fails: the tab is gone or was never ours.
            let err = chrome.runtime.lastError;
            if (err !== undefined)
                console.log("detach from tab " + tabId + " failed: " + err.message);
            resolve();
        });
    });
}
function sendCommand(tabId, method, params) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId: tabId }, method, params, result => {
            let err = chrome.runtime.lastError;
            if (err !== undefined)
                return reject(new Error(err.message));
            return resolve(result);
        });
    });
}
function acquire(tabId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!debuggerIsAvailable())
            throw new Error("chrome.debugger is not available in this browser");
        let tabs = yield getAttachedTabs();
        if (tabs[String(tabId)] !== undefined) {
            yield touchAttached(tabId);
            return;
        }
        yield attachDebugger(tabId);
        yield markAttached(tabId);
        console.log("attached debugger to tab " + tabId);
    });
}
function release(tabId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!debuggerIsAvailable())
            return;
        yield detachDebugger(tabId);
        yield markDetached(tabId);
        console.log("released debugger on tab " + tabId);
    });
}
function dispatchMouse(tabId, params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield acquire(tabId);
        yield sendCommand(tabId, "Input.dispatchMouseEvent", params);
        yield touchAttached(tabId);
    });
}
function handleMessage(message, tabId) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (message.sadCaptchaInput) {
            case "acquire":
                yield acquire(tabId);
                return { ok: true };
            case "release":
                yield release(tabId);
                return { ok: true };
            case "mouse":
                yield dispatchMouse(tabId, message.params);
                return { ok: true };
            default:
                throw new Error("unknown input message: " + message.sadCaptchaInput);
        }
    });
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    var _a;
    console.log("message received");
    if (message === null || message === undefined || message.sadCaptchaInput === undefined) {
        console.log("condition was met: message === null || message === undefined || message.sadCaptchaInput === undefined");
        console.log("unable to handle input message");
        return false;
    }
    let tabId = (_a = sender.tab) === null || _a === void 0 ? void 0 : _a.id;
    if (tabId === undefined) {
        console.log("sender.tab.id was undefined - message did not originate from a tab");
        sendResponse({ ok: false, error: "message did not originate from a tab" });
        return false;
    }
    handleMessage(message, tabId)
        .then(sendResponse)
        .catch(err => {
        console.log("input request failed: " + err);
        sendResponse({ ok: false, error: String(err) });
    });
    // Keep the message channel open for the async response.
    console.log("message handled");
    return true;
});
/*
    * A solve that throws before releasing, or a service worker killed mid-solve,
    * would otherwise leave the infobar up on the tab forever.
*/
function detachIdleTabs() {
    return __awaiter(this, void 0, void 0, function* () {
        let tabs = yield getAttachedTabs();
        let now = Date.now();
        for (const tabId of Object.keys(tabs)) {
            if (now - tabs[tabId] < IDLE_DETACH_MS)
                continue;
            console.log("detaching idle tab " + tabId);
            yield detachDebugger(Number(tabId));
            delete tabs[tabId];
        }
        yield setAttachedTabs(tabs);
    });
}
chrome.alarms.create(IDLE_ALARM, { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === IDLE_ALARM)
        detachIdleTabs();
});
if (debuggerIsAvailable()) {
    chrome.debugger.onDetach.addListener(source => {
        if (source.tabId !== undefined)
            markDetached(source.tabId);
    });
}
chrome.tabs.onRemoved.addListener(tabId => {
    markDetached(tabId);
});
//# sourceMappingURL=background.js.map