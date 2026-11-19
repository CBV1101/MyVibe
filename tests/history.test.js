const test=require("node:test"),assert=require("node:assert/strict");
const {nextScore,rollingScore}=require("../extension/history.js");
test("neutral baseline and proportional single-post impact",()=>{
 assert.equal(nextScore(80,43),77.04);
 assert.equal(nextScore(80,22),75.36);
 assert.equal(nextScore(80,2),73.76);
 assert.equal(nextScore(80,50),77.6);
});
test("positive messages reward, neutral messages normalize, attacks decrease",()=>{
 assert.ok(nextScore(80,90)>80);
 assert.ok(nextScore(20,50)>20);
 assert.ok(nextScore(80,7)<80);
});
test("only current-schema records count",()=>{
 assert.equal(rollingScore([{schemaVersion:2,score:100}]),50);
 assert.equal(rollingScore([{schemaVersion:4,evidenceType:"draft_sample",verified:false,score:90}]),53.2);
});
test("invalid values cannot corrupt scores",()=>{
 assert.throws(()=>nextScore(80,NaN));
 assert.throws(()=>nextScore(80,40,2));
});

test("self-claimed verified records do not count toward private draft score",()=>{
 assert.equal(rollingScore([{schemaVersion:4,evidenceType:"published",verified:true,score:100}]),50);
});
