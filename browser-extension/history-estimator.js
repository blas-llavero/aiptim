"use strict";
// Pure functions shared by the service worker and Node tests.
// Browser history has navigation timestamps, NOT dwell or prompt timestamps.
globalThis.AiptimHistory = (() => {
  const DEFAULT_DWELL_MS = 2 * 60 * 1000;
  const MAX_BOUNDED_GAP_MS = 5 * 60 * 1000;

  function canonicalConversation(raw) {
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" ||
          !["chatgpt.com", "chat.openai.com"].includes(url.hostname)) return null;
      // ChatGPT conversations are /c/<id>, also inside /g/<custom-gpt>/c/<id>.
      const match = url.pathname.match(/(?:^|\/)c\/([a-z0-9_-]{8,})(?:\/|$)/i);
      if (!match) return null;
      return "https://chatgpt.com/c/" + match[1].toLowerCase();
    } catch { return null; }
  }
  function safeTitle(text) {
    const title = String(text || "").trim()
      .replace(/\s*[|–—-]\s*ChatGPT\s*$/i, "")
      .replace(/\s+/g, " ").slice(0, 140);
    return title && !/^chatgpt$|^new chat$|^chat$/i.test(title) ?
      title : "Untitled ChatGPT conversation";
  }
  function normalizeVisit(item) {
    const url = canonicalConversation(item.url);
    const time = Number(item.time);
    if (!url || !Number.isFinite(time) || time <= 0) return null;
    return {
      key: String(item.key || (url + "@" + time)),
      url, time,
      title: safeTitle(item.title),
      isLocal: item.isLocal !== false
    };
  }
  function estimate(items, options = {}) {
    const cutoff = Number(options.cutoff) || Number.POSITIVE_INFINITY;
    const visits = [...new Map(
      (items || []).map(normalizeVisit).filter(Boolean).map(v => [v.key, v])
    ).values()].sort((a,b) => a.time - b.time);
    const byUrl = new Map();
    // AIPTIM observes this device after installation. Only earlier local
    // visits, and remotely synced visits, become historical estimates.
    const eligible = visits.filter(v => !v.isLocal || v.time < cutoff);
    for (let i = 0; i < eligible.length; i++) {
      const visit = eligible[i];
      const next = eligible[i + 1];
      // A gap to the next visited ChatGPT URL is only a weak bounding signal:
      // navigation timestamps cannot prove the tab stayed visible.
      const diff = next && next.time > visit.time ? next.time - visit.time : Infinity;
      const bounded = diff >= 1000 && diff <= MAX_BOUNDED_GAP_MS;
      const guessedMs = bounded ? diff : DEFAULT_DWELL_MS;
      const existing = byUrl.get(visit.url) || {
        url: visit.url, title: visit.title, visits: 0, estimatedMs: 0,
        boundedVisits: 0, assumedVisits: 0, syncedVisits: 0,
        firstVisit: visit.time, lastVisit: visit.time,
        confidence: "low", source: "chrome-history-estimate"
      };
      existing.visits++;
      existing.estimatedMs += guessedMs;
      if (bounded) existing.boundedVisits++;
      else existing.assumedVisits++;
      if (!visit.isLocal) existing.syncedVisits++;
      existing.firstVisit = Math.min(existing.firstVisit, visit.time);
      existing.lastVisit = Math.max(existing.lastVisit, visit.time);
      if (visit.title !== "Untitled ChatGPT conversation") existing.title = visit.title;
      byUrl.set(visit.url, existing);
    }
    return [...byUrl.values()].sort((a,b) => b.estimatedMs - a.estimatedMs);
  }
  return { canonicalConversation, safeTitle, normalizeVisit, estimate,
    DEFAULT_DWELL_MS, MAX_BOUNDED_GAP_MS };
})();
