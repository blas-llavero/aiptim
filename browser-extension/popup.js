"use strict";
const el = id => document.getElementById(id);
let prompts = [], history = [], observed = {}, historyMeta = null;
const format = ms => {
  const min = Math.round((Number(ms)||0)/60000);
  return min >= 60 ? Math.floor(min/60)+" h "+(min%60)+" min" : min+" min";
};
function canonical(raw) {
  try {
    const u = new URL(raw);
    const match = u.pathname.match(/(?:^|\/)c\/([a-z0-9_-]{8,})(?:\/|$)/i);
    if (!match || !["chatgpt.com","chat.openai.com"].includes(u.hostname)) return null;
    return "https://chatgpt.com/c/"+match[1].toLowerCase();
  } catch { return null; }
}
function render() {
  const map = new Map();
  for (const h of history) map.set(h.url, {
    url:h.url,title:h.title,estimatedMs:h.estimatedMs||0,visits:h.visits||0,
    observedMs:0,confidence:"low"
  });
  for (const [url, activity] of Object.entries(observed)) {
    if (!map.has(url)) map.set(url,{
      url,title:"ChatGPT conversation",estimatedMs:0,visits:0,observedMs:0
    });
    map.get(url).observedMs = activity.observedMs||0;
  }
  for (const prompt of prompts) {
    const url = canonical(prompt.url);
    if (!url) continue;
    if (!map.has(url)) map.set(url,{
      url,title:prompt.chatTitle||"ChatGPT conversation",
      estimatedMs:0,visits:0,observedMs:0
    });
    const record = map.get(url);
    if (prompt.chatTitle && prompt.chatTitle !== "ChatGPT")
      record.title = prompt.chatTitle;
  }
  const items = [...map.values()].sort((a,b) =>
    (b.observedMs+b.estimatedMs)-(a.observedMs+a.estimatedMs));
  el("total").textContent = format(items.reduce((sum,r)=>sum+r.observedMs,0));
  el("count").textContent = String(items.length);
  const query = el("search").value.toLocaleLowerCase();
  el("list").replaceChildren();
  const matches = items.filter(r => (r.title+" "+r.url).toLocaleLowerCase()
    .includes(query)).slice(0,35);
  if (!matches.length) {
    const p=document.createElement("p");
    p.textContent="No conversations found yet. Open ChatGPT or enable history access.";
    el("list").append(p);
  }
  for (const r of matches) {
    const article=document.createElement("article");
    const a=document.createElement("a");
    a.href=r.url;a.target="_blank";a.rel="noopener noreferrer";
    a.textContent=r.title||"ChatGPT conversation";
    const detail=document.createElement("p");
    detail.textContent="Observed: "+format(r.observedMs)+
      " · Historical estimate (low confidence): "+format(r.estimatedMs)+
      " · Visits: "+r.visits;
    article.append(a,detail);el("list").append(article);
  }
  el("historyStatus").textContent=historyMeta ?
    "Last scan: "+new Date(historyMeta.scannedAt).toLocaleString()+
    (historyMeta.truncated ? " · Partial history" : "") : "Not scanned";
}
async function load() {
  const data=await chrome.storage.local.get([
    "aiptimRecords","aiptimPaused","aiptimHistoryConversations",
    "aiptimObservedConversations","aiptimHistoryMeta"
  ]);
  prompts=Array.isArray(data.aiptimRecords)?data.aiptimRecords:[];
  history=Array.isArray(data.aiptimHistoryConversations)?
    data.aiptimHistoryConversations:[];
  observed=data.aiptimObservedConversations||{};
  historyMeta=data.aiptimHistoryMeta||null;
  el("pause").checked=Boolean(data.aiptimPaused);
  const granted=await chrome.permissions.contains({permissions:["history"]});
  el("enableHistory").textContent=granted?"Refresh history now":"Enable automatic history";
  render();
}
el("search").addEventListener("input",render);
el("pause").addEventListener("change",async e=>{
  await chrome.storage.local.set({aiptimPaused:e.target.checked});
  el("status").textContent=e.target.checked?"Paused":"Tracking enabled";
});
el("enableHistory").addEventListener("click",async ()=>{
  const granted=await chrome.permissions.contains({permissions:["history"]}) ||
    await chrome.permissions.request({permissions:["history"]});
  if (!granted) {
    el("historyStatus").textContent="History access declined";
    return;
  }
  el("historyStatus").textContent="Scanning Chrome history…";
  const result=await chrome.runtime.sendMessage({type:"AIPTIM_HISTORY_SCAN"});
  if (result.error) el("historyStatus").textContent=result.error;
  else await load();
});
el("export").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify({
    schemaVersion:2,generator:"AIPTIM browser extension",
    exportedAt:new Date().toISOString(),
    records:prompts,historyConversations:history,observedConversations:observed
  },null,2)],{type:"application/json"});
  const href=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=href;a.download="aiptim-local-backup.json";
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(href),1000);
});
el("clear").addEventListener("click",async ()=>{
  if (!confirm("Delete all AIPTIM local prompt, history estimate, and activity records?")) return;
  await chrome.storage.local.remove([
    "aiptimRecords","aiptimHistoryConversations","aiptimObservedConversations",
    "aiptimHistoryMeta","aiptimHistoryCutoff"
  ]);
  await load();el("status").textContent="Local records deleted";
});
chrome.storage.onChanged.addListener((changes,area)=>{
  if (area==="local" && [
    "aiptimRecords","aiptimHistoryConversations","aiptimObservedConversations",
    "aiptimHistoryMeta"
  ].some(key=>changes[key])) load().catch(()=>{});
});
load().catch(e=>el("status").textContent="Error: "+e.message);
