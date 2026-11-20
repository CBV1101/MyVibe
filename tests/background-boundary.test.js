"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
const script=fs.readFileSync(path.join(__dirname,"../extension/background.js"),"utf8");
function setup({enabled=true,responseBody='{"score":50}',status=200}={}){
 let listener,fetches=0;
 const chrome={runtime:{id:"myvibe-test",onMessage:{addListener:fn=>listener=fn}},storage:{local:{get:(_defaults,cb)=>cb({aiEnabled:enabled,aiToken:"test-token",myvibeCoachSettings:{enabled:true,disabledSites:[]}})},onChanged:{addListener:()=>{},removeListener:()=>{}}}};
 const ctx={chrome,AbortController,setTimeout,clearTimeout,fetch:async()=>{fetches++;return {ok:status===200,status,text:async()=>responseBody}}};
 vm.runInNewContext(script,ctx);
 const sender={id:"myvibe-test",frameId:0,url:"https://bsky.app/"};
 function send(message,s=sender){return new Promise(resolve=>{const keep=listener(message,s,resolve);if(keep===false)return;});}
 return {send,sender,get fetches(){return fetches}};
}
test("AI relay rejects other extension IDs, subframes and unsupported sites",async()=>{
 const a=setup(),message={type:"MYVIBE_AI_ANALYZE",text:"hello"};
 assert.equal((await a.send(message,{...a.sender,id:"other"})).error,"Unsupported sender");
 assert.equal((await a.send(message,{...a.sender,frameId:2})).error,"Unsupported sender");
 assert.equal((await a.send(message,{...a.sender,url:"https://evil.example/"})).error,"Unsupported source");
 assert.equal(a.fetches,0);
});
test("AI relay remains explicit, bounded and disabled by default",async()=>{
 const a=setup({enabled:false});
 assert.match((await a.send({type:"MYVIBE_AI_ANALYZE",text:"hello"})).error,/disabled/);
 assert.equal(a.fetches,0);
 const b=setup();
 assert.match((await b.send({type:"MYVIBE_AI_ANALYZE",text:"x".repeat(3001)})).error,/too long/);
 assert.equal(b.fetches,0);
});
test("AI relay rejects oversized or malformed upstream responses",async()=>{
 for(const body of ["x".repeat(16001),"null","[]","not json"]){
  const a=setup({responseBody:body});
  assert.match((await a.send({type:"MYVIBE_AI_ANALYZE",text:"hello"})).error,/AI unavailable/);
 }
});
test("AI relay returns valid structured response for authorized click",async()=>{
 const a=setup();
 const response=await a.send({type:"MYVIBE_AI_ANALYZE",text:"hello",context:""});
 assert.equal(response.result.score,50);
 assert.equal(a.fetches,1);
});
