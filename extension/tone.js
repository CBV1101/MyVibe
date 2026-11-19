/* MyVibe v0.3: neutral by default; conservative tone heuristics, not AI. */
(function(root){
 "use strict";
 const patterns=[
  {id:"identity-hate",kind:"respect",weight:65,label:"Identity-based hostility",confidence:"high",regex:/\b(?:all|those|these)\s+(?:men|women|immigrants|foreigners|muslims|christians|jews|gay people|trans people|disabled people)\s+(?:are|should be)\s+(?:inferior|disgusting|worthless|stupid|evil)\b/i,interpretation:"This may demean people based on identity.",tip:"Focus criticism on a specific behavior, claim, or policy instead of identity."},
  {id:"appearance-attack",kind:"respect",weight:40,label:"Appearance-based attack",confidence:"high",regex:/\b(?:you(?:'re| are)|he(?:'s| is)|she(?:'s| is))\s+(?:so\s+)?(?:ugly|hideous|fat and ugly)\b/i,interpretation:"This could be experienced as a personal attack about appearance.",tip:"Address the issue without commenting on someone's appearance."},
  {id:"personal-insult",kind:"respect",weight:42,label:"Personal insult",confidence:"high",regex:/\b(?:you(?:'re| are)\s+(?:an?\s+)?(?:idiot|moron|loser|dumbass|imbecile|stupid)|(?:idiot|moron|dumbass|imbecile)\s*!?)\b/i,interpretation:"This may be read as attacking the person rather than their argument.",tip:"Critique the reasoning, claim, or action, not the person."},
  {id:"direct-hostility",kind:"respect",weight:35,label:"Personal hostility",confidence:"high",regex:/\b(?:shut up|nobody cares about you|you are worthless|you're worthless|i hate you)\b/i,interpretation:"This may feel hostile or silencing.",tip:"Explain your disagreement without dismissing the person."},
  {id:"dismissive-argument",kind:"constructiveness",weight:18,label:"Dismissive phrasing",confidence:"medium",regex:/\b(?:that|your|this)\s+(?:argument|point|opinion|take)\s+(?:is|was|sounds)\s+(?:just\s+)?(?:ridiculous|laughable|absurd)\b/i,interpretation:"Others might interpret this as dismissing the discussion rather than engaging with the argument.",tip:"Consider explaining which part you disagree with and why."},
  {id:"passive-obviously",kind:"constructiveness",weight:16,label:"Possible condescension",confidence:"low",regex:/\b(?:well,?\s+)?(?:obviously|clearly)\s+(?:you|someone|people)\s+(?:don't|do not|can't|cannot|didn't|did not)\s+(?:understand|know|get)\b/i,interpretation:"Some readers may hear this as questioning their intelligence, even if that wasn't intended.",tip:"Try describing the information or reasoning you think is missing."},
  {id:"passive-good-for-you",kind:"constructiveness",weight:0,label:"Possibly sarcastic praise",confidence:"low",regex:/\b(?:well,?\s+)?good for you[.!]?\s*$/i,interpretation:"Depending on context, 'good for you' can sound sarcastic rather than supportive.",tip:"If you mean encouragement, be specific about what you're celebrating."},
  {id:"passive-must-be-nice",kind:"constructiveness",weight:0,label:"Possible resentment or sarcasm",confidence:"low",regex:/\bmust be nice(?:\s+to\s+\w+)?[.!]?\s*$/i,interpretation:"This could be read as resentment or a veiled criticism.",tip:"Consider saying directly what concerns you or what you're hoping for."},
  {id:"passive-no-offense",kind:"constructiveness",weight:0,label:"Potentially defensive framing",confidence:"low",regex:/\bno offense,?\s+but\b/i,interpretation:"Readers may expect an insult after 'no offense, but'.",tip:"State your concern directly and respectfully."},
  {id:"passive-sorry-you-feel",kind:"constructiveness",weight:0,label:"Possibly invalidating reply",confidence:"low",regex:/\b(?:i'm|i am)\s+sorry\s+you\s+feel\s+that\s+way\b/i,interpretation:"Some readers may feel their concern is being brushed aside.",tip:"Acknowledge the concern and explain your perspective."}
 ];
 const replacements=[
  [/\bshut up\b/gi,"I'd like to focus on the issue"],
  [/\bnobody cares about you\b/gi,"I don't think that addresses the issue"],
  [/\byou(?:'re| are)\s+(?:an?\s+)?(?:idiot|moron|loser|dumbass|imbecile|stupid)\b/gi,"I disagree with your reasoning"],
  [/\b(?:that|your|this)\s+(?:argument|point|opinion|take)\s+(?:is|was|sounds)\s+(?:just\s+)?(?:ridiculous|laughable|absurd)\b/gi,"I disagree with that argument because…"],
  [/\bno offense,?\s+but\s*/gi,""]
 ];
 function analyze(value){
  const text=String(value||"").trim();
  if(!text)return {score:null,respectfulness:null,constructiveness:null,level:"empty",flags:[],suggestion:"",changed:false};
  // Ambiguous phrases trigger at most advisory feedback; they do not lower scores.
  // Heuristics are advisory: quoted speech and context require real semantic evaluation.
  const flags=patterns.filter(p=>p.regex.test(text)).map(({id,kind,weight,label,confidence,interpretation,tip})=>({id,kind,weight,label,confidence,interpretation,tip}));
  const respectfulness=Math.max(0,100-flags.filter(f=>f.kind==="respect").reduce((s,f)=>s+f.weight,0));
  const constructiveness=Math.max(0,100-flags.filter(f=>f.kind==="constructiveness").reduce((s,f)=>s+f.weight,0));
  // Only actionable negativity reduces scores. Low-confidence ambiguous phrasing has zero weight.
  const score=Math.round(respectfulness*0.75+constructiveness*0.25);
  let suggestion=text;
  for(const [re,replace] of replacements)suggestion=suggestion.replace(re,replace);
  // Don't generate generic or meaning-changing rewrites for nuanced/identity-directed cases.
  if(flags.some(f=>f.id==="identity-hate"||f.id==="appearance-attack"))suggestion="";
  return {score,respectfulness,constructiveness,level:score===100?"neutral":score>=65?"review":"hurtful",
   flags,suggestion,changed:!!suggestion&&suggestion!==text};
 }
 root.MyVibeTone={analyze};
 if(typeof module!=="undefined"&&module.exports)module.exports={analyze};
})(typeof globalThis!=="undefined"?globalThis:this);
