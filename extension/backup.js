(function(root){
 "use strict";
 const FORMAT="myvibes-private-export-v1",MAX_BYTES=1024*1024,MAX_SAMPLES=500;
 function cleanHistory(history,evidence){
  if(!Array.isArray(history))throw new Error("Backup history must be an array.");
  if(history.length>MAX_SAMPLES)throw new Error("Backup exceeds the 500-sample limit.");
  return history.map((record,index)=>{
   if(!evidence.isLocalSample(record))throw new Error("Unrecognized or untrusted sample at position "+(index+1)+".");
   // Reconstruct only permitted scoring fields; strip unknown or raw-text properties.
   const {schemaVersion,evidenceType,verified,modelVersion,score,at,platform,flags,positiveSignals}=record;
   if(flags.length>20||positiveSignals.length>20||![...flags,...positiveSignals].every(x=>typeof x==="string"&&x.length<=100))throw new Error("Invalid scoring signals.");
   return {schemaVersion,evidenceType,verified,modelVersion,score,at,platform,flags:[...flags],positiveSignals:[...positiveSignals]};
  });
 }
 function parseBackup(text,evidence){
  if(typeof text!=="string"||new TextEncoder().encode(text).byteLength>MAX_BYTES)throw new Error("Backup file is too large.");
  let data;try{data=JSON.parse(text);}catch{throw new Error("Backup is not valid JSON.");}
  if(!data||data.format!==FORMAT)throw new Error("Unsupported MyVibes backup format.");
  return cleanHistory(data.history,evidence);
 }
 function mergeHistory(existing,incoming,evidence){
  const old=cleanHistory(Array.isArray(existing)?existing.filter(x=>evidence.isLocalSample(x)):[],evidence);
  const seen=new Set(),combined=[];
  for(const record of [...old,...incoming]){
   const key=JSON.stringify([record.schemaVersion,record.modelVersion,record.at,record.platform,record.score,record.flags,record.positiveSignals]);
   if(!seen.has(key)){seen.add(key);combined.push(record);}
  }
  return combined.sort((a,b)=>a.at-b.at).slice(-MAX_SAMPLES);
 }
 root.MyVibeBackup={FORMAT,MAX_BYTES,MAX_SAMPLES,parseBackup,mergeHistory,cleanHistory};
 if(typeof module!=="undefined"&&module.exports)module.exports=root.MyVibeBackup;
})(typeof globalThis!=="undefined"?globalThis:this);
