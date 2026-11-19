/* Prototype rolling vibe score: neutral 50, 8% of each explicitly recorded sample.
   Private demo only: unverified drafts can be gamed; do not publish as account reputation. */
(function(root){
 "use strict";
 const clamp=v=>Math.max(0,Math.min(100,v));
 function nextScore(previous,message,rate=0.08){
  if(!Number.isFinite(previous)||!Number.isFinite(message)||rate<0||rate>1)throw new TypeError("Invalid score input");
  return clamp(previous+(message-previous)*rate);
 }
 function rollingScore(samples){
  let score=50;
  for(const s of samples){
   if(!(s.schemaVersion===4&&s.evidenceType==="draft_sample"&&s.verified===false)||!Number.isFinite(s.score))continue;
   score=nextScore(score,s.score);
  }
  return Math.round(score*10)/10;
 }
 root.MyVibeHistory={nextScore,rollingScore};
 if(typeof module!=="undefined"&&module.exports)module.exports={nextScore,rollingScore};
})(typeof globalThis!=="undefined"?globalThis:this);
