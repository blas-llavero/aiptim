# AIPTIM Development Roadmap

This roadmap distinguishes **implemented source code**, configured CI, and future work. A successful APK build must be verified separately in GitHub Actions.

## Stage 1 — Project foundation

- [x] Create the public GitHub repository.
- [x] Publish an initial English README with the Android APK download location and installation guidance.
- [x] Add an MIT free/open-source software license.
- [x] Select Android MVP architecture, package ID (`com.blasllavero.aiptim`), and Android 8+ minimum.
- [x] Add GitHub Actions workflow for unit tests and debug APK (build result to be verified).
- [x] Define initial SQLite tables for projects, prompts, time totals, and optional conversation links.\n- [ ] Add topic and related-question group model.

## Stage 2 — Android MVP

- [x] Create a Kotlin/Jetpack Compose project with safe-area-aware layout.
- [x] Create projects and prompts; start/pause/resume manual timers.\n- [ ] Add topics, session editing, and idle-time detection.
- [x] Persist records in local SQLite (initial implementation).\n- [ ] Assess a later Room migration without losing data.
- [x] Show totals and comparative progress bars by project.\n- [ ] Add topic-based interactive charts.
- [x] Allow a per-prompt minute limit and show an in-app exceeded state.\n- [ ] Implement notifications in background and wearable forwarding.
- [x] Configure a clearly labeled, debug-signed APK upload as a temporary GitHub Actions artifact.\n- [ ] Confirm a successful CI run and install-test the resulting APK.

## Stage 3 — Web application and browser extension

- [ ] Create a React/TypeScript PWA with IndexedDB-backed local storage.
- [ ] Provide searchable folders, interactive statistics, and offline reading.
- [ ] Investigate permitted browser-extension integration on supported ChatGPT/OpenAI web pages.
- [ ] Distinguish active editing, reading, waiting for a response, and idle periods where possible.
- [ ] Keep browser permissions narrow and document precisely what data is read.

## Stage 4 — Import and knowledge organization

- [ ] Accept supported user-provided ChatGPT exports.
- [ ] Preserve titles, messages, original timestamps, and available links without inventing missing time metadata.
- [ ] Provide manual and local-model-assisted topic grouping, including review of similar prompts.
- [ ] Render Markdown and math formulas while preserving references to external media.
- [ ] Investigate portable representations of compatible interactive charts.
- [ ] Implement secure user-controlled backup, export, and import.

## Stage 5 — Language, accessibility, and wearables

- [ ] Prepare English plus Catalan, Spanish, French, German, Italian, Portuguese, Simplified Chinese, Japanese, and Hindi translations.
- [ ] Detect device language, with English as fallback.
- [ ] Test screen readers, high contrast, touch targets, and navigation-bar/safe-area handling.
- [ ] Test Android notification mirroring on Fitbit Charge 6 where supported.
- [ ] Prepare short (30-second maximum) localized introduction videos with subtitles and accessible narration.

## Media approval policy

**Do not commit or upload any logo, image, video, or audio without explicit review and approval from the project owner.** Verify every dependency and media license before distribution.

## Privacy and accuracy principles

- No paid API dependency or mandatory cloud service.
- Do not claim historical prompt time can be reconstructed from exported message timestamps.
- Local-first storage; secure opt-in integrations only.
- Do not imply official endorsement by OpenAI.
