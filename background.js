var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const DEBUGGER_VERSION = "1.3";
const ATTACHED_TABS_KEY = "attachedTabs";
const IDLE_ALARM = "sadcaptcha-idle-check";
const IDLE_DETACH_MS = 120000;
const TIMESTAMP_WRITE_INTERVAL_MS = 5000;
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
            if (/already attached/i.test(err.message || "")) {
                return resolve();
            }
            return reject(new Error(err.message));
        });
    });
}
function detachDebugger(tabId) {
    return new Promise(resolve => {
        chrome.debugger.detach({ tabId: tabId }, () => {
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
    });
}
function release(tabId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!debuggerIsAvailable())
            return;
        yield detachDebugger(tabId);
        yield markDetached(tabId);
    });
}
function dispatchMouse(tabId, params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield acquire(tabId);
        yield sendCommand(tabId, "Input.dispatchMouseEvent", params);
        yield touchAttached(tabId);
    });
}
function dispatchMouseBatch(tabId, list) {
    return __awaiter(this, void 0, void 0, function* () {
        yield acquire(tabId);
        const SAMPLE_SPACING_S = 0.002;
        const now = Date.now() / 1000;
        let pending = [];
        for (let i = 0; i < list.length; i++) {
            let params = Object.assign({}, list[i], {
                timestamp: now - (list.length - 1 - i) * SAMPLE_SPACING_S
            });
            pending.push(sendCommand(tabId, "Input.dispatchMouseEvent", params));
        }
        yield pending[0];
        Promise.all(pending).catch(() => { });
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
            case "mouseBatch":
                yield dispatchMouseBatch(tabId, message.batch);
                return { ok: true };
            default:
                throw new Error("unknown input message: " + message.sadCaptchaInput);
        }
    });
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    var _a;
    if (message === null || message === undefined || message.sadCaptchaInput === undefined) {
        return false;
    }
    let tabId = (_a = sender.tab) === null || _a === void 0 ? void 0 : _a.id;
    if (tabId === undefined) {
        sendResponse({ ok: false, error: "message did not originate from a tab" });
        return false;
    }
    handleMessage(message, tabId)
        .then(sendResponse)
        .catch(err => {
        sendResponse({ ok: false, error: String(err) });
    });
    return true;
});
function detachIdleTabs() {
    return __awaiter(this, void 0, void 0, function* () {
        let tabs = yield getAttachedTabs();
        let now = Date.now();
        for (const tabId of Object.keys(tabs)) {
            if (now - tabs[tabId] < IDLE_DETACH_MS)
                continue;
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
