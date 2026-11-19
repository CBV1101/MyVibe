/* MyVibe local rule-based prototype. Does not use an AI model yet. */
(function(root){
 "use strict";
 const patterns=[
  {id:"identity-hate",weight:40,label:"Identity-based hostility",regex:/\b(?:all|those|these)\s+(?:men|women|immigrants|foreigners|muslims|christians|jews|gay people|trans people|disabled people)\s+(?:are|should be)\s+(?:inferior|disgusting|worthless|stupid|evil)\b/i,tip:"Critique conduct or ideas, not someone's identity."},
  {id:"appearance-attack",weight:27,label:"Appearance-based attack",regex:/\b(?:you(?:'re| are)|he(?:'s| is)|she(?:'s| is))\s+(?:so\s+)?(?:ugly|hideous|fat and ugly)\b/i,tip:"Avoid degrading someone for their appearance."},
  {id:"personal-insult",weight:26,label:"Personal insult",regex:/\b(?:you(?:'re| are)\s+(?:an?\s+)?(?:idiot|moron|loser|dumbass|imbecile|stupid)|(?:idiot|moron|dumbass|imbecile)\s*!?)\b/i,tip:"Address the argument or behavior instead of insulting the person."},
  {id:"direct-hostility",weight:20,label:"Personal hostility",regex:/\b(?:shut up|nobody cares about you|you are worthless|you're worthless|i hate you)\b/i,tip:"Say what you disagree with, without a personal attack."}
 ];
 function analyze(value){
  const text=String(value||"").trim();
  if(!text)return {score:null,level:"empty",flags:[],suggestion:"",changed:false};
  const flags=patterns.filter(p=>p.regex.test(text)).map(({id,weight,label,tip})=>({id,weight,label,tip}));
  const score=Math.max(0,100-flags.reduce((s,f)=>s+f.weight,0));
  let suggestion=text;
  const replacements=[
   [/\bshut up\b/gi,"I'd like to focus on the issue"],
   [/\bnobody cares about you\b/gi,"I don't think that addresses the issue"],
   [/\byou(?:'re| are)\s+(?:an?\s+)?(?:idiot|moron|loser|dumbass|imbecile|stupid)\b/gi,"I disagree with your reasoning"]
  ];
  for(const [re,replace] of replacements)suggestion=suggestion.replace(re,replace);
  // Identity or appearance hostility must be rewritten thoughtfully by the author.
  if(flags.some(f=>f.id==="identity-hate"||f.id==="appearance-attack"))suggestion="";
  return {score,level:score>=85?"constructive":score>=60?"review":"hurtful",
    flags,suggestion,changed:!!suggestion&&suggestion!==text};
 }
 root.MyVibeTone={analyze};
 if(typeof module!=="undefined"&&module.exports)module.exports={analyze};
})(typeof globalThis!=="undefined"?globalThis:this);
