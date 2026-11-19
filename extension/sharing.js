/* Local sharing preference, NOT proof of ownership or a publication permission. */
(function(root){
 "use strict";
 function normalize(value){
  if(!value||typeof value!=="object")return {visibility:"private",approved:false};
  return {visibility:value.visibility==="interested"?"interested":"private",approved:false};
 }
 function canPublish(_preference,_evidence){return false;}
 function description(preference){
  const state=normalize(preference);
  return state.visibility==="interested"?
   "Preference saved on this device. No score is shared; account verification and an actual publication consent flow are not available.":
   "Private only. No score is published or available for other people to see.";
 }
 root.MyVibeSharing={normalize,canPublish,description};
 if(typeof module!=="undefined"&&module.exports)module.exports={normalize,canPublish,description};
})(typeof globalThis!=="undefined"?globalThis:this);
