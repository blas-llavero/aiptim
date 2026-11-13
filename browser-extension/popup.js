"use strict";
const el = id => document.getElementById(id);
let records = [];
const format = ms => {
  const min = Math.round(ms / 60000);
  return min >= 60 ? Math.floor(min / 60) + " h " + min % 60 + " min" : min + " min";
};
function render() {
  const total = records.reduce((sum,r) => sum + (r.writingMs || 0) +
    (r.readingMs || 0) + (r.waitingMs || 0),0);
  el("total").textContent = format(total);
  el("count").textContent = String(records.length);
  const query = el("search").value.toLocaleLowerCase();
  const filtered = records.filter(r =>
    (r.text || "").toLocaleLowerCase().includes(query) ||
    (r.chatTitle || "").toLocaleLowerCase().includes(query)
  ).slice().reverse().slice(0, 25);
  el("list").replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.textContent = "No matching prompts. Send a question at chatgpt.com to begin.";
    el("list").append(empty);
  }
  for (const r of filtered) {
    const article = document.createElement("article");
    const a = document.createElement("a");
    a.href = r.url; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.textContent = (r.text || "").slice(0,90) || "(untitled)";
    const desc = document.createElement("p");
    desc.textContent = "Writing: " + format(r.writingMs || 0) +
      " · Reading: " + format(r.readingMs || 0) +
      " · Waiting: " + format(r.waitingMs || 0);
    const date = document.createElement("small");
    date.textContent = (r.chatTitle || "ChatGPT") + " · " +
      new Date(r.createdAt).toLocaleString();
    article.append(a,desc,date); el("list").append(article);
  }
}
async function load() {
  const data = await chrome.storage.local.get(["aiptimRecords","aiptimPaused"]);
  records = Array.isArray(data.aiptimRecords) ? data.aiptimRecords : [];
  el("pause").checked = Boolean(data.aiptimPaused);
  render();
}
el("search").addEventListener("input",render);
el("pause").addEventListener("change",async event => {
  await chrome.storage.local.set({aiptimPaused:event.target.checked});
  el("status").textContent = event.target.checked ? "Paused" : "Tracking enabled";
});
el("export").addEventListener("click",() => {
  const data = {schemaVersion:1,generator:"AIPTIM browser extension",
    exportedAt:new Date().toISOString(),records};
  const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href; a.download = "aiptim-prompts-" + new Date().toISOString().slice(0,10) + ".json";
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href),1000);
});
el("clear").addEventListener("click",async () => {
  if (!window.confirm("Delete all local prompt records? This cannot be undone.")) return;
  await chrome.storage.local.set({aiptimRecords:[]});
  records = [];render();el("status").textContent = "Local records deleted";
});
chrome.storage.onChanged.addListener((changes,area) => {
  if (area === "local" && changes.aiptimRecords) {
    records = Array.isArray(changes.aiptimRecords.newValue) ?
      changes.aiptimRecords.newValue : [];
    render();
  }
});
load().catch(error => el("status").textContent = "Storage error: " + error.message);
