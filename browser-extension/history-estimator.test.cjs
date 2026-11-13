"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
require("./history-estimator.js");
const {canonicalConversation, estimate} = globalThis.AiptimHistory;
test("recognizes canonical ChatGPT conversation paths and removes query data", () => {
  assert.equal(canonicalConversation("https://chatgpt.com/c/abc12345?secret=1"),
    "https://chatgpt.com/c/abc12345");
  assert.equal(canonicalConversation("https://chat.openai.com/g/g-test/c/ABCabc123"),
    "https://chatgpt.com/c/abcabc123");
  assert.equal(canonicalConversation("https://chatgpt.com/"), null);
  assert.equal(canonicalConversation("https://evil.example/c/12345678"), null);
  assert.equal(canonicalConversation("http://chatgpt.com/c/12345678"), null);
});
test("estimates historical activity conservatively and keeps separate conversations", () => {
  const t = 1_700_000_000_000;
  const result = estimate([
    {url:"https://chatgpt.com/c/aaaa1111",time:t,title:"Project A - ChatGPT"},
    {url:"https://chatgpt.com/c/bbbb2222",time:t+60_000,title:"Project B"},
    {url:"https://chatgpt.com/c/bbbb2222",time:t+86_400_000,title:"Project B"}
  ],{cutoff:t+100_000_000});
  assert.equal(result.length,2);
  assert.equal(result.find(r=>r.url.endsWith("aaaa1111")).estimatedMs,60_000);
  assert.equal(result.find(r=>r.url.endsWith("bbbb2222")).estimatedMs,240_000);
  assert.ok(result.every(r=>r.confidence==="low"));
});
test("avoids double counting local visits after tracking begins", () => {
  const t = 1_700_000_000_000;
  const result = estimate([
    {url:"https://chatgpt.com/c/aaaa1111",time:t-300_000,isLocal:true},
    {url:"https://chatgpt.com/c/aaaa1111",time:t+300_000,isLocal:true},
    {url:"https://chatgpt.com/c/bbbb2222",time:t+400_000,isLocal:false}
  ],{cutoff:t});
  assert.equal(result.reduce((sum,r)=>sum+r.visits,0),2);
  assert.equal(result.find(r=>r.url.endsWith("aaaa1111")).visits,1);
  assert.equal(result.find(r=>r.url.endsWith("bbbb2222")).syncedVisits,1);
});
test("rejects malformed URLs and duplicates visits with equal keys", () => {
  const t = 1_700_000_000_000;
  assert.equal(estimate([
    {url:"https://chatgpt.com/share/abcdefgh",time:t},
    {url:"https://chatgpt.com/c/aaaa1111",time:t,key:"same"},
    {url:"https://chatgpt.com/c/aaaa1111",time:t,key:"same"}
  ]).reduce((sum,r)=>sum+r.visits,0),1);
});
