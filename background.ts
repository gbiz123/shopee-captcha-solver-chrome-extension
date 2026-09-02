

const DEBUGGER_VERSION = "1.3"
const ATTACHED_TABS_KEY = "attachedTabs"
const IDLE_ALARM = "sadcaptcha-idle-check"
const IDLE_DETACH_MS = 120_000
const TIMESTAMP_WRITE_INTERVAL_MS = 5_000

type AttachedTabs = { [tabId: string]: number }

type InputMessage = {
	sadCaptchaInput: "acquire" | "release" | "mouse" | "mouseBatch"
	params?: any
	batch?: Array<{ [key: string]: unknown }>
}

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

			if (/already attached/i.test(err.message || "")) {
				return resolve()
			}
			return reject(new Error(err.message))
		})
	})
}

function detachDebugger(tabId: number): Promise<void> {
	return new Promise(resolve => {
		chrome.debugger.detach({ tabId: tabId }, () => {
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
}

async function release(tabId: number): Promise<void> {
	if (!debuggerIsAvailable())
		return
	await detachDebugger(tabId)
	await markDetached(tabId)
}

async function dispatchMouse(tabId: number, params: { [key: string]: unknown }): Promise<void> {
	await acquire(tabId)
	await sendCommand(tabId, "Input.dispatchMouseEvent", params)
	await touchAttached(tabId)
}

async function dispatchMouseBatch(tabId: number,
		list: Array<{ [key: string]: unknown }>): Promise<void> {
	await acquire(tabId)

	const SAMPLE_SPACING_S = 0.002
	const now = Date.now() / 1000
	let pending: Array<Promise<any>> = []
	for (let i = 0; i < list.length; i++) {
		let params = Object.assign({}, list[i], {
			timestamp: now - (list.length - 1 - i) * SAMPLE_SPACING_S
		})
		pending.push(sendCommand(tabId, "Input.dispatchMouseEvent", params))
	}

	await pending[0]
	Promise.all(pending).catch(() => { })
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
		case "mouseBatch":
			await dispatchMouseBatch(tabId, message.batch as Array<{ [key: string]: unknown }>)
			return { ok: true }
		default:
			throw new Error("unknown input message: " + message.sadCaptchaInput)
	}
}

chrome.runtime.onMessage.addListener((message: InputMessage, sender, sendResponse) => {
	if (message === null || message === undefined || message.sadCaptchaInput === undefined) {
		return false
	}
	let tabId = sender.tab?.id
	if (tabId === undefined) {
		sendResponse({ ok: false, error: "message did not originate from a tab" })
		return false
	}
	handleMessage(message, tabId)
		.then(sendResponse)
		.catch(err => {
			sendResponse({ ok: false, error: String(err) })
		})

	return true
})

async function detachIdleTabs(): Promise<void> {
	let tabs = await getAttachedTabs()
	let now = Date.now()
	for (const tabId of Object.keys(tabs)) {
		if (now - tabs[tabId] < IDLE_DETACH_MS)
			continue

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
