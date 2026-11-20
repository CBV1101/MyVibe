"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {postLink,sourceSummary,exportDocument,reportCsv}=require("../extension/trace.js");
const Sharing=require("../extension/sharing.js");
const {analyzeArchive}=require("../extension/archive.js");
const tone=require("../extension/tone.js"),history=require("../extension/history.js");
const did="did:plc:abcdefghijklmnopqrstuvwx",uri="at://"+did+"/app.bsky.feed.post/abc123";
const report=analyzeArchive([{text:"Congratulations! You deserve this!",date:"2026-11-17",uri},{text:"I disagree.",date:"2026-11-18"}],tone,history);
test("post links are generated only from strict AT URI validation",()=>{
 assert.equal(postLink(uri),"https://bsky.app/profile/"+encodeURIComponent(did)+"/post/abc123");
 for(const bad of ["javascript:alert(1)","https://example.com","at://did:plc:wrong/app.bsky.feed.post/x","at://"+did+"/app.bsky.feed.like/x","at://"+did+"/app.bsky.feed.post/x?q=1"]){assert.equal(postLink(bad),null,bad);}
});
test("exports include timeline provenance without elevating trust",()=>{
 const doc=exportDocument(report,{type:"bluesky_public_feed",did,handle:"example.bsky.social",hasMore:true,count:2});
 assert.equal(doc.source.ownershipVerified,false);
 assert.equal(doc.source.publishable,false);
 assert.match(doc.source.coverage,/Partial/);
 assert.equal(doc.entries[0].sourceUri,uri);
 assert.equal(doc.entries[0].sourceUrl,postLink(uri));
 assert.equal(doc.entries[0].messageScore,report.timeline[0].score);
});
test("CSV exports escape quotes/newlines and dangerous spreadsheet formulas",()=>{
 const altered={timeline:[{...report.timeline[0],text:'=SUM(A1,A2),"\\nHello'}]};
 const csv=reportCsv(altered,{includeText:true});
 const redacted=reportCsv(altered);
 assert.ok(!redacted.includes("=SUM(A1"));
 assert.ok(!redacted.split("\\r\\n")[0].split(",").includes("message"));
 assert.ok(csv.includes("'=SUM(A1"));
 assert.ok(csv.includes('""'));
});
test("unknown archive source is never publishable",()=>{
 const state=sourceSummary(null);
 assert.equal(state.publishable,false);
 assert.equal(state.ownershipVerified,false);
});
test("sharing preference is descriptive only and never authorizes publication",()=>{
 assert.equal(Sharing.normalize({visibility:"interested",approved:true}).approved,false);
 assert.equal(Sharing.canPublish({visibility:"interested",approved:true},[{verified:true}]),false);
 assert.equal(Sharing.normalize({visibility:"public"}).visibility,"private");
 assert.match(Sharing.description({visibility:"interested"}),/No score is shared/);
});
