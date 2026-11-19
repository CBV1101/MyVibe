"use strict";
/* Owner-bound read-only post fetcher. An OAuth DID is the sole actor input. */
const {isDid,normalizeFeed}=require("../extension/bluesky.js");
const API="https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed";
async function getOwnedPosts(did,{fetcher=globalThis.fetch,pages=2}={}){
 if(!isDid(did))throw new Error("Invalid authenticated DID");
 const max=Math.max(1,Math.min(3,Number.isInteger(pages)?pages:2));
 const posts=[],seen=new Set(),cursors=new Set();
 let cursor=null,hasMore=false;
 for(let page=0;page<max;page++){
  const url=new URL(API);
  url.searchParams.set("actor",did);
  url.searchParams.set("limit","100");
  url.searchParams.set("filter","posts_with_replies");
  if(cursor)url.searchParams.set("cursor",cursor);
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),10000);
  let data;
  try{
   const response=await fetcher(url.toString(),{method:"GET",signal:ctrl.signal,cache:"no-store",credentials:"omit"});
   if(!response.ok)throw new Error("Post source failed");
   data=await response.json();
  }finally{clearTimeout(timeout)}
  for(const item of normalizeFeed(data?.feed,did)){
   if(seen.has(item.uri))continue;
   seen.add(item.uri);posts.push(item);
  }
  hasMore=typeof data?.cursor==="string"&&data.cursor.length>0&&!cursors.has(data.cursor);
  if(!hasMore)break;
  cursor=data.cursor;cursors.add(cursor);
 }
 posts.sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)||a.uri.localeCompare(b.uri));
 return {source:"bluesky_public_appview",did,posts,complete:false,
  warning:"Only a bounded selection of public posts is analyzed; deleted, restricted, reposted, or older messages may be missing.",
  hasMore};
}
module.exports={getOwnedPosts};
