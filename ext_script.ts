const sendApiKey = document.getElementById("sendApiKey")!

interface Response {
	message: string,
	success: number
}

async function sendApiKeyToContentScript() {
	const apiKeyInput = <HTMLInputElement>document.getElementById("apiKeyInput")!
	const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
	if (apiKeyInput !== null) {
		const apiKey: string = apiKeyInput.value
		let tabId = tab.id
		if (tabId !== undefined) {
			const response: Response = await chrome.tabs.sendMessage(tabId, { apiKey: apiKey });
			if (response.success === 1) {
				alert("API key set successfully. Now, captchas will be solved automatically.")
			} else {
				alert("Something went wrong: " + response.message)
			}
		} else {
		}
	} else {
	}
}

sendApiKey.addEventListener("click", sendApiKeyToContentScript)
