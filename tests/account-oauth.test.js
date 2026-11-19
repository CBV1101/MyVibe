"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createAccountServer,createStore,makeOAuthClient}=require("../server/account-oauth.js");
const did="did:plc:abcdefghijklmnopqrstuvwx";
async function setup(callback){
 let returnedState=null,revoked=0;
 const oauth={
  authorize:async(handle,{state})=>{returnedState=state;return "https://auth.example.org/login?handle="+encodeURIComponent(handle)},
  callback:async()=>({session:{did},state:returnedState}),
  revoke:async()=>{revoked++}
 };
 const {server}=createAccountServer({oauth});
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port;
 try{await callback({base,oauth,getState:()=>returnedState,getRevoked:()=>revoked})}
 finally{await new Promise(resolve=>server.close(resolve))}
}
const cookie=res=>(res.headers.get("set-cookie")||"").match(/mv_oauth=([^;]+)/)?.[1]||"";
const noRedirect={redirect:"manual"};
test("store roundtrip and hosted metadata requirement",async()=>{
 const store=createStore();await store.set("k",{a:1});assert.deepEqual(await store.get("k"),{a:1});await store.del("k");assert.equal(await store.get("k"),undefined);
 await assert.rejects(makeOAuthClient("http://invalid.example/metadata.json"),/hosted HTTPS/);
});
test("account starts unlinked and never publishes a badge",async()=>{
 await setup(async({base})=>{
  const r=await fetch(base+"/account"),state=await r.json();
  assert.equal(state.linked,false);assert.equal(state.publicScore,null);assert.equal(state.publicBadgeEnabled,false);
 });
});
test("login binds a random browser cookie to an authorization state, callback is one-use",async()=>{
 await setup(async({base})=>{
  const start=await fetch(base+"/oauth/start?handle=example.bsky.social",noRedirect);
  assert.equal(start.status,302);assert.match(start.headers.get("location"),/^https:\/\/auth.example.org\//);
  assert.match(start.headers.get("set-cookie"),/HttpOnly; SameSite=Lax/);
  const browser=cookie(start);assert.ok(browser.length>=32);
  const unbound=await fetch(base+"/oauth/callback?code=ok");
  assert.equal(unbound.status,403);
  const cb=await fetch(base+"/oauth/callback?code=ok",{headers:{Cookie:"mv_oauth="+browser}});
  assert.equal(cb.status,200);assert.equal((await cb.json()).did,did);
  const replay=await fetch(base+"/oauth/callback?code=ok",{headers:{Cookie:"mv_oauth="+browser}});
  assert.equal(replay.status,403);
 });
});
test("callback with mismatched application state never links an account",async()=>{
 await setup(async({base,oauth})=>{
  const start=await fetch(base+"/oauth/start?handle=example.bsky.social",noRedirect);
  oauth.callback=async()=>({session:{did},state:"attacker-substituted"});
  const result=await fetch(base+"/oauth/callback?code=x",{headers:{Cookie:"mv_oauth="+cookie(start)}});
  assert.equal(result.status,403);
  assert.equal((await fetch(base+"/account")).status,200);
 });
});
test("invalid handle cannot start OAuth",async()=>{
 await setup(async({base})=>{
  const r=await fetch(base+"/oauth/start?handle=https%3A%2F%2Fevil.example",noRedirect);
  assert.equal(r.status,400);
 });
});
test("connected session can disconnect only using same-origin CSRF header",async()=>{
 await setup(async({base,getRevoked})=>{
  const start=await fetch(base+"/oauth/start?handle=example.bsky.social",noRedirect);
  const callback=await fetch(base+"/oauth/callback?code=x",{headers:{Cookie:"mv_oauth="+cookie(start)}});
  const session=(callback.headers.get("set-cookie")||"").match(/mv_session=([^;]+)/)?.[1];assert.ok(session);
  const acct=await (await fetch(base+"/account",{headers:{Cookie:"mv_session="+session}})).json();
  assert.equal(acct.linked,true);assert.equal(acct.publicScore,null);assert.equal(typeof acct.csrf,"string");
  const without=await fetch(base+"/disconnect",{method:"POST",headers:{Cookie:"mv_session="+session}});
  assert.equal(without.status,403);
  const foreign=await fetch(base+"/disconnect",{method:"POST",headers:{Cookie:"mv_session="+session,Origin:"https://evil.example","x-myvibe-csrf":acct.csrf}});
  assert.equal(foreign.status,403);
  const success=await fetch(base+"/disconnect",{method:"POST",headers:{Cookie:"mv_session="+session,"x-myvibe-csrf":acct.csrf}});
  assert.equal(success.status,200);assert.equal(getRevoked(),1);
  const after=await (await fetch(base+"/account",{headers:{Cookie:"mv_session="+session}})).json();assert.equal(after.linked,false);
 });
});
