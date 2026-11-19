"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {getOwnedPosts}=require("../server/owned-posts.js");
const did="did:plc:abcdefghijklmnopqrstuvwx";
const uri=(id,author=did)=>"at://"+author+"/app.bsky.feed.post/"+id;
const post=(id,author=did)=>({post:{uri:uri(id,author),author:{did:author},record:{$type:"app.bsky.feed.post",text:"Hello "+id,createdAt:"2026-11-18T12:00:00Z"}}});
test("owner DID is mandatory; caller cannot inject handle",async()=>{
 await assert.rejects(getOwnedPosts("somebody.bsky.social"),/authenticated DID/);
});
test("fetch public feed only by authenticated DID and remove unrelated posts, reposts and duplicates",async()=>{
 const calls=[];
 const fetcher=async(url,opts)=>{
  calls.push({url,opts});
  return {ok:true,json:async()=>calls.length===1?
   {feed:[post("abc"),post("bad","did:plc:anotheraaaaaaaaaaaaaaaaa")],cursor:"next"}:
   {feed:[post("abc"),post("def"),{...post("repost"),reason:{$type:"app.bsky.feed.defs#reasonRepost"}}]}};
 };
 const result=await getOwnedPosts(did,{fetcher,pages:2});
 assert.equal(result.did,did);assert.equal(result.complete,false);
 assert.equal(result.posts.length,2);
 assert.ok(result.posts.every(p=>p.authorDid===did));
 assert.ok(calls.every(v=>new URL(v.url).searchParams.get("actor")===did));
 assert.ok(calls.every(v=>v.opts.credentials==="omit"));
 assert.equal(calls.length,2);
});
test("provider errors do not fabricate post evidence",async()=>{
 await assert.rejects(getOwnedPosts(did,{fetcher:async()=>({ok:false})}),/Post source failed/);
});
