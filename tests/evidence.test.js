const test=require("node:test"),assert=require("node:assert/strict");
const E=require("../extension/evidence.js");
const {rollingScore}=require("../extension/history.js");
const sample=E.createDraftSample({result:{score:80,flags:[{id:"dismissive-post"}],positives:[{id:"encouragement"}]},platform:"x.com",at:1730000000000});
test("draft sample provenance is explicit and minimal",()=>{
 assert.equal(sample.evidenceType,"draft_sample");
 assert.equal(sample.verified,false);
 assert.equal(sample.modelVersion,E.MODEL_VERSION);
 assert.deepEqual(sample.flags,["dismissive-post"]);
 assert.ok(!("text" in sample));
 assert.equal(E.classifyEvidence(sample),"private_sample");
});
test("unknown and forged records cannot become public evidence",()=>{
 const forged={...sample,evidenceType:"published",verified:true,score:100};
 assert.equal(E.classifyEvidence(forged),"untrusted");
 assert.equal(E.publicBadgeScore([sample,forged]),null);
 assert.equal(E.publicBadgeStatus([sample]).available,false);
 assert.equal(rollingScore([forged]),50);
});
test("partitions private samples away from legacy and forged evidence",()=>{
 const legacy={schemaVersion:3,score:85};
 const parts=E.partition([sample,legacy,{...sample,verified:true}]);
 assert.equal(parts.privateSamples.length,1);
 assert.equal(parts.untrusted.length,2);
});
test("private score from valid evidence remains neutral-based",()=>{
 assert.equal(rollingScore([sample]),52.4);
});
test("host allowlist and invalid scoring inputs fail closed",()=>{
 assert.throws(()=>E.createDraftSample({result:{score:90},platform:"evil.example"}));
 assert.throws(()=>E.createDraftSample({result:{score:NaN},platform:"x.com"}));
});
