"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const B=require("../extension/backup.js"),E=require("../extension/evidence.js");
const sample=E.createDraftSample({result:{score:76,flags:[{id:"attack"}],positives:[{id:"support"}]},platform:"x.com",at:1730000000000});
const pack=history=>JSON.stringify({format:B.FORMAT,history});
test("restores valid private evidence without unexpected fields",()=>{
 const restored=B.parseBackup(pack([{...sample,text:"sensitive draft",aiToken:"secret"}]),E);
 assert.deepEqual(restored,[sample]);
 assert.equal(JSON.stringify(restored).includes("sensitive"),false);
});
test("rejects forged verified records, unknown versions and invalid formats",()=>{
 for(const record of [{...sample,verified:true},{...sample,schemaVersion:3},{...sample,score:Infinity}]){
  assert.throws(()=>B.parseBackup(pack([record]),E));
 }
 assert.throws(()=>B.parseBackup('{"history":[]}',E),/format/);
 assert.throws(()=>B.parseBackup("{",E),/JSON/);
});
test("merges backups deterministically and removes duplicates",()=>{
 const later={...sample,at:1730000000100};
 assert.deepEqual(B.mergeHistory([sample],[sample,later],E),[sample,later]);
});
test("enforces import size, sample count and bounded signals",()=>{
 assert.throws(()=>B.parseBackup("x".repeat(B.MAX_BYTES+1),E),/large/);
 assert.throws(()=>B.parseBackup(pack(Array(501).fill(sample)),E),/500/);
 assert.throws(()=>B.parseBackup(pack([{...sample,flags:["x".repeat(101)]}]),E),/signals/);
});
test("does not trust unrecognized existing records when merging",()=>{
 assert.deepEqual(B.mergeHistory([{...sample,verified:true}],[sample],E),[sample]);
});
