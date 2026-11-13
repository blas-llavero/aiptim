"use strict";
const KEY = "aiptimRecords";
let queue = Promise.resolve();
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
async function mutate(message) {
  const data = await chrome.storage.local.get(KEY);
  const records = Array.isArray(data[KEY]) ? data[KEY] : [];
  if (message.type === "AIPTIM_LAST") {
    const found = records.findLast(r => r.url === safeUrl(message.url));
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
    const r = records.find(r => r.id === message.id);
    if (!r) return { error: "Unknown prompt" };
    const ms = Number(message.ms) || 0;
    if (ms < 0 || ms > 30000) return { error: "Invalid increment" };
    const key = message.category === "waiting" ? "waitingMs" : "readingMs";
    r[key] += Math.round(ms);
    const newUrl = safeUrl(message.url);
    if (newUrl) r.url = newUrl;
    await chrome.storage.local.set({ [KEY]: records });
    return { ok: true };
  }
  return { error: "Unknown operation" };
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!allowed(sender) || !message || typeof message.type !== "string" ||
      !message.type.startsWith("AIPTIM_")) return false;
  const action = queue.then(() => mutate(message));
  queue = action.catch(() => {});
  action.then(respond).catch(error => respond({ error: String(error) }));
  return true;
});
