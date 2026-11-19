"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createAccountServer}=require("../server/account-oauth.js");
const did="did:plc:abcdefghijklmnopqrstuvwx",badDid="did:plc:bbbbbbbbbbbbbbbbbbbbbbbb";
async function setup(fetchPosts,run){
 let state="";
 const oauth={authorize:async(_handle,options)=>{state=options.state;return "https://auth.example.org/authorize";},
  callback:async()=>({session:{did},state})};
 const {server}=createAccountServer({oauth,fetchPosts});
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port;
 try{
  const before=await fetch(base+"/account/posts");
  assert.equal(before.status,401);
  const start=await fetch(base+"/oauth/start?handle=sample.bsky.social",{redirect:"manual"});
  const pending=(start.headers.get("set-cookie")||"").match(/mv_oauth=([^;]+)/)?.[1];
  const callback=await fetch(base+"/oauth/callback?code=test",{headers:{Cookie:"mv_oauth="+pending}});
  assert.equal(callback.status,200);
  const sid=(callback.headers.get("set-cookie")||"").match(/mv_session=([^;]+)/)?.[1];
  await run({base,headers:{Cookie:"mv_session="+sid}});
 }finally{await new Promise(resolve=>server.close(resolve))}
}
test("post review only uses authenticated DID and never enables public scoring",async()=>{
 const asked=[];
 await setup(async owner=>{asked.push(owner);return {did:owner,posts:[{authorDid:owner,uri:"at://"+owner+"/app.bsky.feed.post/abc",text:"Hello",date:"2026-11-18"}],complete:false};},
 async({base,headers})=>{
  const r=await fetch(base+"/account/posts",{headers});
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.did,did);assert.equal(data.verifiedAccountSession,true);
  assert.equal(data.publicScore,null);assert.equal(data.publicBadgeEnabled,false);
  assert.equal(data.posts.length,1);
 });
 assert.deepEqual(asked,[did]);
});
test("no actor override and cross-site reads are rejected",async()=>{
 await setup(async owner=>({did:owner,posts:[]}),async({base,headers})=>{
  const override=await fetch(base+"/account/posts?actor="+encodeURIComponent(badDid),{headers});assert.equal(override.status,400);
  const origin=await fetch(base+"/account/posts",{headers:{...headers,Origin:"https://attacker.invalid"}});
  assert.equal(origin.status,403);
  const site=await fetch(base+"/account/posts",{headers:{...headers,"Sec-Fetch-Site":"cross-site"}});
  assert.equal(site.status,403);
 });
});
test("provider mismatch never returns foreign posts",async()=>{
 await setup(async()=>({did,posts:[{authorDid:badDid,text:"Wrong author"}]}),async({base,headers})=>{
  const r=await fetch(base+"/account/posts",{headers});assert.equal(r.status,502);
 });
});
test("same-session repeat requests are rate-limited",async()=>{
 await setup(async owner=>({did:owner,posts:[]}),async({base,headers})=>{
  assert.equal((await fetch(base+"/account/posts",{headers})).status,200);
  assert.equal((await fetch(base+"/account/posts",{headers})).status,429);
 });
});
