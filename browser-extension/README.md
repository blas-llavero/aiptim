# AIPTIM browser extension — automatic conversation tracking v0.3.0

AIPTIM tracks **ChatGPT conversations automatically in desktop Chrome or Edge**. It estimates earlier visits from Chrome history and observes new active sessions without needing manual exports or an OpenAI API key.

## Installation (one time)

1. Download the [AIPTIM repository](https://github.com/blas-llavero/aiptim) with **Code → Download ZIP**, and unzip it.
2. Open **chrome://extensions** or **edge://extensions**.
3. Enable **Developer mode**, select **Load unpacked**, and choose the **browser-extension** directory.
4. Reload open ChatGPT tabs.
5. Open the AIPTIM extension popup and press **Enable automatic history**. Review and approve the browser's history-access permission. This is optional, but necessary for historical estimates.

After authorization, AIPTIM scans Chrome history automatically on installation/startup and daily, as well as when you request a refresh. No manual Takeout export is required.

## How tracking works

- **Observed time:** AIPTIM records active seconds while a ChatGPT conversation tab is visible, focused, and receiving activity within a 90-second idle threshold. It does not track the official Android ChatGPT app.
- **Historical estimates:** AIPTIM reads matching ChatGPT history URLs and their visit times. It estimates two minutes for isolated visits or uses a gap to the next ChatGPT visit when that gap is 1 second to 5 minutes. **These are assumptions, not evidence of actual time spent.** All such estimates are marked **low confidence**.
- **Avoiding double-counting:** Locally recorded visits after tracking began are excluded from history estimates. Synced visits, where available, remain separately estimated; these may overlap activity from another device.
- **Conversation grouping:** The /c/<id> URL identifies a conversation. Conversation titles are used as initial labels; AI topic grouping is a future feature.
- **Prompt detection:** The previous experimental per-prompt DOM tracker remains in place, but the new per-conversation time estimate does not depend on detecting individual prompts.
- **Local storage:** All records are kept in the extension's local browser storage. No OpenAI key, third-party server, paid service, or manual export is required for the browser dashboard.

## Limitations

- Chrome's history API provides visit timestamps, **not dwell time**, and may not include every device's synced history.
- Browser UI and history retention policies can prevent some conversations being detected.
- The extension cannot read Google-account history remotely, nor the history of the official ChatGPT Android app.
- The Android APK currently does **not** synchronize the extension's records automatically. This requires a separate, consent-based synchronization design.
- The extension's **Export JSON** remains optional for backup and manual Android transfer; it is not part of normal desktop tracking.
- The Android v0.2 importer expects the older schema v1 export. The v0.3 backup uses schema v2 and needs an updated Android importer.
- Historical estimates and observed time are displayed separately; adding them together can still overestimate total time.
- Permission to access Chrome history triggers a broad browser warning even though AIPTIM filters results to ChatGPT URLs.

## Privacy

AIPTIM stores only ChatGPT conversation URLs, titles, timestamps, estimated durations, observed durations, and user prompts detected by the existing optional DOM tracking. It does not upload browsing history. Review the open-source code before installing. Remove the extension to stop monitoring; use **Delete local records** to erase saved data.

Independent MIT-licensed project, not affiliated with OpenAI.
