"use strict";
const {test,after}=require("node:test");
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const path=require("node:path");
const extension=path.join(__dirname,"../extension");
let browser;
async function setup(t,site="bsky.app"){
 if(!browser)browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:950,height:720}});
 t.after(()=>context.close());
 const page=await context.newPage();
 await page.route("https://"+site+"/**",route=>{
  if(route.request().resourceType()==="document")return route.fulfill({status:200,contentType:"text/html",body:'<!doctype html><html><head><title>Composer fixture</title></head><body><textarea id="draft" aria-label="Test social composer"></textarea><div id="other" contenteditable="true" role="textbox"></div></body></html>'});
  return route.abort();
 });
 await page.addInitScript(()=>{
  window.__myvibeCalls=[];
  window.__myvibeData={myvibeHistory:[]};
  window.__myvibeStorageListeners=[];
  window.__myvibePending=[];
  window.chrome={
   runtime:{
    lastError:null,
    sendMessage:(message,callback)=>{
     window.__myvibeCalls.push(message);
     window.__myvibePending.push(callback);
    }
   },
   storage:{onChanged:{addListener:fn=>window.__myvibeStorageListeners.push(fn)},local:{
    get:(defaults,callback)=>callback({...defaults,...window.__myvibeData}),
    set:(values,callback)=>{Object.assign(window.__myvibeData,values);for(const [key,value] of Object.entries(values))window.__myvibeStorageListeners.forEach(fn=>fn({[key]:{newValue:value}},"local"));callback?.()},
    remove:(key,callback)=>{delete window.__myvibeData[key];callback?.()}
   }}
  };
 });
 await page.goto("https://"+site+"/");
 for(const file of ["tone.js","review.js","evidence.js","content.js"])await page.addScriptTag({path:path.join(extension,file)});
 return page;
}
after(async()=>{await browser?.close()});
async function draft(page,value){
 await page.locator("#draft").fill(value);
 await page.locator("#myvibe-tone-panel").waitFor({state:"visible"});
}
test("neutral drafts stay hidden; attacks show concise feedback without scores or storage",async t=>{
 const page=await setup(t);
 await page.locator("#draft").fill("I disagree with your argument.");
 await page.waitForTimeout(350);
 assert.equal(await page.locator("#myvibe-tone-panel").isVisible(),false);
 await draft(page,"You are an idiot.");
 assert.ok((await page.locator("[data-flags]").textContent()).includes("Consider:"));
 assert.equal(await page.locator("[data-status]").textContent(),"");
 assert.equal(await page.locator("[data-record]").count(),0);
 assert.equal(await page.evaluate(()=>window.__myvibeData.myvibeHistory.length),0);
 assert.equal(await page.evaluate(()=>window.__myvibeCalls.length),0);
});
test("AI request is explicit and context is included only on click",async t=>{
 const page=await setup(t);
 await draft(page,"You are dumb.");
 await page.locator("[data-options] > summary").click();
 await page.locator("[data-context] summary").click();
 await page.locator("[data-context-value]").fill("We were debating urban planning.");
 assert.equal(await page.evaluate(()=>window.__myvibeCalls.length),0);
 if(!await page.locator("[data-options]").evaluate(n=>n.open))await page.locator("[data-options] > summary").click();
 await page.locator("[data-ai]").click();
 const calls=await page.evaluate(()=>window.__myvibeCalls);
 assert.equal(calls.length,1);
 assert.equal(calls[0].text,"You are dumb.");
 assert.equal(calls[0].context,"We were debating urban planning.");
 await page.evaluate(()=>window.__myvibePending.shift()({result:{
  score:50,confidence:"high",label:"neutral",interpretation:"Normal disagreement",reason:"No attack",rewrite:"I disagree with your conclusion."
 }}));
 await page.locator("[data-ai-preview]").waitFor({state:"visible"});
 assert.equal(await page.locator("#draft").inputValue(),"You are dumb.");
 await page.locator("[data-ai-apply]").click();
 assert.equal(await page.locator("#draft").inputValue(),"I disagree with your conclusion.");
});
test("stale AI answer cannot overwrite a changed draft",async t=>{
 const page=await setup(t);
 await draft(page,"You are dumb.");
 if(!await page.locator("[data-options]").evaluate(n=>n.open))await page.locator("[data-options] > summary").click();
 await page.locator("[data-ai]").click();
 await page.locator("#draft").fill("I respectfully disagree.");
 await page.waitForTimeout(350);
 await page.evaluate(()=>window.__myvibePending.shift()({result:{
  score:65,confidence:"high",label:"positive",interpretation:"Supportive",reason:"Empathy",rewrite:"Thanks for sharing."
 }}));
 assert.equal(await page.locator("[data-ai-preview]").isVisible(),false);
 assert.equal(await page.locator("#draft").inputValue(),"I respectfully disagree.");
});
test("composer's internal context textarea never becomes target editor",async t=>{
 const page=await setup(t);
 await draft(page,"You are dumb.");
 await page.locator("[data-options] > summary").click();
 await page.locator("[data-context] summary").click();
 await page.locator("[data-context-value]").fill("Context belongs here");
 await page.locator("[data-context-value]").focus();
 assert.ok((await page.locator("[data-flags]").textContent()).includes("Consider:"));
 assert.equal(await page.evaluate(()=>window.__myvibeCalls.length),0);
});
test("switching to a new editor invalidates previous AI rewrite",async t=>{
 const page=await setup(t);
 await draft(page,"You are dumb.");
 if(!await page.locator("[data-options]").evaluate(n=>n.open))await page.locator("[data-options] > summary").click();
 await page.locator("[data-ai]").click();
 await page.locator("#other").fill("Another editor");
 await page.evaluate(()=>window.__myvibePending.shift()({result:{
  score:50,confidence:"high",label:"neutral",interpretation:"Disagreement",reason:"No hostility",rewrite:"Please clarify."
 }}));
 assert.equal(await page.locator("[data-ai-preview]").isVisible(),false);
 assert.equal(await page.locator("#other").textContent(),"Another editor");
});


test("hidden, readonly and disabled composers are not coached",async t=>{
 const page=await setup(t);
 await page.evaluate(()=>{
  const root=document.createElement("section");
  root.innerHTML='<textarea id="readonly" readonly>Do not edit</textarea><textarea id="disabled" disabled>Do not edit</textarea><div aria-hidden="true"><textarea id="hidden">Do not edit</textarea></div><div id="fake" role="textbox" tabindex="0">Not editable</div>';
  document.body.append(root);
 });
 for(const id of ["readonly","disabled","hidden","fake"]){
  await page.locator("#"+id).focus();
  assert.equal(await page.locator("#myvibe-tone-panel").isVisible(),false);
 }
});
test("unmounting a composer invalidates pending AI and closes coach",async t=>{
 const page=await setup(t);
 await draft(page,"You are dumb.");
 if(!await page.locator("[data-options]").evaluate(n=>n.open))await page.locator("[data-options] > summary").click();
 await page.locator("[data-ai]").click();
 await page.evaluate(()=>document.querySelector("#draft").remove());
 await page.waitForFunction(()=>document.querySelector("#myvibe-tone-panel").style.display==="none");
 await page.evaluate(()=>window.__myvibePending.shift()({result:{score:50,confidence:"high",label:"neutral",interpretation:"Neutral",reason:"No attack",rewrite:"New text"}}));
 assert.equal(await page.locator("[data-ai-preview]").isVisible(),false);
 assert.equal(await page.locator("#myvibe-tone-panel").isVisible(),false);
});
test("hidden composer invalidates pending AI",async t=>{
 const page=await setup(t);
 await draft(page,"You are dumb.");
 if(!await page.locator("[data-options]").evaluate(n=>n.open))await page.locator("[data-options] > summary").click();
 await page.locator("[data-ai]").click();
 await page.evaluate(()=>document.querySelector("#draft").hidden=true);
 await page.locator("#myvibe-tone-panel").waitFor({state:"hidden"});
 await page.evaluate(()=>window.__myvibePending.shift()({result:{score:50,confidence:"high",label:"neutral",interpretation:"Neutral",reason:"None",rewrite:"Changed"}}));
 assert.equal(await page.locator("[data-ai-preview]").isVisible(),false);
});
test("global opt-out hides coach, invalidates pending AI and resumes on re-enable",async t=>{
 const page=await setup(t);
 await draft(page,"You are dumb.");
 if(!await page.locator("[data-options]").evaluate(n=>n.open))await page.locator("[data-options] > summary").click();
 await page.locator("[data-ai]").click();
 await page.evaluate(()=>chrome.storage.local.set({myvibeCoachSettings:{enabled:false,disabledSites:[]}}));
 await page.waitForFunction(()=>document.querySelector("#myvibe-tone-panel").style.display==="none");
 await page.evaluate(()=>window.__myvibePending.shift()({result:{score:50,confidence:"high",label:"neutral",interpretation:"Neutral",reason:"None",rewrite:"Changed"}}));
 assert.equal(await page.locator("[data-ai-preview]").isVisible(),false);
 await page.locator("#draft").fill("You are an idiot.");
 assert.equal(await page.locator("#myvibe-tone-panel").isVisible(),false);
 await page.evaluate(()=>chrome.storage.local.set({myvibeCoachSettings:{enabled:true,disabledSites:[]}}));
 await page.locator("#draft").focus();
 await page.locator("#myvibe-tone-panel").waitFor({state:"visible"});
});
test("platform opt-out disables only matching social platform",async t=>{
 const page=await setup(t);
 await page.evaluate(()=>chrome.storage.local.set({myvibeCoachSettings:{enabled:true,disabledSites:["bsky.app"]}}));
 await page.locator("#draft").fill("You are dumb.");
 assert.equal(await page.locator("#myvibe-tone-panel").isVisible(),false);
 await page.evaluate(()=>chrome.storage.local.set({myvibeCoachSettings:{enabled:true,disabledSites:["reddit.com"]}}));
 await page.locator("#draft").focus();
 await page.locator("#myvibe-tone-panel").waitFor({state:"visible"});
});

test("all supported platform fixtures can coach editable composers without network AI",async t=>{
 for(const site of ["bsky.app","x.com","twitter.com","www.reddit.com","www.threads.net"]){
  const page=await setup(t,site);
  await draft(page,"You are dumb.");
  assert.equal(await page.locator("[data-status]").textContent(),"");
  assert.equal(await page.evaluate(()=>window.__myvibeCalls.length),0);
 }
});
test("opt-out persists through typing and never records drafts",async t=>{
 const page=await setup(t);
 await draft(page,"You are dumb.");
 await page.evaluate(()=>chrome.storage.local.set({myvibeCoachSettings:{enabled:false,disabledSites:[]}}));
 await page.waitForFunction(()=>document.querySelector("#myvibe-tone-panel").style.display==="none");
 await page.locator("#draft").fill("You are an idiot.");
 await page.waitForTimeout(350);
 assert.equal(await page.locator("#myvibe-tone-panel").isVisible(),false);
 assert.equal(await page.evaluate(()=>window.__myvibeCalls.length),0);
 assert.equal(await page.evaluate(()=>window.__myvibeData.myvibeHistory.length),0);
});
test("navigation and search text fields do not trigger coaching",async t=>{
 const page=await setup(t);
 await page.evaluate(()=>{
  const header=document.createElement("header");
  header.innerHTML='<div role="search"><textarea id="searchbox"></textarea></div><nav><div id="navbox" contenteditable="true"></div></nav>';
  document.body.append(header);
 });
 await page.locator("#searchbox").fill("Find people");
 await page.locator("#navbox").fill("Navigation");
 await page.waitForTimeout(350);
 assert.equal(await page.locator("#myvibe-tone-panel").isVisible(),false);
});

test("re-enabling on a still-focused composer immediately restores coaching",async t=>{
 const page=await setup(t);
 await draft(page,"You are dumb.");
 await page.evaluate(()=>chrome.storage.local.set({myvibeCoachSettings:{enabled:false,disabledSites:[]}}));
 await page.waitForFunction(()=>document.querySelector("#myvibe-tone-panel").style.display==="none");
 assert.equal(await page.locator("#draft").evaluate(node=>node===document.activeElement),true);
 await page.evaluate(()=>chrome.storage.local.set({myvibeCoachSettings:{enabled:true,disabledSites:[]}}));
 await page.locator("#myvibe-tone-panel").waitFor({state:"visible"});
 assert.equal(await page.locator("[data-status]").textContent(),"");
});

test("closing coach suppresses current draft but resets after clearing",async t=>{
 const page=await setup(t);
 await draft(page,"You are dumb.");
 await page.locator("[data-close]").click();
 await page.locator("#draft").fill("You are an idiot.");
 await page.waitForTimeout(300);
 assert.equal(await page.locator("#myvibe-tone-panel").isVisible(),false);
 assert.equal(await page.evaluate(()=>window.__myvibeCalls.length),0);
 await page.locator("#draft").fill("");
 await page.waitForTimeout(350);
 await draft(page,"You are dumb.");
});
test("password forms and explicitly excluded editors are never coached",async t=>{
 const page=await setup(t);
 await page.evaluate(()=>{
  const root=document.createElement("div");
  root.innerHTML='<form><input type="password"><textarea id="secret">Private</textarea></form><section data-myvibe-ignore><div id="ignored" contenteditable="true">Private</div></section>';
  document.body.append(root);
 });
 await page.locator("#secret").fill("Do not inspect this");
 await page.locator("#ignored").fill("Do not inspect this");
 await page.waitForTimeout(300);
 assert.equal(await page.locator("#myvibe-tone-panel").isVisible(),false);
});
test("nested contenteditable children do not become independent draft editors",async t=>{
 const page=await setup(t);
 await page.evaluate(()=>{
  const root=document.createElement("div");
  root.id="outer";root.contentEditable="true";
  root.innerHTML='<span id="nested" contenteditable="true">Nested draft</span>';
  document.body.append(root);
 });
 await page.locator("#nested").focus();
 await page.waitForTimeout(300);
 assert.equal(await page.locator("#myvibe-tone-panel").isVisible(),false);
 await page.locator("#outer").fill("You are dumb.");
 await page.locator("#myvibe-tone-panel").waitFor({state:"visible"});
});

test("Escape dismisses coach for current draft without changing the draft",async t=>{
 const page=await setup(t);
 await draft(page,"You are dumb.");
 await page.locator("#draft").press("Escape");
 await page.waitForFunction(()=>document.querySelector("#myvibe-tone-panel").style.display==="none");
 assert.equal(await page.locator("#draft").inputValue(),"You are dumb.");
 await page.locator("#draft").fill("You are an idiot.");
 await page.waitForTimeout(300);
 assert.equal(await page.locator("#myvibe-tone-panel").isVisible(),false);
});
test("coach repositions on viewport changes and hides offscreen without discarding draft",async t=>{
 const page=await setup(t);
 await page.evaluate(()=>{
  document.body.style.height="2200px";
  document.querySelector("#draft").style.cssText="position:absolute;top:120px;left:100px;width:420px;height:90px";
 });
 await draft(page,"You are dumb.");
 const first=await page.locator("#myvibe-tone-panel").boundingBox();
 await page.evaluate(()=>{document.querySelector("#draft").style.left="360px";window.dispatchEvent(new Event("resize"));});
 await page.waitForFunction(()=>parseFloat(document.querySelector("#myvibe-tone-panel").style.left)>300);
 const moved=await page.locator("#myvibe-tone-panel").boundingBox();
 assert.ok(moved.x>first.x+150);
 await page.evaluate(()=>window.scrollTo(0,1000));
 await page.waitForFunction(()=>document.querySelector("#myvibe-tone-panel").style.display==="none");
 assert.equal(await page.locator("#draft").inputValue(),"You are dumb.");
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.locator("#draft").focus();
 await page.locator("#myvibe-tone-panel").waitFor({state:"visible"});
});
test("closing coach cancels scheduled redraw after typing",async t=>{
 const page=await setup(t);
 await draft(page,"You are dumb.");
 await page.locator("#draft").fill("You are an idiot.");
 await page.locator("[data-close]").click();
 await page.waitForTimeout(400);
 assert.equal(await page.locator("#myvibe-tone-panel").isVisible(),false);
});

test("public feed coverage distinguishes exhaustion, duplicate entries and cursor loops",async()=>{
 const {fetchPublicPosts}=require("../extension/bluesky.js");
 const did="did:plc:"+"a".repeat(24);
 const post={post:{author:{did},uri:"at://"+did+"/app.bsky.feed.post/abc",record:{$type:"app.bsky.feed.post",text:"Hello world",createdAt:"2026-01-01T00:00:00Z"}}};
 async function run(feeds,pages){
  let i=0;
  return fetchPublicPosts("example.bsky.social",{pages,fetcher:async url=>({ok:true,json:async()=>url.includes("getProfile")?{did,handle:"example.bsky.social"}:feeds[i++]})});
 }
 const end=await run([{feed:[post,post,{reason:{}}]}],1);
 assert.equal(end.hasMore,false);
 assert.equal(end.coverage.stopReason,"feed_end");
 assert.equal(end.coverage.duplicates,1);
 assert.equal(end.coverage.excluded,1);
 assert.equal(end.posts.length,1);
 const loop=await run([{feed:[post],cursor:"next"},{feed:[post],cursor:"next"}],3);
 assert.equal(loop.hasMore,true);
 assert.equal(loop.coverage.stopReason,"repeated_cursor");
 assert.equal(loop.coverage.duplicates,1);
 const capped=await run([{feed:[post],cursor:"next"}],1);
 assert.equal(capped.hasMore,true);
 assert.equal(capped.coverage.stopReason,"page_limit");
});

test("account control challenge binds exact token, DID and expiry without public eligibility",()=>{
 const {createChallenge,checkChallenge}=require("../extension/account-proof.js");
 const did="did:plc:"+"a".repeat(24),now=Date.parse("2026-11-27T12:00:00Z");
 const c=createChallenge(did,{now,random:require("node:crypto").webcrypto});
 const post={authorDid:did,source:"bluesky_public_appview",uri:"at://"+did+"/app.bsky.feed.post/abc",text:c.token,date:new Date(now+1000).toISOString()};
 assert.equal(checkChallenge(c,[post],now+2000).publicEligible,false);
 assert.equal(checkChallenge(c,[{...post,authorDid:"did:plc:"+"b".repeat(24)}],now+2000),null);
 assert.equal(checkChallenge(c,[{...post,text:c.token+" extra"}],now+2000),null);
 assert.equal(checkChallenge(c,[{...post,date:new Date(now-1).toISOString()}],now+2000),null);
 assert.equal(checkChallenge(c,[post],c.expiresAt),null);
 assert.notEqual(createChallenge(did,{now,random:require("node:crypto").webcrypto}).token,c.token);
});
