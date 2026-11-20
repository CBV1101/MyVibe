"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../extension/background.js"),"utf8");
function harness(settings={}){
 let listener,changes=[],fetchCalls=0,resolveFetch;
 const defaults={aiEnabled:true,aiToken:"secret",myvibeCoachSettings:{enabled:true,disabledSites:[]},...settings};
 const chrome={
  runtime:{id:"extension-id",onMessage:{addListener:fn=>listener=fn}},
  storage:{local:{get:(_defaults,cb)=>cb(defaults)},onChanged:{
   addListener:fn=>changes.push(fn),removeListener:fn=>changes=changes.filter(x=>x!==fn)
  }}
 };
 const fetch=()=>{fetchCalls++;return new Promise(resolve=>resolveFetch=resolve)};
 vm.runInNewContext(source,{chrome,fetch,AbortController,setTimeout,clearTimeout,URL,JSON});
 const send=(url="https://bsky.app/profile/test")=>new Promise(resolve=>{
  listener({type:"MYVIBE_AI_ANALYZE",text:"Thank you!",context:""},{id:"extension-id",frameId:0,url},resolve);
 });
 return {send,change:(change)=>changes.slice().forEach(fn=>fn(change,"local")),respond:()=>resolveFetch?.({ok:true,text:async()=>JSON.stringify({score:50})}),get fetchCalls(){return fetchCalls},get listeners(){return changes.length}};
}
test("AI is blocked when globally disabled or excluded on this site",async()=>{
 for(const settings of [{myvibeCoachSettings:{enabled:false,disabledSites:[]}},{myvibeCoachSettings:{enabled:true,disabledSites:["bsky.app"]}}]){
  const h=harness(settings),result=await h.send();
  assert.match(result.error,/disabled/);assert.equal(h.fetchCalls,0);
 }
});
test("changing AI consent during request prevents returning its result",async()=>{
 const h=harness(),response=h.send();
 assert.equal(h.fetchCalls,1);
 h.change({aiEnabled:{newValue:false}});
 h.respond();
 assert.match((await response).error,/cancelled/);
 assert.equal(h.listeners,0);
});
test("successful AI request removes consent listener",async()=>{
 const h=harness(),response=h.send();
 h.respond();
 assert.equal((await response).result.score,50);
 assert.equal(h.listeners,0);
});
test("unsupported senders cannot reach local AI",async()=>{
 const h=harness(),result=await h.send("https://example.com/");
 assert.match(result.error,/Unsupported source/);
 assert.equal(h.fetchCalls,0);
});
