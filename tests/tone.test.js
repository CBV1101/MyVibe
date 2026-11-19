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
test("possible passive aggression is presented as uncertain",()=>{
 const r=analyze("If you say so.");
 assert.ok(r.score<100);
 assert.equal(r.flags[0].confidence,"low");
 assert.match(r.flags[0].interpretation,/might/i);
 assert.equal(r.changed,true);
});
test("possible sarcasm receives a lighter penalty",()=>{
 const r=analyze("Must be nice.");
 assert.ok(r.score>90);
 assert.equal(r.respectfulness,100);
});
test("ordinary supportive praise is not flagged",()=>{
 assert.equal(analyze("Good for you! I'm happy you got the job.").score,100);
});
test("no offense but invites a gentle warning",()=>{
 const r=analyze("No offense, but I disagree.");
 assert.ok(r.flags.some(f=>f.id==="passive-no-offense"));
});
