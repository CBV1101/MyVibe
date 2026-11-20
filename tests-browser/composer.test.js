"use strict";
const {test,after}=require("node:test");
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const path=require("node:path");
const extension=path.join(__dirname,"../extension");
let browser;
async function setup(t){
 if(!browser)browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:950,height:720}});
 t.after(()=>context.close());
 const page=await context.newPage();
 await page.route("https://bsky.app/**",route=>{
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
 await page.goto("https://bsky.app/");
 for(const file of ["tone.js","review.js","evidence.js","content.js"])await page.addScriptTag({path:path.join(extension,file)});
 return page;
}
after(async()=>{await browser?.close()});
async function draft(page,value){
 await page.locator("#draft").fill(value);
 await page.locator("#myvibe-tone-panel").waitFor({state:"visible"});
}
test("composer detects personal attacks and leaves ordinary disagreement neutral",async t=>{
 const page=await setup(t);
 await draft(page,"I disagree with your argument.");
 await page.waitForFunction(()=>document.querySelector("[data-status]")?.textContent.includes("50/100"));
 assert.match(await page.locator("[data-status]").textContent(),/50\/100/);
 await draft(page,"You are an idiot.");
 await page.waitForFunction(()=>document.querySelector("[data-status]")?.textContent.includes("8/100"));
 assert.match(await page.locator("[data-status]").textContent(),/Consider revising/);
});
test("typing, focus and saved draft do not send AI or record raw text",async t=>{
 const page=await setup(t);
 await draft(page,"Congratulations! You deserve this!");
 assert.equal(await page.evaluate(()=>window.__myvibeCalls.length),0);
 await page.locator("[data-record]").click();
 const entries=await page.evaluate(()=>window.__myvibeData.myvibeHistory);
 assert.equal(entries.length,1);
 assert.equal(entries[0].verified,false);
 assert.equal(entries[0].evidenceType,"draft_sample");
 assert.equal(JSON.stringify(entries).includes("Congratulations!"),false);
 assert.equal(await page.evaluate(()=>window.__myvibeCalls.length),0);
});
test("AI request is explicit and context is included only on click",async t=>{
 const page=await setup(t);
 await draft(page,"I think you are wrong.");
 await page.locator("[data-context] summary").click();
 await page.locator("[data-context-value]").fill("We were debating urban planning.");
 assert.equal(await page.evaluate(()=>window.__myvibeCalls.length),0);
 await page.locator("[data-ai]").click();
 const calls=await page.evaluate(()=>window.__myvibeCalls);
 assert.equal(calls.length,1);
 assert.equal(calls[0].text,"I think you are wrong.");
 assert.equal(calls[0].context,"We were debating urban planning.");
 await page.evaluate(()=>window.__myvibePending.shift()({result:{
  score:50,confidence:"high",label:"neutral",interpretation:"Normal disagreement",reason:"No attack",rewrite:"I disagree with your conclusion."
 }}));
 await page.locator("[data-ai-preview]").waitFor({state:"visible"});
 assert.equal(await page.locator("#draft").inputValue(),"I think you are wrong.");
 await page.locator("[data-ai-apply]").click();
 assert.equal(await page.locator("#draft").inputValue(),"I disagree with your conclusion.");
});
test("stale AI answer cannot overwrite a changed draft",async t=>{
 const page=await setup(t);
 await draft(page,"Your argument is bad.");
 await page.locator("[data-ai]").click();
 await draft(page,"I respectfully disagree.");
 await page.evaluate(()=>window.__myvibePending.shift()({result:{
  score:65,confidence:"high",label:"positive",interpretation:"Supportive",reason:"Empathy",rewrite:"Thanks for sharing."
 }}));
 assert.equal(await page.locator("[data-ai-preview]").isVisible(),false);
 assert.equal(await page.locator("#draft").inputValue(),"I respectfully disagree.");
});
test("composer's internal context textarea never becomes target editor",async t=>{
 const page=await setup(t);
 await draft(page,"You are dumb.");
 await page.locator("[data-context] summary").click();
 await page.locator("[data-context-value]").fill("Context belongs here");
 await page.locator("[data-context-value]").focus();
 assert.match(await page.locator("[data-status]").textContent(),/Draft vibe:/);
 assert.equal(await page.evaluate(()=>window.__myvibeCalls.length),0);
});
test("switching to a new editor invalidates previous AI rewrite",async t=>{
 const page=await setup(t);
 await draft(page,"Your argument is bad.");
 await page.locator("[data-ai]").click();
 await page.locator("#other").fill("Another editor");
 await page.evaluate(()=>window.__myvibePending.shift()({result:{
  score:50,confidence:"high",label:"neutral",interpretation:"Disagreement",reason:"No hostility",rewrite:"Please clarify."
 }}));
 assert.equal(await page.locator("[data-ai-preview]").isVisible(),false);
 assert.equal(await page.locator("#other").textContent(),"Another editor");
});


test("delayed opt-in save is cancelled if draft changes or coach closes",async t=>{
 const page=await setup(t);
 await draft(page,"Congratulations on your achievement!");
 await page.evaluate(()=>{
  window.__pendingSaveReads=[];
  chrome.storage.local.get=(defaults,callback)=>window.__pendingSaveReads.push(()=>callback({...defaults,...window.__myvibeData}));
 });
 await page.locator("[data-record]").click();
 assert.equal(await page.evaluate(()=>window.__pendingSaveReads.length),1);
 await draft(page,"You are an idiot.");
 await page.evaluate(()=>window.__pendingSaveReads.shift()());
 assert.equal((await page.evaluate(()=>window.__myvibeData.myvibeHistory)).length,0);
 await page.locator("[data-record]").click();
 await page.locator("[data-close]").click();
 await page.evaluate(()=>window.__pendingSaveReads.shift()());
 assert.equal((await page.evaluate(()=>window.__myvibeData.myvibeHistory)).length,0);
});
test("malformed local history does not crash an explicit draft save",async t=>{
 const page=await setup(t);
 await draft(page,"Thanks for helping!");
 await page.evaluate(()=>window.__myvibeData.myvibeHistory={corrupt:true});
 await page.locator("[data-record]").click();
 await page.waitForFunction(()=>Array.isArray(window.__myvibeData.myvibeHistory));
 assert.equal(await page.evaluate(()=>window.__myvibeData.myvibeHistory.length),1);
});

test("rapid save clicks cannot overwrite one another while storage is pending",async t=>{
 const page=await setup(t);
 await draft(page,"Thank you for your help!");
 await page.evaluate(()=>{
  window.__saveWrites=[];
  chrome.storage.local.set=(values,callback)=>window.__saveWrites.push(()=>{Object.assign(window.__myvibeData,values);callback?.();});
 });
 await page.locator("[data-record]").click();
 assert.equal(await page.locator("[data-record]").isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.__saveWrites.length),1);
 await page.locator("#draft").fill("Congratulations!");
 await page.evaluate(()=>window.__saveWrites.shift()());
 assert.equal(await page.locator("[data-record]").isDisabled(),false);
 assert.equal(await page.evaluate(()=>window.__myvibeData.myvibeHistory.length),1);
 await page.locator("[data-record]").click();
 assert.equal(await page.evaluate(()=>window.__saveWrites.length),1);
 await page.evaluate(()=>window.__saveWrites.shift()());
 assert.equal(await page.evaluate(()=>window.__myvibeData.myvibeHistory.length),2);
});
test("failed storage write reports failure and allows retry",async t=>{
 const page=await setup(t);
 await draft(page,"Thank you!");
 await page.evaluate(()=>{
  chrome.storage.local.set=(_values,callback)=>{chrome.runtime.lastError={message:"Disk unavailable"};callback();chrome.runtime.lastError=null;};
 });
 await page.locator("[data-record]").click();
 await page.waitForFunction(()=>document.querySelector("[data-record]").textContent.includes("Save failed"));
 assert.equal(await page.locator("[data-record]").isDisabled(),false);
 assert.equal(await page.evaluate(()=>window.__myvibeData.myvibeHistory.length),0);
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
 await draft(page,"I disagree with this approach.");
 await page.locator("[data-ai]").click();
 await page.evaluate(()=>document.querySelector("#draft").remove());
 await page.waitForFunction(()=>document.querySelector("#myvibe-tone-panel").style.display==="none");
 await page.evaluate(()=>window.__myvibePending.shift()({result:{score:50,confidence:"high",label:"neutral",interpretation:"Neutral",reason:"No attack",rewrite:"New text"}}));
 assert.equal(await page.locator("[data-ai-preview]").isVisible(),false);
 assert.equal(await page.locator("#myvibe-tone-panel").isVisible(),false);
});
test("hidden composer invalidates pending rewrite and save",async t=>{
 const page=await setup(t);
 await draft(page,"Thank you for your help!");
 await page.evaluate(()=>{
  window.__pendingSaveReads=[];
  chrome.storage.local.get=(defaults,callback)=>window.__pendingSaveReads.push(()=>callback({...defaults,...window.__myvibeData}));
 });
 await page.locator("[data-record]").click();
 await page.evaluate(()=>document.querySelector("#draft").hidden=true);
 await page.waitForFunction(()=>document.querySelector("#myvibe-tone-panel").style.display==="none");
 await page.evaluate(()=>window.__pendingSaveReads.shift()());
 assert.equal(await page.evaluate(()=>window.__myvibeData.myvibeHistory.length),0);
});

test("global opt-out hides coach, invalidates pending AI and resumes on re-enable",async t=>{
 const page=await setup(t);
 await draft(page,"Thank you for your help!");
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
 await page.locator("#draft").fill("Thank you!");
 assert.equal(await page.locator("#myvibe-tone-panel").isVisible(),false);
 await page.evaluate(()=>chrome.storage.local.set({myvibeCoachSettings:{enabled:true,disabledSites:["reddit.com"]}}));
 await page.locator("#draft").focus();
 await page.locator("#myvibe-tone-panel").waitFor({state:"visible"});
});

test("all supported platform fixtures can coach editable composers without network AI",async t=>{
 for(const site of ["bsky.app","x.com","twitter.com","www.reddit.com","www.threads.net"]){
  const page=await setup(t,site);
  await draft(page,"I disagree with your argument.");
  assert.match(await page.locator("[data-status]").textContent(),/50\/100/);
  assert.equal(await page.evaluate(()=>window.__myvibeCalls.length),0);
 }
});
test("opt-out persists through typing and never records drafts",async t=>{
 const page=await setup(t);
 await draft(page,"Thank you!");
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
 await draft(page,"I respectfully disagree.");
 await page.evaluate(()=>chrome.storage.local.set({myvibeCoachSettings:{enabled:false,disabledSites:[]}}));
 await page.waitForFunction(()=>document.querySelector("#myvibe-tone-panel").style.display==="none");
 assert.equal(await page.locator("#draft").evaluate(node=>node===document.activeElement),true);
 await page.evaluate(()=>chrome.storage.local.set({myvibeCoachSettings:{enabled:true,disabledSites:[]}}));
 await page.locator("#myvibe-tone-panel").waitFor({state:"visible"});
 assert.match(await page.locator("[data-status]").textContent(),/50\/100/);
});

test("closing coach pauses it for this page session even after further typing",async t=>{
 const page=await setup(t);
 await draft(page,"Thank you!");
 await page.locator("[data-close]").click();
 await page.locator("#draft").fill("You are an idiot.");
 await page.waitForTimeout(300);
 assert.equal(await page.locator("#myvibe-tone-panel").isVisible(),false);
 assert.equal(await page.evaluate(()=>window.__myvibeCalls.length),0);
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
 await page.locator("#outer").fill("Outer draft");
 await page.locator("#myvibe-tone-panel").waitFor({state:"visible"});
});

test("Escape dismisses coach for current page without changing the draft",async t=>{
 const page=await setup(t);
 await draft(page,"Thank you for your thoughtful reply!");
 await page.locator("#draft").press("Escape");
 await page.waitForFunction(()=>document.querySelector("#myvibe-tone-panel").style.display==="none");
 assert.equal(await page.locator("#draft").inputValue(),"Thank you for your thoughtful reply!");
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
 await draft(page,"I respectfully disagree.");
 const first=await page.locator("#myvibe-tone-panel").boundingBox();
 await page.evaluate(()=>{document.querySelector("#draft").style.left="360px";window.dispatchEvent(new Event("resize"));});
 await page.waitForFunction(()=>parseFloat(document.querySelector("#myvibe-tone-panel").style.left)>300);
 const moved=await page.locator("#myvibe-tone-panel").boundingBox();
 assert.ok(moved.x>first.x+150);
 await page.evaluate(()=>window.scrollTo(0,1000));
 await page.waitForFunction(()=>document.querySelector("#myvibe-tone-panel").style.display==="none");
 assert.equal(await page.locator("#draft").inputValue(),"I respectfully disagree.");
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.locator("#draft").focus();
 await page.locator("#myvibe-tone-panel").waitFor({state:"visible"});
});
test("closing coach cancels scheduled redraw after typing",async t=>{
 const page=await setup(t);
 await draft(page,"Thank you!");
 await page.locator("#draft").fill("You are an idiot.");
 await page.locator("[data-close]").click();
 await page.waitForTimeout(400);
 assert.equal(await page.locator("#myvibe-tone-panel").isVisible(),false);
});
