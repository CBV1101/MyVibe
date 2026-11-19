/* Private account-review helpers. All post text remains in the local browser page. */
(function(root){
 "use strict";
 function validatePayload(data,did){
  if(!data||data.verifiedAccountSession!==true||data.did!==did||
     data.publicScore!==null||data.publicBadgeEnabled!==false||
     !Array.isArray(data.posts)||data.posts.length>300)throw new Error("Untrusted account review payload");
  const seen=new Set();
  const posts=[];
  for(const p of data.posts){
   if(p?.authorDid!==did||typeof p.uri!=="string"||
      typeof p.text!=="string"||p.text.length>4000||!p.text.trim()||
      typeof p.date!=="string"||!Number.isFinite(Date.parse(p.date))||seen.has(p.uri))
    throw new Error("Invalid or duplicate account post");
   if(!p.uri.startsWith("at://"+did+"/app.bsky.feed.post/"))throw new Error("Post DID mismatch");
   seen.add(p.uri);
   posts.push({text:p.text,date:p.date,uri:p.uri,position:posts.length});
  }
  posts.sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)||a.uri.localeCompare(b.uri));
  return posts;
 }
 function summarize(report){
  if(!report||!Array.isArray(report.timeline))throw new TypeError("Missing report");
  const positives=report.timeline.filter(e=>e.score>50).length;
  const negatives=report.timeline.filter(e=>e.score<50).length;
  return {count:report.count,positive:positives,negative:negatives,neutral:report.count-positives-negatives,
   score:report.score,largestNegative:report.timeline.filter(e=>e.delta<0).sort((a,b)=>a.delta-b.delta).slice(0,3),
   largestPositive:report.timeline.filter(e=>e.delta>0).sort((a,b)=>b.delta-a.delta).slice(0,3)};
 }
 function filtered(timeline,filter){
  if(!Array.isArray(timeline))return [];
  if(filter==="positive")return timeline.filter(e=>e.score>50);
  if(filter==="negative")return timeline.filter(e=>e.score<50);
  if(filter==="neutral")return timeline.filter(e=>e.score===50);
  return timeline;
 }
 root.MyVibeOwnerReview={validatePayload,summarize,filtered};
 if(typeof module!=="undefined"&&module.exports)module.exports={validatePayload,summarize,filtered};
})(typeof globalThis!=="undefined"?globalThis:this);
