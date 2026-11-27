/* Local proof-of-control prototype; never authorizes public reputation. */
(function(root){
 "use strict";
 const TTL=15*60*1000;
 const validDid=v=>typeof v==="string"&&/^did:(plc:[a-z2-7]{24}|web:[a-z0-9.:%-]+)$/.test(v);
 function createChallenge(did,{now=Date.now(),random=root.crypto}={}){
  if(!validDid(did)||!Number.isSafeInteger(now)||now<=0)throw new Error("Invalid account or time");
  const bytes=random.getRandomValues(new Uint8Array(24));
  const token="MyVibe verification "+Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
  return {did,token,issuedAt:now,expiresAt:now+TTL};
 }
 function checkChallenge(challenge,posts,now=Date.now()){
  if(!challenge||!validDid(challenge.did)||!/^MyVibe verification [a-f0-9]{48}$/.test(challenge.token)||!Number.isSafeInteger(challenge.issuedAt)||challenge.expiresAt!==challenge.issuedAt+TTL||now<challenge.issuedAt||now>=challenge.expiresAt)return null;
  for(const p of Array.isArray(posts)?posts:[]){
   const date=Date.parse(p.date);
   if(p.authorDid!==challenge.did||p.source!=="bluesky_public_appview"||typeof p.uri!=="string"||!p.uri.startsWith("at://"+challenge.did+"/app.bsky.feed.post/")||p.text!==challenge.token||!Number.isFinite(date)||date<challenge.issuedAt||date>now)continue;
   return {did:challenge.did,uri:p.uri,checkedAt:now,kind:"local_control_observation",publicEligible:false};
  }
  return null;
 }
 root.MyVibeAccountProof={createChallenge,checkChallenge};
 if(typeof module!=="undefined"&&module.exports)module.exports=root.MyVibeAccountProof;
})(typeof globalThis!=="undefined"?globalThis:this);
