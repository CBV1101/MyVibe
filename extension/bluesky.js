/* Read-only public Bluesky post importer. This NEVER proves account ownership. */
(function(root){
 "use strict";
 const API="https://public.api.bsky.app/xrpc/";
 function cleanHandle(value){
  if(typeof value!=="string")throw new Error("Enter a Bluesky handle");
  const handle=value.trim().replace(/^@/,"").toLowerCase();
  if(handle.length<4||handle.length>253||!handle.includes(".")||
     !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(handle))
   throw new Error("Enter a valid Bluesky handle, such as example.bsky.social");
  return handle;
 }
 function isDid(value){return typeof value==="string"&&/^did:(plc:[a-z2-7]{24}|web:[a-z0-9.:%-]+)$/.test(value);}
 function normalizeFeed(feed,did){
  if(!Array.isArray(feed)||!isDid(did))throw new Error("Invalid public feed");
  const normalized=[];
  for(const entry of feed){
   if(entry?.reason?.$type==="app.bsky.feed.defs#reasonRepost"||entry?.reason)continue;
   const post=entry?.post,record=post?.record;
   if(post?.author?.did!==did||typeof post.uri!=="string"||
      !post.uri.startsWith("at://"+did+"/app.bsky.feed.post/")||
      !/^at:\/\/did:[^/]+\/app\.bsky\.feed\.post\/[a-zA-Z0-9]+$/.test(post.uri)||
      record?.$type!=="app.bsky.feed.post"||
      typeof record.text!=="string"||!record.text.trim()||record.text.length>4000)continue;
   const parsed=Date.parse(record.createdAt);
   if(!Number.isFinite(parsed))continue;
   normalized.push({uri:post.uri,authorDid:did,text:record.text.trim(),date:new Date(parsed).toISOString(),source:"bluesky_public_appview",isReply:!!record.reply});
  }
  return normalized;
 }
 async function fetchJson(url,fetcher){
  const controller=new AbortController(),id=setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetcher(url,{method:"GET",signal:controller.signal,cache:"no-store",credentials:"omit"});
   if(!response.ok)throw new Error("Bluesky public API unavailable ("+response.status+")");
   const data=await response.json();
   if(!data||typeof data!=="object")throw new Error("Invalid Bluesky response");
   return data;
  }finally{clearTimeout(id);}
 }
 async function fetchPublicPosts(handle,{fetcher=globalThis.fetch,pages=3}={}){
  const clean=cleanHandle(handle),limit=Math.max(1,Math.min(5,Number.isInteger(pages)?pages:3));
  const profile=await fetchJson(API+"app.bsky.actor.getProfile?actor="+encodeURIComponent(clean),fetcher);
  if(!isDid(profile.did)||typeof profile.handle!=="string")throw new Error("Bluesky profile missing a valid DID");
  // Account identity is the stable DID, not the mutable handle. This is public lookup,
  // NOT authentication or proof the person importing controls this account.
  const did=profile.did;
  const results=[],seen=new Set(),seenCursors=new Set();
  let cursor=null,requests=0;
  for(let page=0;page<limit;page++){
   const params=new URLSearchParams({actor:did,limit:"100",filter:"posts_with_replies"});
   if(cursor)params.set("cursor",cursor);
   const data=await fetchJson(API+"app.bsky.feed.getAuthorFeed?"+params,fetcher);
   requests++;
   for(const item of normalizeFeed(data.feed,did)){
    if(seen.has(item.uri))continue;
    seen.add(item.uri);results.push(item);
   }
   if(typeof data.cursor!=="string"||!data.cursor||seenCursors.has(data.cursor))break;
   cursor=data.cursor;seenCursors.add(cursor);
  }
  results.sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)||a.uri.localeCompare(b.uri));
  return {profile:{handle:profile.handle,did,displayName:typeof profile.displayName==="string"?profile.displayName.slice(0,120):""},
   posts:results,requests,hasMore:requests===limit&&!!cursor,source:"Bluesky public AppView",ownershipVerified:false,completeness:"partial"};
 }
 root.MyVibeBluesky={cleanHandle,isDid,normalizeFeed,fetchPublicPosts};
 if(typeof module!=="undefined"&&module.exports)module.exports={cleanHandle,isDid,normalizeFeed,fetchPublicPosts};
})(typeof globalThis!=="undefined"?globalThis:this);
