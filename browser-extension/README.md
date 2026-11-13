# AIPTIM browser extension — automatic tracking prototype

This first prototype tracks **ChatGPT in desktop Chromium browsers**, without an OpenAI API key or subscription. It does not automatically read the official ChatGPT Android app.

## Install on Chrome / Edge (desktop)

1. Download the [AIPTIM GitHub repository](https://github.com/blas-llavero/aiptim) using **Code → Download ZIP**, then extract it.
2. Open **chrome://extensions** (or **edge://extensions**).
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select the **browser-extension** folder.
5. Refresh an existing **chatgpt.com** tab.

## Automatic usage

- Send prompts normally in ChatGPT web. AIPTIM attempts to identify each newly sent prompt (send button, form submit, or message DOM).
- Writing time is measured while you type in the active prompt editor.
- Reading time is estimated while the tab is foreground and you interact with it; waiting time is separately estimated when a generation-stop button can be detected.
- Time stops accruing if the browser tab is hidden, unfocused, or has had no interaction for 90 seconds.
- Click the AIPTIM extension icon to see the records, search, pause, or **Export JSON** for Android.
- This prototype records only new prompts observed after installing the extension. It does not backfill previous conversations or know time spent in past sessions.

## Privacy and limitations

- The extension reads **only** declared ChatGPT/OpenAI Playground pages and only stores **user-submitted prompt text**, not assistant replies.
- Data is stored locally through **chrome.storage.local**; there are no extension-to-server requests. You choose whether to export.
- UI changes on ChatGPT can break prompt detection; submissions may be missed or duplicated. Review collected data before relying on it.
- Reading is an **activity-based estimate**, not gaze or proof that you read a response.
- It does **not** track the official ChatGPT Android app, or run automatically in regular mobile Chrome.
- The OpenAI Playground site has different UI patterns; its compatibility is experimental.
- The extension can be paused or removed. **Delete local records** erases its own stored activity.

## Import into AIPTIM Android

Export a JSON file from the extension and transfer it to your Android device. In AIPTIM, use **Import browser records**, select that JSON, and view your imported prompts by conversation. Importing the same exported records twice must not duplicate time.

Independent MIT-licensed open-source project; not an official OpenAI or ChatGPT product.
