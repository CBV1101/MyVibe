/* MyVibe v0.4: neutral baseline with positive and negative signals. Local heuristic prototype, not AI. */
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
 const positivePatterns=[
  {id:"encouragement",weight:18,label:"Encouragement",regex:/\b(?:you(?:'ve| have) got this|keep going|don't give up|you can do it|believe in yourself|i believe in you|you are capable|you got this)\b/i},
  {id:"congratulations",weight:20,label:"Celebrating others",regex:/\b(?:congratulations|congrats|so proud of you|proud of you|well done|great job|you deserve this)\b/i},
  {id:"gratitude",weight:12,label:"Gratitude",regex:/\b(?:thank you|thanks for (?:helping|sharing|being|your)|i appreciate you|grateful for you)\b/i},
  {id:"empathy",weight:16,label:"Empathy or support",regex:/\b(?:i'm here for you|i am here for you|sorry you're going through this|that sounds really hard|sending you support|i'm rooting for you|i am rooting for you)\b/i},
  {id:"kindness",weight:13,label:"Encouraging kindness",regex:/\b(?:be kind to others|lift each other up|celebrate others|encourage others|help others grow|build each other up|be generous with others)\b/i},
  {id:"compliment",weight:14,label:"Specific compliment",regex:/\b(?:you did (?:a )?(?:great|excellent|wonderful|fantastic) job|your work is (?:great|excellent|fantastic)|i admire your|i love how you)\b/i}
 ];
 const replacements=[
  [/\bshut up\b/gi,"I'd like to focus on the issue"],
  [/\bnobody cares about you\b/gi,"I don't think that addresses the issue"],
  [/\byou(?:'re| are)\s+(?:an?\s+)?(?:idiot|moron|loser|dumbass|imbecile|stupid)\b/gi,"I disagree with your reasoning"],
  [/\b(?:that|your|this)\s+(?:argument|point|opinion|take)\s+(?:is|was|sounds)\s+(?:just\s+)?(?:ridiculous|laughable|absurd)\b/gi,"I disagree with that argument because…"],
 ];
 function analyze(value){
  const text=String(value||"").trim();
  if(!text)return {score:null,respectfulness:null,constructiveness:null,level:"empty",flags:[],positives:[],suggestion:"",changed:false};
  // Ambiguous phrases trigger at most advisory feedback; they do not lower scores.
  // Heuristics are advisory: quoted speech and context require real semantic evaluation.
  const flags=patterns.filter(p=>p.regex.test(text)).map(({id,kind,weight,label,confidence,interpretation,tip})=>({id,kind,weight,label,confidence,interpretation,tip}));
  // Neutral is the default (50). Heuristics represent message tone, not the person's worth.
  const positives=positivePatterns.filter(p=>p.regex.test(text)).map(({id,weight,label})=>({id,weight,label}));
  const respectPenalty=flags.filter(f=>f.kind==="respect").reduce((sum,f)=>sum+f.weight,0);
  const constructPenalty=flags.filter(f=>f.kind==="constructiveness").reduce((sum,f)=>sum+f.weight*0.4,0);
  // Emojis only add minor supportive evidence when an actual positive signal exists.
  const positiveStrength=positives.reduce((sum,p)=>sum+p.weight,0);
  const emojiBonus=positiveStrength&&/[❤️💚💙💜💛🙌👏🎉😊]/u.test(text)?2:0;
  const positiveBonus=Math.min(40,positiveStrength+emojiBonus);
  let score=Math.round(Math.max(0,Math.min(100,50+positiveBonus-respectPenalty-constructPenalty)));
  // A message containing an explicit personal attack cannot gain a positive rating through flattery.
  if(respectPenalty>0)score=Math.min(score,49);
  const respectfulness=Math.round(Math.max(0,Math.min(100,50-respectPenalty)));
  const constructiveness=Math.round(Math.max(0,Math.min(100,50+positiveBonus-constructPenalty)));
  let suggestion=text;
  for(const [re,replace] of replacements)suggestion=suggestion.replace(re,replace);
  // Don't generate generic or meaning-changing rewrites for nuanced/identity-directed cases.
  if(flags.some(f=>f.id==="identity-hate"||f.id==="appearance-attack"))suggestion="";
  return {score,respectfulness,constructiveness,level:score>=65?"positive":score>=50?"neutral":score>=30?"review":"hurtful",
   flags,positives,suggestion,changed:!!suggestion&&suggestion!==text};
 }
 root.MyVibeTone={analyze};
 if(typeof module!=="undefined"&&module.exports)module.exports={analyze};
})(typeof globalThis!=="undefined"?globalThis:this);
