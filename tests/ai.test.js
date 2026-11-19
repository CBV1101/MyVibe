"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {POLICY,validateResult}=require("../server/policy.js");
const {makeClient}=require("../server/ai.js");
const sample={score:50,confidence:"high",label:"neutral",interpretation:"May read as disagreement.",reason:"No personal attack.",rewrite:null,categories:[]};
test("policy protects disagreement and belief",()=>{assert.match(POLICY,/religious teachings/);assert.match(POLICY,/untrusted text/);assert.match(POLICY,/intentions/);});
test("validates model output and downgrades uncertain hostility",()=>{
 assert.equal(validateResult({...sample,score:2,confidence:"low",label:"negative"}).score,50);
 assert.equal(validateResult({...sample,score:2,confidence:"low",label:"negative"}).label,"uncertain");
 assert.throws(()=>validateResult({...sample,score:105}));
 assert.throws(()=>validateResult({...sample,categories:["unknown"]}));
});
test("AI request uses structured output, no storage, and explicit model",async()=>{
 let sent;
 const analyze=makeClient({apiKey:"test-key",model:"test-model",fetcher:async (url,opts)=>{
  sent={url,opts,body:JSON.parse(opts.body)};
  return {ok:true,json:async()=>({output:[{content:[{type:"output_text",text:JSON.stringify(sample)}]}]})};
 }});
 assert.equal((await analyze("I disagree.","Earlier you claimed X")).score,50);
 assert.equal(sent.url,"https://api.openai.com/v1/responses");
 assert.equal(sent.body.store,false);
 assert.equal(sent.body.text.format.type,"json_schema");
 assert.equal(sent.body.model,"test-model");
 assert.match(sent.body.input[0].content,/Earlier you claimed X/);
});
test("invalid provider output does not become a score",async()=>{
 const analyze=makeClient({apiKey:"test",model:"test-model",fetcher:async()=>({ok:true,json:async()=>({output:[{content:[{type:"output_text",text:"not json"}]}]})})});
 await assert.rejects(analyze("Hello"),SyntaxError);
});
