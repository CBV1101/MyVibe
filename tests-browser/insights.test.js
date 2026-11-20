"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const path=require("node:path");
const url="file://"+path.resolve(__dirname,"../extension/insights.html");
let browser;
async function setup(t){
 if(!browser)browser=await chromium.launch({headless:true});
 const context=await browser.newContext();
 t.after(()=>context.close());
 const page=await context.newPage();
 await page.goto(url);
 return page;
}
test.after(async()=>browser?.close());
test("example analysis is private, visible, and reset clears results and exports",async t=>{
 const page=await setup(t);
 await page.locator("#example").click();
 assert.equal(await page.locator("#results").isVisible(),true);
 assert.equal(await page.locator("#insights-export").isVisible(),true);
 assert.equal(await page.locator("#count").textContent(),"6");
 await page.locator("#reset").click();
 assert.equal(await page.locator("#results").isVisible(),false);
 assert.equal(await page.locator("#insights-export").isVisible(),false);
});
test("late Bluesky lookup cannot replace a newer local example or reset",async t=>{
 const page=await setup(t);
 await page.evaluate(()=>{
  window.__pendingPublic=[];
  MyVibeBluesky.fetchPublicPosts=()=>new Promise((resolve,reject)=>window.__pendingPublic.push({resolve,reject}));
 });
 await page.locator("#bluesky-handle").fill("example.bsky.social");
 await page.locator("#bluesky-fetch").click();
 await page.waitForFunction(()=>window.__pendingPublic.length===1);
 await page.locator("#example").click();
 await page.evaluate(()=>window.__pendingPublic.shift().resolve({posts:[{text:"You are an idiot",date:"2026-01-01"}],profile:{did:"did:plc:example",handle:"example.bsky.social"},requests:1,hasMore:false}));
 await page.waitForTimeout(50);
 assert.equal(await page.locator("#count").textContent(),"6");
 assert.equal(await page.locator("#bluesky-source").isVisible(),false);
 await page.locator("#bluesky-fetch").click();
 await page.waitForFunction(()=>window.__pendingPublic.length===1);
 await page.locator("#reset").click();
 await page.evaluate(()=>window.__pendingPublic.shift().resolve({posts:[{text:"Keep going!"}],profile:{did:"did:plc:example",handle:"example.bsky.social"},requests:1,hasMore:false}));
 await page.waitForTimeout(50);
 assert.equal(await page.locator("#results").isVisible(),false);
});
test("local file import takes precedence over an earlier public lookup",async t=>{
 const page=await setup(t);
 await page.evaluate(()=>{window.__pendingPublic=[];MyVibeBluesky.fetchPublicPosts=()=>new Promise(resolve=>window.__pendingPublic.push(resolve));});
 await page.locator("#bluesky-handle").fill("example.bsky.social");
 await page.locator("#bluesky-fetch").click();
 await page.waitForFunction(()=>window.__pendingPublic.length===1);
 await page.locator("#archive").setInputFiles({name:"private.json",mimeType:"application/json",buffer:Buffer.from('["I disagree with that policy."]')});
 await page.waitForFunction(()=>document.querySelector("#count").textContent==="1");
 await page.evaluate(()=>window.__pendingPublic.shift()({posts:[{text:"You are an idiot"}],profile:{did:"did:plc:example",handle:"example.bsky.social"},requests:1,hasMore:false}));
 await page.waitForTimeout(50);
 assert.equal(await page.locator("#count").textContent(),"1");
 assert.equal(await page.locator("#bluesky-source").isVisible(),false);
});

test("large local archives show 100 messages at a time with search and filter",async t=>{
 const page=await setup(t);
 const rows=Array.from({length:230},(_,i)=>({text:"Entry "+i+" keep going!",date:"2026-01-01"}));
 await page.locator("#archive").setInputFiles({name:"large.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(rows))});
 await page.waitForFunction(()=>document.querySelector("#count").textContent==="230");
 assert.equal(await page.locator(".entry").count(),100);
 assert.match(await page.locator("#timeline-status").textContent(),/100 of 230/);
 await page.locator("#show-more").click();
 assert.equal(await page.locator(".entry").count(),200);
 await page.locator("#search").fill("Entry 229");
 assert.equal(await page.locator(".entry").count(),1);
 assert.equal(await page.locator("#show-more").isVisible(),false);
 await page.locator("#search").fill("");
 await page.locator("#filter").selectOption("neutral");
 assert.equal(await page.locator(".entry").count(),0);
});
test("exports exclude message bodies unless explicitly selected",async t=>{
 const page=await setup(t);
 await page.locator("#archive").setInputFiles({name:"private.json",mimeType:"application/json",buffer:Buffer.from('["SECRET DRAFT 999"]')});
 await page.waitForFunction(()=>document.querySelector("#count").textContent==="1");
 const read=async(selector)=>page.evaluate(selector=>{
  const report=MyVibeArchive.analyzeArchive([{text:"SECRET DRAFT 999",date:null,position:0}],MyVibeTone,MyVibeHistory);
  return selector==="json"?MyVibeTrace.exportDocument(report,null,{includeText:document.querySelector("#include-text").checked}):MyVibeTrace.reportCsv(report,{includeText:document.querySelector("#include-text").checked});
 },selector);
 assert.equal(JSON.stringify(await read("json")).includes("SECRET DRAFT 999"),false);
 assert.equal((await read("csv")).includes("SECRET DRAFT 999"),false);
 await page.locator("#include-text").check();
 assert.equal(JSON.stringify(await read("json")).includes("SECRET DRAFT 999"),true);
 assert.equal((await read("csv")).includes("SECRET DRAFT 999"),true);
 await page.locator("#reset").click();
 assert.equal(await page.locator("#include-text").isChecked(),false);
});
