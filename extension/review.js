/* UI-side validation and stale-draft safeguards for optional AI feedback. */
(function(root){
 "use strict";
 const score=v=>Number.isInteger(v)&&v>=0&&v<=100;
 function normalizeReview(value){
  if(!value||typeof value!=="object"||!score(value.score))throw new Error("Invalid AI review");
  if(!["low","medium","high"].includes(value.confidence))throw new Error("Invalid AI confidence");
  if(!["negative","neutral","positive","uncertain"].includes(value.label))throw new Error("Invalid AI label");
  if(typeof value.interpretation!=="string"||value.interpretation.length>700||typeof value.reason!=="string"||value.reason.length>700)throw new Error("Invalid AI feedback");
  if(value.rewrite!==null&&value.rewrite!==undefined&&(typeof value.rewrite!=="string"||value.rewrite.length>2000))throw new Error("Invalid AI rewrite");
  const normalized={score:value.score,confidence:value.confidence,label:value.label,interpretation:value.interpretation,reason:value.reason,rewrite:typeof value.rewrite==="string"&&value.rewrite.trim()?value.rewrite:null};
  // A low-confidence result may advise, but cannot lower or inflate a score.
  if(normalized.confidence==="low"||normalized.label==="uncertain"){normalized.score=50;normalized.label="uncertain";}
  return normalized;
 }
 function sameDraft(editor,expectedEditor,now,requested){return !!editor&&editor===expectedEditor&&typeof now==="string"&&now.trim()===requested.trim();}
 root.MyVibeReview={normalizeReview,sameDraft};
 if(typeof module!=="undefined"&&module.exports)module.exports={normalizeReview,sameDraft};
})(typeof globalThis!=="undefined"?globalThis:this);
