# AIPTIM Development Roadmap

This roadmap describes intended work, **not features already implemented**.

## Stage 1 — Project foundation

- [x] Create the public GitHub repository.
- [x] Publish an initial English README with the Android APK download location and installation guidance.
- [ ] Choose and add a compatible free/open-source software license.
- [ ] Select project architecture, package/application identifiers, and supported Android versions.
- [ ] Set up a test workflow and CI for source code.
- [ ] Define a local-first data model for projects, topics, prompts, conversations, recorded time, and related-question groups.

## Stage 2 — Android MVP

- [ ] Create a Kotlin/Jetpack Compose application with adaptive layouts and correct system navigation bar insets.
- [ ] Create projects and topics, start/pause/stop active timers, and edit recorded time.
- [ ] Store records locally in Room.
- [ ] Show project totals and a time-by-topic bar chart.
- [ ] Support configurable time budgets and notifications.
- [ ] Prepare a signed or clearly labeled test APK through GitHub Actions.

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
