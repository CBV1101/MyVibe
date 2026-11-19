const test=require("node:test"),assert=require("node:assert/strict");
const {normalizeReview,sameDraft}=require("../extension/review.js");
const valid={score:65,confidence:"high",label:"positive",interpretation:"Could sound supportive.",reason:"Encouragement.",rewrite:"Keep going."};
test("valid contextual AI results are accepted without mutation",()=>{
 const copy={...valid},r=normalizeReview(valid);
 assert.equal(r.score,65);assert.equal(r.rewrite,"Keep going.");assert.deepEqual(valid,copy);
});
test("low-confidence negative scoring is neutralized at the UI boundary",()=>{
 const r=normalizeReview({...valid,score:2,label:"negative",confidence:"low"});
 assert.equal(r.score,50);assert.equal(r.label,"uncertain");
});
test("malformed AI responses cannot be shown as scored feedback",()=>{
 assert.throws(()=>normalizeReview(null));
 assert.throws(()=>normalizeReview({...valid,score:101}));
 assert.throws(()=>normalizeReview({...valid,reason:42}));
 assert.throws(()=>normalizeReview({...valid,confidence:"certain"}));
 assert.throws(()=>normalizeReview({...valid,rewrite:"x".repeat(2001)}));
});
test("rewrite application requires exact same editor and draft",()=>{
 const a={},b={};
 assert.equal(sameDraft(a,a,"Hello world","Hello world"),true);
 assert.equal(sameDraft(b,a,"Hello world","Hello world"),false);
 assert.equal(sameDraft(a,a,"Changed","Hello world"),false);
 assert.equal(sameDraft(null,a,"Hello world","Hello world"),false);
});
