const assert=require("node:assert/strict");const test=require("node:test");const {analyze}=require("../extension/tone.js");
test("strong disagreement is not penalized",()=>{assert.equal(analyze("I strongly disagree with your argument. It is wrong and the policy is harmful.").score,100);});
test("criticism of political ideas is not penalized",()=>{assert.equal(analyze("This proposal is terrible and badly designed.").score,100);});
test("personal attacks lower score",()=>{assert.ok(analyze("You are an idiot").score<100);});
test("identity-hostility lowers score",()=>{const x=analyze("All immigrants are inferior");assert.ok(x.score<100);assert.equal(x.changed,false);});
test("appearance attack lowers score",()=>{assert.ok(analyze("You're ugly").score<100);});
test("calmer language can be suggested",()=>{const x=analyze("Shut up");assert.equal(x.changed,true);assert.ok(x.suggestion.includes("focus on the issue"));});
test("empty text has no score",()=>{assert.equal(analyze(" ").score,null);});
