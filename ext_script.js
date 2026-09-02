var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const sendApiKey = document.getElementById("sendApiKey");
function sendApiKeyToContentScript() {
    return __awaiter(this, void 0, void 0, function* () {
        const apiKeyInput = document.getElementById("apiKeyInput");
        const [tab] = yield chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (apiKeyInput !== null) {
            const apiKey = apiKeyInput.value;
            let tabId = tab.id;
            if (tabId !== undefined) {
                const response = yield chrome.tabs.sendMessage(tabId, { apiKey: apiKey });
                if (response.success === 1) {
                    alert("API key set successfully. Now, captchas will be solved automatically.");
                }
                else {
                    alert("Something went wrong: " + response.message);
                }
            }
            else {
            }
        }
        else {
        }
    });
}
sendApiKey.addEventListener("click", sendApiKeyToContentScript);
