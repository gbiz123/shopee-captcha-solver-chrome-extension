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

console.log("service worker loaded")

const DEBUGGER_VERSION = "1.3"
const ATTACHED_TABS_KEY = "attachedTabs"
const IDLE_ALARM = "sadcaptcha-idle-check"
const IDLE_DETACH_MS = 120_000
const TIMESTAMP_WRITE_INTERVAL_MS = 5_000

type AttachedTabs = { [tabId: string]: number }

type InputMessage = {
	sadCaptchaInput: "acquire" | "release" | "mouse"
	params?: any
}

/*
	* The set of tabs we hold a debugger session on lives in session storage
	* rather than a module variable, because the service worker can be torn down
	* mid-solve while the attachment itself survives. Without this we would lose
	* track of an attached tab and leave its infobar up indefinitely.
*/
async function getAttachedTabs(): Promise<AttachedTabs> {
	let stored = await chrome.storage.session.get(ATTACHED_TABS_KEY)
	return (stored[ATTACHED_TABS_KEY] as AttachedTabs) || {}
}

async function setAttachedTabs(tabs: AttachedTabs): Promise<void> {
	await chrome.storage.session.set({ [ATTACHED_TABS_KEY]: tabs })
}

async function markAttached(tabId: number): Promise<void> {
	let tabs = await getAttachedTabs()
	tabs[String(tabId)] = Date.now()
	await setAttachedTabs(tabs)
}

async function markDetached(tabId: number): Promise<void> {
	let tabs = await getAttachedTabs()
	delete tabs[String(tabId)]
	await setAttachedTabs(tabs)
}

async function touchAttached(tabId: number): Promise<void> {
	let tabs = await getAttachedTabs()
	let last = tabs[String(tabId)]
	if (last !== undefined && Date.now() - last < TIMESTAMP_WRITE_INTERVAL_MS)
		return
	tabs[String(tabId)] = Date.now()
	await setAttachedTabs(tabs)
}

function debuggerIsAvailable(): boolean {
	return typeof chrome !== "undefined" && chrome.debugger !== undefined
}

function attachDebugger(tabId: number): Promise<void> {
	return new Promise((resolve, reject) => {
		chrome.debugger.attach({ tabId: tabId }, DEBUGGER_VERSION, () => {
			let err = chrome.runtime.lastError
			if (err === undefined) {
				return resolve()
			}
			/*
				* Chrome reports the same "already attached" error whether the
				* session is ours (service worker restarted, attachment survived)
				* or DevTools has the tab. Treat it as success here; if it was
				* DevTools, the first sendCommand fails and the content script
				* falls back to synthetic events.
			*/
			if (/already attached/i.test(err.message || "")) {
				console.log("debugger already attached to tab " + tabId)
				return resolve()
			}
			return reject(new Error(err.message))
		})
	})
}

function detachDebugger(tabId: number): Promise<void> {
	return new Promise(resolve => {
		chrome.debugger.detach({ tabId: tabId }, () => {
			// Nothing actionable if this fails: the tab is gone or was never ours.
			let err = chrome.runtime.lastError
			if (err !== undefined)
				console.log("detach from tab " + tabId + " failed: " + err.message)
			resolve()
		})
	})
}

function sendCommand(tabId: number, method: string, params: { [key: string]: unknown }): Promise<any> {
	return new Promise((resolve, reject) => {
		chrome.debugger.sendCommand({ tabId: tabId }, method, params, result => {
			let err = chrome.runtime.lastError
			if (err !== undefined)
				return reject(new Error(err.message))
			return resolve(result)
		})
	})
}

async function acquire(tabId: number): Promise<void> {
	if (!debuggerIsAvailable())
		throw new Error("chrome.debugger is not available in this browser")
	let tabs = await getAttachedTabs()
	if (tabs[String(tabId)] !== undefined) {
		await touchAttached(tabId)
		return
	}
	await attachDebugger(tabId)
	await markAttached(tabId)
	console.log("attached debugger to tab " + tabId)
}

async function release(tabId: number): Promise<void> {
	if (!debuggerIsAvailable())
		return
	await detachDebugger(tabId)
	await markDetached(tabId)
	console.log("released debugger on tab " + tabId)
}

async function dispatchMouse(tabId: number, params: { [key: string]: unknown }): Promise<void> {
	await acquire(tabId)
	await sendCommand(tabId, "Input.dispatchMouseEvent", params)
	await touchAttached(tabId)
}

async function handleMessage(message: InputMessage, tabId: number): Promise<any> {
	switch (message.sadCaptchaInput) {
		case "acquire":
			await acquire(tabId)
			return { ok: true }
		case "release":
			await release(tabId)
			return { ok: true }
		case "mouse":
			await dispatchMouse(tabId, message.params)
			return { ok: true }
		default:
			throw new Error("unknown input message: " + message.sadCaptchaInput)
	}
}

chrome.runtime.onMessage.addListener((message: InputMessage, sender, sendResponse) => {
	console.log("message received")
	if (message === null || message === undefined || message.sadCaptchaInput === undefined) {
		console.log("condition was met: message === null || message === undefined || message.sadCaptchaInput === undefined")
		console.log("unable to handle input message")
		return false
	}
	let tabId = sender.tab?.id
	if (tabId === undefined) {
		console.log("sender.tab.id was undefined - message did not originate from a tab" )
		sendResponse({ ok: false, error: "message did not originate from a tab" })
		return false
	}
	handleMessage(message, tabId)
		.then(sendResponse)
		.catch(err => {
			console.log("input request failed: " + err)
			sendResponse({ ok: false, error: String(err) })
		})
	// Keep the message channel open for the async response.
	console.log("message handled")
	return true
})

/*
	* A solve that throws before releasing, or a service worker killed mid-solve,
	* would otherwise leave the infobar up on the tab forever.
*/
async function detachIdleTabs(): Promise<void> {
	let tabs = await getAttachedTabs()
	let now = Date.now()
	for (const tabId of Object.keys(tabs)) {
		if (now - tabs[tabId] < IDLE_DETACH_MS)
			continue
		console.log("detaching idle tab " + tabId)
		await detachDebugger(Number(tabId))
		delete tabs[tabId]
	}
	await setAttachedTabs(tabs)
}

chrome.alarms.create(IDLE_ALARM, { periodInMinutes: 1 })

chrome.alarms.onAlarm.addListener(alarm => {
	if (alarm.name === IDLE_ALARM)
		detachIdleTabs()
})

if (debuggerIsAvailable()) {
	chrome.debugger.onDetach.addListener(source => {
		if (source.tabId !== undefined)
			markDetached(source.tabId)
	})
}

chrome.tabs.onRemoved.addListener(tabId => {
	markDetached(tabId)
})
