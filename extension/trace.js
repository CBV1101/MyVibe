/* Local traceable analysis exports; nothing is transmitted. */
(function(root){
 "use strict";
 const DID=/^did:(?:plc:[a-z2-7]{24}|web:[a-z0-9.:%-]+)$/;
 const URI=/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([a-zA-Z0-9]+)$/;
 function postLink(uri){
  if(typeof uri!=="string")return null;
  const m=URI.exec(uri);
  if(!m||!DID.test(m[1]))return null;
  return "https://bsky.app/profile/"+encodeURIComponent(m[1])+"/post/"+encodeURIComponent(m[2]);
 }
 function sourceSummary(source){
  if(!source||source.type!=="bluesky_public_feed")return {kind:"sample_or_import",ownershipVerified:false,publishable:false,coverage:"Unknown completeness"};
  return {kind:"bluesky_public_feed",ownershipVerified:false,publishable:false,
   coverage:source.hasMore?"Partial: more pages might exist":"Limited to retrieved public AppView results",
   accountDid:source.did,handle:source.handle,analyzedCount:source.count};
 }
 function exportDocument(report,source,{includeText=false}={}){
  if(!report||!Array.isArray(report.timeline))throw new TypeError("No report available");
  return {format:"myvibes-analysis-export-v1",generatedAt:new Date().toISOString(),model:"heuristic-v0.5",
   disclaimer:"Local, unverified and potentially incomplete analysis; NOT an account reputation score",
   source:sourceSummary(source),
   summary:{score:report.score,count:report.count,positive:report.positive,negative:report.negative,neutral:report.neutral,categories:report.categories},
   entries:report.timeline.map(e=>({date:e.date||null,sourceUri:e.uri||null,sourceUrl:postLink(e.uri),...(includeText?{message:e.text}:{}),
    messageScore:e.score,previous:e.previous,after:e.after,delta:e.delta,reasons:e.reasons}))};
 }
 function quoteCsv(value){
  const text=String(value??"");
  return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;
 }
 function reportCsv(report,{includeText=false}={}){
  if(!report||!Array.isArray(report.timeline))throw new TypeError("No report");
  const header=["date","post_uri","post_url","message_score","previous_score","new_score","change","reasons",...(includeText?["message"]:[])];
  const rows=report.timeline.map(e=>[e.date||"",e.uri||"",postLink(e.uri)||"",e.score,e.previous,e.after,e.delta,e.reasons.map(r=>r.label).join("; "),...(includeText?[e.text]:[])]);
  // Guard formula injection when opening exports in spreadsheet software.
  return [header,...rows].map(row=>row.map(value=>{
   const s=String(value??"");
   return quoteCsv(typeof value==="string"&&/^[\t\r\n ]*[=+\-@]/.test(s)?"'"+s:s);
  }).join(",")).join("\r\n");
 }
 root.MyVibeTrace={postLink,sourceSummary,exportDocument,reportCsv};
 if(typeof module!=="undefined"&&module.exports)module.exports={postLink,sourceSummary,exportDocument,reportCsv};
})(typeof globalThis!=="undefined"?globalThis:this);
