(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 let csrf=null,reviewSerial=0;
 function clearReview(){
  reviewSerial++;
  $("review-summary").hidden=true;
  $("review-score").textContent="";
  $("review-entries").replaceChildren();
  $("review-coverage").textContent="";
  $("review-status").textContent="";
 }
 async function status(){
  try{
   const response=await fetch("/account",{credentials:"same-origin",cache:"no-store"});
   if(!response.ok)throw new Error("Account endpoint unavailable");
   const account=await response.json();
   if(!account.linked)clearReview();
   csrf=account.linked?account.csrf:null;
   $("connect-section").hidden=!!account.linked;
   $("connected-section").hidden=!account.linked;
   $("status").textContent=account.linked?"Bluesky linked locally":"No connected account";
   $("did").textContent=account.linked?"Authenticated DID: "+account.did:"Connect using the official OAuth flow when your client metadata is configured.";
   $("score-policy").textContent="Public MyVibes score and badge: unavailable; this login does not grant publication consent.";
  }catch(error){
   $("status").textContent="Cannot connect to the local account service.";
   $("connect-section").hidden=true;$("connected-section").hidden=true;
  }
 }
 $("review-posts").addEventListener("click",async()=>{
  if(!csrf)return;
  const serial=++reviewSerial,button=$("review-posts");
  button.disabled=true;
  $("review-summary").hidden=true;
  $("review-status").textContent="Requesting recent public posts for your authenticated account…";
  try{
   const response=await fetch("/account/posts",{credentials:"same-origin",cache:"no-store"});
   if(!response.ok)throw new Error(response.status===429?"Please retry in 15 seconds.":"Post analysis unavailable.");
   const data=await response.json();
   if(serial!==reviewSerial||!csrf)return;
   if(!data.verifiedAccountSession||!Array.isArray(data.posts)||data.posts.some(p=>p.authorDid!==data.did))
    throw new Error("Account proof mismatch");
   const records=data.posts.map((p,i)=>({text:p.text,date:p.date,uri:p.uri,position:i}));
   const report=records.length?MyVibeArchive.analyzeArchive(records,MyVibeTone,MyVibeHistory):null;
   $("review-summary").hidden=false;
   $("review-score").textContent=report?"Practice score from "+report.count+" posts: "+report.score+"/100":"No eligible public text posts in fetched pages";
   $("review-coverage").textContent=data.warning+" This is not a complete public reputation score or a judgment about the account owner.";
   $("review-entries").replaceChildren();
   for(const entry of (report?.timeline||[]).slice(-50).reverse()){
    const article=document.createElement("article");article.className="review-entry";
    const paragraph=document.createElement("p");paragraph.textContent=entry.text;
    const metrics=document.createElement("small");metrics.textContent="Post "+entry.score+"/100 · Effect "+(entry.delta>0?"+":"")+entry.delta.toFixed(2)+" · "+(entry.reasons.map(r=>r.label).join(", ")||"Neutral");
    const linkUrl=MyVibeTrace.postLink(entry.uri);
    article.append(paragraph,metrics);
    if(linkUrl){const a=document.createElement("a");a.href=linkUrl;a.target="_blank";a.rel="noopener noreferrer";a.textContent="View source post";article.append(a);}
    $("review-entries").append(article);
   }
   $("review-status").textContent="Private local review completed. Nothing was published or saved.";
  }catch(error){if(serial===reviewSerial)$("review-status").textContent=error.message;}
  finally{if(serial===reviewSerial)button.disabled=false;}
 });
 $("clear-review").addEventListener("click",clearReview);
 $("disconnect").addEventListener("click",async()=>{
  if(!csrf)return;
  $("disconnect").disabled=true;
  try{
   const response=await fetch("/disconnect",{method:"POST",credentials:"same-origin",headers:{"x-myvibe-csrf":csrf}});
   if(!response.ok)throw new Error("Disconnect failed");
   csrf=null;clearReview();$("disconnect-status").textContent="Local account disconnected.";await status();
  }catch(error){$("disconnect-status").textContent="Could not disconnect. Try again.";}
  finally{$("disconnect").disabled=false;}
 });
 status();
})();