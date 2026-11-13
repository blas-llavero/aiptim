"use strict";
// AIPTIM uses only browser APIs, without external endpoints or cloud credentials.
importScripts("history-estimator.js");
const KEY = "aiptimRecords";
const HISTORY_KEY = "aiptimHistoryConversations";
const OBSERVED_KEY = "aiptimObservedConversations";
const HISTORY_META_KEY = "aiptimHistoryMeta";
const { canonicalConversation, estimate } = globalThis.AiptimHistory;
let queue = Promise.resolve();
let historyScan = null;
const lastHeartbeatByTab = new Map();

function allowed(sender) {
  if (!sender.tab || !sender.url) return false;
  try {
    const u = new URL(sender.url);
    return u.protocol === "https:" && (
      u.hostname === "chatgpt.com" || u.hostname === "chat.openai.com" ||
      (u.hostname === "platform.openai.com" && u.pathname.startsWith("/playground"))
    );
  } catch { return false; }
}
function safeUrl(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") return "";
    if (u.hostname === "chatgpt.com" || u.hostname === "chat.openai.com" ||
      (u.hostname === "platform.openai.com" && u.pathname.startsWith("/playground")))
      return u.origin + u.pathname;
  } catch { /* ignored */ }
  return "";
}

async function mutate(message, sender) {
  if (message.type === "AIPTIM_CONVERSATION_TICK") {
    const conversation = canonicalConversation(message.url);
    const ms = Math.round(Number(message.ms));
    if (!conversation || !Number.isFinite(ms) || ms < 1 || ms > 10000)
      return { error: "Invalid conversation activity" };
    const tab = sender.tab.id;
    const now = Date.now();
    const last = lastHeartbeatByTab.get(tab);
    // Guard against duplicate heartbeats from a misbehaving tab.
    if (last && now - last < 800) return { ok: true, ignored: true };
    lastHeartbeatByTab.set(tab, now);
    const stored = await chrome.storage.local.get(OBSERVED_KEY);
    const all = stored[OBSERVED_KEY] || {};
    const current = all[conversation] || { url: conversation, observedMs: 0, updatedAt: null };
    current.observedMs += ms;
    current.updatedAt = new Date(now).toISOString();
    all[conversation] = current;
    await chrome.storage.local.set({ [OBSERVED_KEY]: all });
    return { ok: true };
  }
  const stored = await chrome.storage.local.get(KEY);
  const records = Array.isArray(stored[KEY]) ? stored[KEY] : [];
  if (message.type === "AIPTIM_LAST") {
    const found = records.findLast(record => record.url === safeUrl(message.url));
    return { id: found ? found.id : null };
  }
  if (message.type === "AIPTIM_ADD") {
    const url = safeUrl(message.url);
    const prompt = String(message.text || "").trim().slice(0, 10000);
    if (!url || !prompt) return { error: "Invalid prompt or URL" };
    const id = crypto.randomUUID();
    records.push({
      id, url,
      chatTitle: String(message.chatTitle || "ChatGPT").slice(0, 160),
      text: prompt, createdAt: new Date().toISOString(),
      writingMs: Math.max(0, Math.min(Number(message.writingMs) || 0, 86400000)),
      readingMs: 0, waitingMs: 0,
      origin: "browser-extension", historicalTimeUnknown: false
    });
    await chrome.storage.local.set({ [KEY]: records });
    return { id };
  }
  if (message.type === "AIPTIM_TICK") {
    const record = records.find(r => r.id === message.id);
    if (!record) return { error: "Unknown prompt" };
    const ms = Number(message.ms) || 0;
    if (ms < 0 || ms > 30000) return { error: "Invalid increment" };
    const key = message.category === "waiting" ? "waitingMs" : "readingMs";
    record[key] += Math.round(ms);
    const newUrl = safeUrl(message.url);
    if (newUrl) record.url = newUrl;
    await chrome.storage.local.set({ [KEY]: records });
    return { ok: true };
  }
  return { error: "Unknown operation" };
}

async function hasHistoryAccess() {
  return chrome.permissions.contains({ permissions: ["history"] });
}

// Histories contain timestamps of visits, never end/dwell times.
// The estimator deliberately labels every number LOW CONFIDENCE.
async function doHistoryScan() {
  if (!(await hasHistoryAccess())) return { error: "History permission not granted" };
  const state = await chrome.storage.local.get(["aiptimHistoryCutoff", KEY]);
  let cutoff = Number(state.aiptimHistoryCutoff);
  if (!Number.isFinite(cutoff) || cutoff <= 0) {
    cutoff = Date.now();
    await chrome.storage.local.set({ aiptimHistoryCutoff: cutoff });
  }
  const records = Array.isArray(state[KEY]) ? state[KEY] : [];
  for (const record of records) {
    const timestamp = Date.parse(record.createdAt);
    if (Number.isFinite(timestamp) && timestamp > 0) cutoff = Math.min(cutoff, timestamp);
  }

  // Filter Chrome history queries to relevant domains. We never copy, upload,
  // or save the user's unrelated browser history.
  const searched = await Promise.all([
    chrome.history.search({ text: "chatgpt.com", startTime: 0, maxResults: 6000 }),
    chrome.history.search({ text: "chat.openai.com", startTime: 0, maxResults: 6000 })
  ]);
  const byUrl = new Map();
  for (const item of searched.flat()) {
    if (!canonicalConversation(item.url)) continue;
    byUrl.set(item.url, item);
  }
  const candidates = [...byUrl.values()].slice(0, 8000);
  const visits = [];
  // Concurrency-limited queries: respect the browser while searching old chats.
  const workers = Array.from({ length: 12 }, async (_unused, worker) => {
    for (let index = worker; index < candidates.length; index += 12) {
      const item = candidates[index];
      try {
        const results = await chrome.history.getVisits({ url: item.url });
        for (const visit of results) {
          if (!Number.isFinite(visit.visitTime) || visit.visitTime <= 0) continue;
          visits.push({
            key: item.url + "#" + visit.visitId,
            url: item.url,
            title: item.title,
            time: visit.visitTime,
            isLocal: visit.isLocal !== false
          });
        }
      } catch {
        // One inaccessible history entry must not erase the other results.
      }
    }
  });
  await Promise.all(workers);
  const summary = estimate(visits, { cutoff });
  const metadata = {
    scannedAt: new Date().toISOString(),
    cutoffAt: new Date(cutoff).toISOString(),
    conversations: summary.length,
    urlsScanned: candidates.length,
    truncated: byUrl.size > candidates.length ||
      searched.some(items => items.length >= 6000),
    estimateMethod: "2-minute assumed dwell per isolated visit; navigation gap if <=5 min",
    certainty: "low"
  };
  await chrome.storage.local.set({
    [HISTORY_KEY]: summary,
    [HISTORY_META_KEY]: metadata
  });
  return { ok: true, ...metadata };
}
function scanHistory() {
  if (!historyScan) {
    historyScan = doHistoryScan().finally(() => { historyScan = null; });
  }
  return historyScan;
}
function scheduleHistoryRefresh() {
  chrome.alarms.create("aiptimHistoryDaily", { periodInMinutes: 1440 });
}
chrome.runtime.onInstalled.addListener(() => {
  scheduleHistoryRefresh();
  hasHistoryAccess().then(enabled => { if (enabled) scanHistory().catch(() => {}); });
});
chrome.runtime.onStartup.addListener(() => {
  scheduleHistoryRefresh();
  hasHistoryAccess().then(enabled => { if (enabled) scanHistory().catch(() => {}); });
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "aiptimHistoryDaily")
    scanHistory().catch(() => {});
});
chrome.permissions.onAdded.addListener(added => {
  if (added.permissions && added.permissions.includes("history"))
    scanHistory().catch(() => {});
});
chrome.permissions.onRemoved.addListener(removed => {
  if (removed.permissions && removed.permissions.includes("history")) {
    // Keep previously derived estimates unless the user explicitly deletes.
    chrome.storage.local.set({ aiptimHistoryDisabled: true }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!message || typeof message.type !== "string") return false;
  if (message.type === "AIPTIM_HISTORY_SCAN" && sender.id === chrome.runtime.id &&
      !sender.tab) {
    scanHistory().then(respond).catch(e => respond({ error: String(e) }));
    return true;
  }
  if (!allowed(sender) || !message.type.startsWith("AIPTIM_")) return false;
  const action = queue.then(() => mutate(message, sender));
  queue = action.catch(() => {});
  action.then(respond).catch(error => respond({ error: String(error) }));
  return true;
});
