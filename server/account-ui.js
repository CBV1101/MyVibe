(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 let csrf=null;
 async function status(){
  try{
   const response=await fetch("/account",{credentials:"same-origin",cache:"no-store"});
   if(!response.ok)throw new Error("Account endpoint unavailable");
   const account=await response.json();
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
 $("disconnect").addEventListener("click",async()=>{
  if(!csrf)return;
  $("disconnect").disabled=true;
  try{
   const response=await fetch("/disconnect",{method:"POST",credentials:"same-origin",headers:{"x-myvibe-csrf":csrf}});
   if(!response.ok)throw new Error("Disconnect failed");
   csrf=null;$("disconnect-status").textContent="Local account disconnected.";await status();
  }catch(error){$("disconnect-status").textContent="Could not disconnect. Try again.";}
  finally{$("disconnect").disabled=false;}
 });
 status();
})();