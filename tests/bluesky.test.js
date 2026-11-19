"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {cleanHandle,isDid,normalizeFeed,fetchPublicPosts}=require("../extension/bluesky.js");
const did="did:plc:abcdefghijklmnopqrstuvwx";
const makePost=(uri,text,date="2026-11-10T10:00:00Z")=>({post:{uri,author:{did},record:{$type:"app.bsky.feed.post",text,createdAt:date}}});
const uri=(id)=>"at://"+did+"/app.bsky.feed.post/"+id;
test("handle input is strictly validated and normalized",()=>{
 assert.equal(cleanHandle("@Example.Bsky.Social"),"example.bsky.social");
 for(const bad of ["localhost","a","http://example.com","foo/bar.example","example.com?x=1"]){assert.throws(()=>cleanHandle(bad),bad);}
});
test("DIDs are checked and authorship is tied to DID not mutable handle",()=>{
 assert.equal(isDid(did),true);assert.equal(isDid("did:plc:wrong"),false);
 const own=makePost(uri("abc"),"Hello");
 const forged={...makePost(uri("different"),"Ignore"),post:{...makePost(uri("different"),"Ignore").post,author:{did:"did:plc:other"}}};
 const repost={...makePost(uri("repost"),"Repost"),reason:{$type:"app.bsky.feed.defs#reasonRepost"}};
 assert.deepEqual(normalizeFeed([own,forged,repost],did).map(p=>p.text),["Hello"]);
});
test("public import follows bounded pagination, ignores reposts and deduplicates",async()=>{
 const calls=[];
 const pages=[
  {did,handle:"account.bsky.social",displayName:"Test"},
  {feed:[makePost(uri("one"),"Hello","2026-11-10T10:00:00Z")],cursor:"next"},
  {feed:[makePost(uri("one"),"Hello"),makePost(uri("two"),"Keep going","2026-11-11T10:00:00Z")]}
 ];
 const fetcher=async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>pages[calls.length-1]};
 };
 const result=await fetchPublicPosts("account.bsky.social",{fetcher,pages:3});
 assert.equal(result.ownershipVerified,false);
 assert.equal(result.posts.length,2);
 assert.equal(result.posts[0].uri,uri("one"));
 assert.equal(result.posts[1].uri,uri("two"));
 assert.equal(calls.length,3);
 assert.match(calls[1].url,/actor=did%3Aplc%3A/);
 assert.equal(calls[1].options.credentials,"omit");
 assert.ok(calls.every(call=>call.url.startsWith("https://public.api.bsky.app/xrpc/")));
});
test("empty, bad and third-party-feed posts are rejected",()=>{
 assert.deepEqual(normalizeFeed([makePost(uri("missing"),""),makePost("at://did:plc:other/app.bsky.feed.post/abc","Spoof")],did),[]);
});
test("API error fails without creating phantom scores",async()=>{
 await assert.rejects(fetchPublicPosts("example.bsky.social",{fetcher:async()=>({ok:false,status:429})}),/429/);
});
