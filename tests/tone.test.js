const assert=require("node:assert/strict");const test=require("node:test");const {analyze}=require("../extension/tone.js");
test("strong disagreement is not penalized",()=>{assert.equal(analyze("I strongly disagree with your argument. It is wrong and the policy is harmful.").score,100);});
test("criticism of political ideas is not penalized",()=>{assert.equal(analyze("This proposal is terrible and badly designed.").score,100);});
test("personal attacks lower score",()=>{assert.ok(analyze("You are an idiot").score<100);});
test("identity-hostility lowers score",()=>{const x=analyze("All immigrants are inferior");assert.ok(x.score<100);assert.equal(x.changed,false);});
test("appearance attack lowers score",()=>{assert.ok(analyze("You're ugly").score<100);});
test("calmer language can be suggested",()=>{const x=analyze("Shut up");assert.equal(x.changed,true);assert.ok(x.suggestion.includes("focus on the issue"));});
test("empty text has no score",()=>{assert.equal(analyze(" ").score,null);});

test("dismissive criticism is milder than a personal attack",()=>{
 const dismissive=analyze("That argument is ridiculous");
 const attack=analyze("You are an idiot");
 assert.ok(dismissive.score<100);
 assert.ok(dismissive.score>attack.score);
 assert.equal(dismissive.respectfulness,100);
 assert.ok(dismissive.constructiveness<100);
});
test("neutral disagreement remains neutral",()=>{
 const r=analyze("I think that argument is wrong because the evidence contradicts it.");
 assert.equal(r.score,100);
 assert.equal(r.flags.length,0);
});
test("conceding a point is neutral without context",()=>{ const r=analyze("If you say so."); assert.equal(r.score,100); assert.equal(r.flags.length,0); assert.equal(r.changed,false); });
test("possible sarcasm receives a lighter penalty",()=>{
 const r=analyze("Must be nice.");
 assert.equal(r.score,100);
 assert.equal(r.respectfulness,100);
});
test("ordinary supportive praise is not flagged",()=>{
 assert.equal(analyze("Good for you! I'm happy you got the job.").score,100);
});
test("no offense but invites a gentle warning",()=>{
 const r=analyze("No offense, but I disagree.");
 assert.ok(r.flags.some(f=>f.id==="passive-no-offense"));
});

test("religious expression and invitations are neutral",()=>{
 for(const message of [
  "I believe in Islam because it gives my life meaning.",
  "I am a Christian and I think others should consider Christianity.",
  "You should explore Buddhism if you are interested in meditation.",
  "I don't believe in God and disagree with the teachings of Christianity.",
  "I think this religious doctrine is wrong because it conflicts with my values.",
  "I converted to Judaism and want to explain why."
 ]){const result=analyze(message); assert.equal(result.score,100,message); assert.equal(result.flags.length,0,message);}
});
test("identity-directed attacks still reduce scores",()=>{
 assert.ok(analyze("All muslims are inferior").score<100);
 assert.ok(analyze("You are an idiot").score<100);
});
test("ambiguous expressions get no numerical penalty",()=>{
 for(const message of ["If you say so.", "Good for you.", "Must be nice.", "No offense, but I disagree.", "I'm sorry you feel that way."]){
  assert.equal(analyze(message).score,100,message);
 }
});
test("straightforward critical views remain neutral",()=>{
 for(const message of ["That policy is wrong.", "I strongly oppose that political position.", "Religion should be open to criticism.", "I disagree with your religious beliefs."]){
  assert.equal(analyze(message).score,100,message);
 }
});
