/* Score provenance: draft samples never qualify as externally verifiable reputation. */
(function(root){
 "use strict";
 const MODEL_VERSION="heuristic-v0.5",SCHEMA_VERSION=4;
 const HOSTS=new Set(["x.com","twitter.com","www.reddit.com","www.threads.net","bsky.app"]);
 function validScore(v){return Number.isFinite(v)&&v>=0&&v<=100;}
 function validHost(h){return typeof h==="string"&&HOSTS.has(h);}
 function isLocalSample(item){
  return !!item&&item.schemaVersion===SCHEMA_VERSION&&item.evidenceType==="draft_sample"&&item.verified===false&&
    item.modelVersion===MODEL_VERSION&&validScore(item.score)&&Number.isSafeInteger(item.at)&&item.at>0&&
    validHost(item.platform)&&Array.isArray(item.flags)&&Array.isArray(item.positiveSignals);
 }
 function createDraftSample({result,platform,at=Date.now()}){
  if(!result||!validScore(result.score)||!validHost(platform)||!Number.isSafeInteger(at)||at<=0)throw new Error("Invalid private score sample");
  const flags=Array.isArray(result.flags)?result.flags.map(f=>f.id).filter(s=>typeof s==="string").slice(0,20):[];
  const positiveSignals=Array.isArray(result.positives)?result.positives.map(p=>p.id).filter(s=>typeof s==="string").slice(0,20):[];
  return {schemaVersion:SCHEMA_VERSION,evidenceType:"draft_sample",verified:false,modelVersion:MODEL_VERSION,score:result.score,at,platform,flags,positiveSignals};
 }
 function classifyEvidence(record){
  if(isLocalSample(record))return "private_sample";
  // Reject self-reported 'verified' fields. Only a separate trusted, server-issued
  // attestation validation path may authorize externally sourced published posts.
  return "untrusted";
 }
 function partition(records){
  const privateSamples=[],untrusted=[];
  for(const item of Array.isArray(records)?records:[]){
   if(classifyEvidence(item)==="private_sample")privateSamples.push(item);
   else untrusted.push(item);
  }
  return {privateSamples,untrusted};
 }
 function publicBadgeScore(_records){return null;}
 function publicBadgeStatus(_records){return {available:false,reason:"Verified account linking and user consent are not implemented"};}
 root.MyVibeEvidence={MODEL_VERSION,SCHEMA_VERSION,HOSTS,createDraftSample,isLocalSample,classifyEvidence,partition,publicBadgeScore,publicBadgeStatus};
 if(typeof module!=="undefined"&&module.exports)module.exports={MODEL_VERSION,SCHEMA_VERSION,HOSTS,createDraftSample,isLocalSample,classifyEvidence,partition,publicBadgeScore,publicBadgeStatus};
})(typeof globalThis!=="undefined"?globalThis:this);
