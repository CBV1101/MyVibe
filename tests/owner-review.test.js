"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {validatePayload,summarize,filtered}=require("../server/owner-review.js");
const did="did:plc:abcdefghijklmnopqrstuvwx";
const post=(id,date="2026-11-18T12:00:00Z")=>({authorDid:did,uri:"at://"+did+"/app.bsky.feed.post/"+id,text:"Hello "+id,date});
const payload={verifiedAccountSession:true,did,publicScore:null,publicBadgeEnabled:false,posts:[post("two","2026-11-19T12:00:00Z"),post("one")]};
test("authenticated payloads preserve only scoped owner posts in time order",()=>{
 const rows=validatePayload(payload,did);
 assert.deepEqual(rows.map(x=>x.text),["Hello one","Hello two"]);
 assert.equal(rows[0].position,1);
});
test("reject altered account identity, score or duplicate post URI",()=>{
 assert.throws(()=>validatePayload(payload,"did:plc:bbbbbbbbbbbbbbbbbbbbbbbb"));
 assert.throws(()=>validatePayload({...payload,publicScore:80},did));
 assert.throws(()=>validatePayload({...payload,publicBadgeEnabled:true},did));
 assert.throws(()=>validatePayload({...payload,posts:[post("same"),post("same")]},did));
 assert.throws(()=>validatePayload({...payload,posts:[{...post("one"),authorDid:"did:plc:bbbbbbbbbbbbbbbbbbbbbbbb"}]},did));
 assert.throws(()=>validatePayload({...payload,posts:[{...post("one"),text:"x".repeat(5000)}]},did));
});
test("summaries and filters avoid counting ambiguous messages as attacks",()=>{
 const timeline=[{score:80,delta:2},{score:50,delta:0},{score:12,delta:-4}];
 const report={count:3,score:49,timeline};
 const summary=summarize(report);
 assert.equal(summary.positive,1);assert.equal(summary.negative,1);assert.equal(summary.neutral,1);
 assert.equal(summary.largestNegative[0].score,12);
 assert.equal(filtered(timeline,"neutral").length,1);
 assert.equal(filtered(timeline,"negative")[0].score,12);
 assert.equal(filtered(timeline,"all").length,3);
});