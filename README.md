# AIPTIM — AI Prompt Time Manager

**Track your prompts. Organize your knowledge. Manage your time.**

AIPTIM is a **free and open-source Android app under active development**, with a desktop web app and browser extension planned for measuring active time spent working with AI prompts, organizing ChatGPT/OpenAI conversations by project and topic, finding similar questions, and maintaining an offline knowledge library.

> **Project status: Android manual-timer MVP source available (v0.1.0).** GitHub Actions is configured to compile a debug APK; check the Actions page for the latest build result. No official release APK, web app, browser extension, or automatic ChatGPT prompt monitoring is available yet.
>
> **Independent project.** AIPTIM is not developed by, affiliated with, endorsed by, or sponsored by OpenAI.

## Android APK — download and installation

**APK download location (once published):** [GitHub Releases](https://github.com/blas-llavero/aiptim/releases).

There is **no official APK release yet**. GitHub Actions is configured to build a **debug test APK**; availability depends on a successful workflow run. Do not download an APK claiming to be AIPTIM from an unverified third-party site.

### Install the APK on Android (when a release becomes available)

1. On your Android phone or tablet, open the [AIPTIM Releases page](https://github.com/blas-llavero/aiptim/releases).
2. Open the latest release and download its `.apk` file from **Assets**.
3. Open the downloaded APK from your browser or file manager.
4. If Android requests permission, allow **Install unknown apps** **only for the app you used to open the APK**.
5. Confirm the installation and open **AIPTIM**.
6. Review the permissions requested by the app. Afterwards, you may disable the temporary **Install unknown apps** permission.

The APK's exact filename, minimum Android version, and package ID will be documented when the first build is available. Test builds appear as temporary [GitHub Actions artifacts](https://github.com/blas-llavero/aiptim/actions) after a successful build.

### Install a GitHub Actions test APK (when the build is green)

1. Open [Android debug APK workflow runs](https://github.com/blas-llavero/aiptim/actions/workflows/android-debug.yml).
2. Select a **successful** run on the `main` branch.
3. Under **Artifacts**, select **aiptim-android-debug-apk**.
4. Download the ZIP, extract `app-debug.apk`, and transfer it to your Android device if needed.
5. Open `app-debug.apk` on Android and follow the Android installation instructions above.

Test APKs are debug-signed and are **not** production releases. GitHub may require you to sign in to download Actions artifacts; artifacts are temporary and expire. The test build can be installed on Android 8.0 (API 26) or newer.

### Build the Android app yourself

Open this repository in Android Studio with JDK 17, Android SDK 35 and Gradle 8.11.1 installed, or run `gradle :app:assembleDebug` from the repository root. The CI workflow installs the dependencies and runs unit tests automatically. This initial repository uses a pinned Gradle version in CI rather than a Gradle Wrapper.

### Use the Android app (current MVP)

1. Tap **Add project** and enter a name.
2. Select the project and tap **Add prompt**.
3. Give the prompt a title. Optionally paste the URL of a ChatGPT conversation and set a time limit in minutes.
4. Tap **Start / Resume** when you begin working on that prompt, and **Pause** when you finish. Only one timer can run at a time.
5. Switch to **Analytics** to see totals by project. Project data and timers are saved locally, including across app restarts.
6. If the elapsed time exceeds the chosen limit, the prompt is marked **Limit exceeded** in the app; background notifications are **not implemented yet**.

**Accuracy warning:** the manual timer uses wall-clock time and continues to count until you pause it, even when the Android app is in the background. It cannot detect if you were actually reading, typing, or idle. Automatic prompt-level monitoring will need a separate browser integration or explicit permitted mechanism.

**Important:** the official ChatGPT Android app does not provide AIPTIM with a built-in, per-prompt timing feed. Accurate per-prompt monitoring requires a supported integration or user-initiated workflow; device-level app usage statistics alone cannot distinguish individual prompts.

## Web app — desktop use

The browser-based web app will support project dashboards, topic folders, interactive charts, offline reading, and a searchable local library. A companion **open-source browser extension** is planned for supported ChatGPT/OpenAI web interfaces to measure *active work time* more precisely. The extension will require explicit installation and user permission.

**Web app URL:** not published yet. This README will link to the live app after deployment.

## Planned capabilities

| Capability | Planned behavior |
| --- | --- |
| Per-prompt timers | Distinguish active editing/reading, response waiting, and idle time where technically possible |
| Total time by project | Aggregate separately measured sessions, including prompts grouped by related topics |
| Similar-question discovery | Suggest related prior prompts and links to their saved answers |
| Historical ChatGPT import | Import supported user-provided export files; imported timestamps **do not establish historical time spent** |
| Offline knowledge library | Save conversations in folders with searchable text, math rendering, and compatible images and charts |
| Interactive visualization | Use open-source rendering libraries; some original interactive content may not be reproducible offline |
| Time limits | Custom thresholds for prompts, groups, and projects, with Android notifications |
| Wearable notifications | Show mirrored phone alerts on compatible devices, including Fitbit Charge 6 where notification settings allow |
| Privacy | Local-first processing; no commercial AI API or mandatory cloud account |
| Accessibility | Screen-reader-friendly controls, accessible text, subtitles, and optional voice narration |
| Multilingual UI | English by default plus nine additional languages |

### Languages (planned)

English (`en`), Catalan (`ca`), Spanish (`es`), French (`fr`), German (`de`), Italian (`it`), Portuguese (`pt`), Simplified Chinese (`zh-CN`), Japanese (`ja`), and Hindi (`hi`). The app will use the device language when supported, with English as fallback.

### How time is counted

- **New activity:** measured prospectively by timers or explicit user-permitted integrations.
- **Imported chat history:** dates and messages may be recoverable, but **accurate historical work time is not**. Any estimate must be clearly labeled.
- **Idle time:** should be excluded when it can be detected reliably; users can edit recorded sessions.
- **Project total:** based on recorded session durations, not merely how long a browser tab remained open.

## Implementation and proposed architecture

- **Android MVP implemented:** Kotlin, Jetpack Compose, SQLiteOpenHelper for local persistence, responsive Compose UI with Android system-bar insets. A later Room migration and Android notifications are planned.
- **Web:** TypeScript, React, Vite, progressive web app (PWA), IndexedDB for offline data.
- **Extension:** Chromium Manifest V3 initially; evaluate additional browsers later.
- **Content:** portable Markdown plus structured metadata, KaTeX for math, and a free/open-source charting library for compatible interactive views.
- **Transfer:** user-controlled export/import between devices first; optional private synchronization only after the security model has been reviewed.

All chosen dependencies and media must have licenses compatible with a free/open-source distribution.

## Intro videos, images, and audio

Planned: introductory videos of **30 seconds or less**, one per supported language, with natural-sounding voices generated using suitable free/open-source tools and accessible subtitles/narration.

**Review gate:** no image, logo, audio file, or video will be added to this repository until the project owner has reviewed and approved that specific asset. This repository currently contains no approved media assets.

## Roadmap

See [Development roadmap](docs/ROADMAP.md).

## License

AIPTIM source code is released under the [MIT License](LICENSE). Third-party dependencies keep their respective licenses.

## Credits

**Conceived and programmed by Blas Llavero.**

AIPTIM is an independent project and is not an official OpenAI or ChatGPT product.
