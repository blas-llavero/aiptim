"use strict";
(() => {
  if (window.__aiptimInjected) return;
  window.__aiptimInjected = true;
  const IDLE_MS = 90000;
  let currentUrl = location.origin + location.pathname;
  let seenNodes = new WeakSet();
  let initialized = false;
  let lastRecordId = null;
  let lastInteraction = Date.now(), lastTick = Date.now(), lastFlush = Date.now();
  let draftWritingMs = 0, readingMs = 0, waitingMs = 0;
  let paused = false, capturedText = "", capturedAt = 0, scheduled = null;
  let observedBucketMs = 0, observedConversation = null;
  function canonicalConversation() {
    const match = location.pathname.match(/(?:^|\/)c\/([a-z0-9_-]{8,})(?:\/|$)/i);
    if (!match || !["chatgpt.com", "chat.openai.com"].includes(location.hostname))
      return null;
    return "https://chatgpt.com/c/" + match[1].toLowerCase();
  }
  function flushObserved() {
    if (observedConversation && observedBucketMs > 0) {
      chrome.runtime.sendMessage({
        type: "AIPTIM_CONVERSATION_TICK",
        url: observedConversation,
        ms: Math.min(10000, Math.round(observedBucketMs))
      }).catch(() => {});
    }
    observedBucketMs = 0;
    observedConversation = canonicalConversation();
  }
  const chatUrl = () => location.origin + location.pathname;
  function composer() {
    return document.querySelector("#prompt-textarea") ||
      document.querySelector('[data-testid="composer-text-input"]') ||
      document.querySelector('div[contenteditable="true"][role="textbox"]') ||
      document.querySelector("textarea[placeholder]");
  }
  function getText(node) {
    return node ? (typeof node.value === "string" ? node.value :
      node.innerText || node.textContent || "").trim() : "";
  }
  function composerFocused() {
    const field = composer();
    return Boolean(field && document.activeElement &&
      (field === document.activeElement || field.contains(document.activeElement)));
  }
  const generating = () => Boolean(document.querySelector(
    'button[data-testid="stop-button"],button[aria-label*="Stop generating"],button[aria-label*="Stop streaming"]'
  ));
  ["pointerdown","scroll","keydown","input","touchstart"].forEach(type =>
    document.addEventListener(type, () => { lastInteraction = Date.now(); },
      { capture:true, passive:true })
  );
  async function lastInChat() {
    try {
      const r = await chrome.runtime.sendMessage({ type:"AIPTIM_LAST", url:chatUrl() });
      if (!lastRecordId && r && r.id) lastRecordId = r.id;
    } catch { /* extension may be reloading */ }
  }
  function flush() {
    if (!paused && lastRecordId) {
      for (const [category,ms] of [["reading",readingMs],["waiting",waitingMs]]) {
        if (ms > 0) chrome.runtime.sendMessage({
          type:"AIPTIM_TICK", id:lastRecordId, category, ms, url:chatUrl()
        }).catch(() => {});
      }
    }
    readingMs = 0; waitingMs = 0; lastFlush = Date.now();
    flushObserved();
  }
  async function capture(rawText) {
    if (paused) return;
    const text = String(rawText || "").trim().slice(0,10000);
    if (!text || (text === capturedText && Date.now() - capturedAt < 10000)) return;
    flush();
    capturedText = text; capturedAt = Date.now();
    const writingMs = draftWritingMs;
    draftWritingMs = 0;
    lastRecordId = null;
    try {
      const r = await chrome.runtime.sendMessage({
        type:"AIPTIM_ADD", text, writingMs, url:chatUrl(),
        chatTitle:document.title.replace(/\s*[-–|]\s*ChatGPT\s*$/, "")
      });
      if (r && r.id) lastRecordId = r.id;
    } catch { /* do not interfere with ChatGPT sending */ }
  }
  function scan() {
    if (chatUrl() !== currentUrl) {
      const veryRecentSubmit = Date.now() - capturedAt < 15000;
      if (!veryRecentSubmit) lastRecordId = null;
      currentUrl = chatUrl();
      // Do not mark newly added nodes as old after a new-chat navigation.
      seenNodes = new WeakSet();
      initialized = false;
      if (!veryRecentSubmit) lastInChat();
    }
    const nodes = [...document.querySelectorAll('[data-message-author-role="user"]')];
    if (!initialized) {
      nodes.forEach(node => seenNodes.add(node));
      initialized = true;
      return;
    }
    for (const node of nodes) {
      if (seenNodes.has(node)) continue;
      seenNodes.add(node);
      const text = getText(node);
      if (text && !(text === capturedText && Date.now() - capturedAt < 10000))
        capture(text);
    }
  }
  function scheduleScan() {
    if (scheduled) return;
    scheduled = setTimeout(() => { scheduled = null; scan(); }, 350);
  }
  new MutationObserver(scheduleScan).observe(document.documentElement,
    { childList:true, subtree:true });
  scan();
  lastInChat();
  document.addEventListener("submit", event => {
    const field = composer();
    if (field && event.target && event.target.contains(field))
      capture(getText(field));
  }, true);
  document.addEventListener("click", event => {
    const btn = event.target && event.target.closest && event.target.closest("button");
    if (!btn) return;
    const label = [btn.getAttribute("aria-label"),btn.getAttribute("data-testid"),
      btn.getAttribute("title")].filter(Boolean).join(" ").toLowerCase();
    if (/(send-button|send prompt|send message|send chat|enviar|envoyer)/.test(label))
      capture(getText(composer()));
  }, true);
  document.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey &&
        !event.altKey && !event.isComposing && composerFocused())
      scheduleScan();
  }, true);
  chrome.storage.local.get("aiptimPaused").then(data => {
    paused = Boolean(data.aiptimPaused);
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.aiptimPaused) {
      if (!paused) flush();
      paused = Boolean(changes.aiptimPaused.newValue);
    }
  });
  setInterval(() => {
    const now = Date.now(), delta = Math.max(0,Math.min(now-lastTick,2000));
    lastTick = now;
    if (observedConversation !== canonicalConversation()) flushObserved();
    if (!paused && document.visibilityState === "visible" &&
        document.hasFocus() && now-lastInteraction <= IDLE_MS) {
      // Per-conversation activity is independent of prompt detection. We keep
      // these totals separate to avoid counting a prompt twice.
      if (canonicalConversation()) {
        observedConversation = canonicalConversation();
        observedBucketMs += delta;
      }
      if (composerFocused() && getText(composer())) draftWritingMs += delta;
      else if (lastRecordId) {
        if (generating()) waitingMs += delta;
        else readingMs += delta;
      }
    }
    if (now - lastFlush >= 5000) flush();
    if (chatUrl() !== currentUrl) scheduleScan();
  }, 1000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") flush();
  });
  window.addEventListener("pagehide", flush);
  window.addEventListener("blur", flush);
})();
