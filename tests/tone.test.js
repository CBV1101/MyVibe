const assert=require("node:assert/strict");
const test=require("node:test");
const {analyze}=require("../extension/tone.js");
const neutral=[
  "I strongly disagree with your argument. It is wrong and the policy is harmful.",
  "This proposal is terrible and badly designed.",
  "I think that argument is wrong because the evidence contradicts it.",
  "If you say so.",
  "Good for you.",
  "Must be nice.",
  "No offense, but I disagree.",
  "I'm sorry you feel that way.",
  "I believe in Islam because it gives my life meaning.",
  "I am a Christian and I think others should consider Christianity.",
  "You should explore Buddhism if you are interested in meditation.",
  "I don't believe in God and disagree with the teachings of Christianity.",
  "I think this religious doctrine is wrong because it conflicts with my values.",
  "I converted to Judaism and want to explain why.",
  "I strongly oppose that political position.",
  "Religion should be open to criticism."
];
test("neutral by default including criticism, concession, religious belief and invitation",()=>{
 for(const message of neutral)assert.equal(analyze(message).score,50,message);
});
test("ordinary disagreement doesn't produce a penalty",()=>{
 const r=analyze("I disagree with your religious beliefs.");
 assert.equal(r.score,50);
 assert.equal(r.flags.length,0);
});
test("clear personal attacks reduce the score",()=>{
 for(const message of ["You are an idiot","You're ugly","All muslims are inferior","Shut up"]){
  assert.ok(analyze(message).score<50,message);
 }
});
test("dismissive phrasing gets small penalty unlike personal attacks",()=>{
 const dismissive=analyze("That argument is ridiculous");
 assert.ok(dismissive.score<50);
 assert.ok(dismissive.score>analyze("You are an idiot").score);
});
test("encouragement and congratulations raise scores",()=>{
 assert.ok(analyze("Keep going! You got this!").score>50);
 assert.ok(analyze("Congratulations! You deserve this!").score>50);
 assert.ok(analyze("Proud of you! Well done!").score>50);
});
test("gratitude, empathy and kindness raise scores",()=>{
 assert.ok(analyze("Thank you for helping.").score>50);
 assert.ok(analyze("I'm here for you.").score>50);
 assert.ok(analyze("Be kind to others.").score>50);
});
test("emoji alone cannot inflate a score",()=>{
 assert.equal(analyze("❤️❤️❤️❤️❤️").score,50);
 assert.ok(analyze("You got this! ❤️").score>analyze("You got this!").score);
});
test("praise can't wash away explicit personal attacks",()=>{
 const r=analyze("Congratulations! You are an idiot! ❤️");
 assert.ok(r.score<50);
});
test("low-confidence idioms are advisory only",()=>{
 const r=analyze("Must be nice.");
 assert.equal(r.score,50);
 assert.ok(r.flags.some(f=>f.weight===0&&f.confidence==="low"));
});
test("suggestions don't rewrite neutral concessions",()=>{
 const r=analyze("If you say so.");
 assert.equal(r.changed,false);
 assert.equal(r.flags.length,0);
});
test("hostile language can generate optional rewrite",()=>{
 const r=analyze("Shut up");
 assert.equal(r.changed,true);
 assert.match(r.suggestion,/focus on the issue/);
});
test("empty draft is unscored",()=>assert.equal(analyze(" ").score,null));
