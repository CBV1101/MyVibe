"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fixtures=require("../evaluation/curated-tone-cases.json");
const {evaluate,formatReport}=require("../scripts/evaluate-tone.js");
const {analyze,stripReportedQuotes}=require("../extension/tone.js");
test("calibration corpus is labeled, distinct and broad",()=>{
 const result=evaluate(fixtures.cases);
 assert.equal(result.total,70);
 for(const label of ["neutral","negative","positive","advisory"])assert.ok(result.categories[label]>=5);
 assert.equal(new Set(fixtures.cases.map(x=>x.id)).size,70);
});
test("attributed abusive quotes are not classified as the author's abuse",()=>{
 for(const message of [
  'She said "you are an idiot" and I told her it was unacceptable.',
  'The commenter wrote "I hate Jewish people" and I reported it.',
  'He said "shut up" but I refused.',
  'They posted "you are dumb" and I asked them to be civil.',
  'The post quoted "all muslims are inferior" as an example of hate speech.'
 ]){
  const result=analyze(message);
  assert.equal(result.score,50,message);
  assert.equal(result.changed,false,message);
 }
 assert.notEqual(stripReportedQuotes('He said "you are an idiot"'), 'He said "you are an idiot"');
});
test("first-person insults outside a quote still lower scores",()=>{
 const samples=[
  'She said "be nice" but you are an idiot.',
  'He said "you are smart", but I hate you.',
  'You are dumb.'
 ];
 for(const message of samples)assert.ok(analyze(message).score<50,message);
});
test("evaluation engine catches intentionally weakened or overly harsh scoring",()=>{
 const examples=[{id:"n",text:"Neutral",expected:"neutral"},{id:"h",text:"Hostile",expected:"negative"},{id:"p",text:"Helpful",expected:"positive"},{id:"a",text:"Ambiguous",expected:"advisory"}];
 const result=evaluate(examples,()=>({score:0}));
 assert.equal(result.falsePositiveNeutral,2);
 assert.equal(result.releaseGate,false);
 assert.equal(result.failures.length,3);
 assert.match(formatReport(result),/Release gate: FAIL/);
});
test("fixture regression evaluation meets defined release gate",()=>{
 const report=evaluate(fixtures.cases);
 assert.ok(report.releaseGate,formatReport(report));
 assert.equal(report.failed,0,formatReport(report));
});