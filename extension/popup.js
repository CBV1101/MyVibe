const $=id=>document.getElementById(id);
function refresh(){
 chrome.storage.local.get({sharingPreference:{visibility:"private"}},({sharingPreference})=>{
  document.querySelector(".privacy:not([aria-label]) small").textContent=MyVibeSharing.description(sharingPreference);
 });
}
let lookup=0,account=null,challenge=null,proofEpoch=0;
function resetProof(){proofEpoch++;challenge=null;account=null;$("proof-start").disabled=true;$("proof-panel").hidden=true;$("proof-token").value="";$("proof-status").textContent="";$("proof-check").disabled=false;}
function hideProfile(){
 resetProof();
 for(const id of ["profile-score","profile-badge","profile-stats","profile-breakdown"])$(id).hidden=true;
 $("gauge-container").replaceChildren();$("badge-container").replaceChildren();
 $("empty").hidden=false;
}
$("profile-handle").addEventListener("input",()=>{lookup++;hideProfile();$("profile-fetch").disabled=false;$("profile-status").textContent="Enter a handle and analyze its public posts.";});
$("profile-form").addEventListener("submit",async event=>{
 event.preventDefault();
 const id=++lookup;hideProfile();$("profile-fetch").disabled=true;
 $("profile-status").textContent="Retrieving public posts from Bluesky…";
 try{
  const result=await MyVibeBluesky.fetchPublicPosts($("profile-handle").value);
  if(id!==lookup)return;
  const report=MyVibeArchive.analyzeArchive(result.posts.filter(p=>!/^MyVibe verification [a-f0-9]{48}$/.test(p.text)),MyVibeTone,MyVibeHistory);
  if(MyVibeBluesky.isDid(result.profile.did)){account=result.profile;$("proof-start").disabled=false;}
 if(!report.count)throw new Error("No usable public posts found.");
  $("score").textContent=report.score.toFixed(1);
  $("score-label").textContent=MyVibesGauge.label(report.score);
  $("count").textContent=report.count;
  $("share").textContent=Math.round(report.neutral/report.count*100)+"%";
  $("profile-breakdown").textContent=report.positive+" positive · "+report.neutral+" neutral · "+report.negative+" negative";
  $("gauge-container").replaceChildren(MyVibesGauge.createGauge(report.score));
  $("badge-container").replaceChildren(MyVibesGauge.createBadge(report.score));
  $("profile-status").textContent="@"+result.profile.handle+" · Private estimate · Ownership not verified · Limited feed"+(result.coverage?" · "+result.coverage.duplicates+" duplicates excluded · "+result.coverage.excluded+" other entries excluded · "+result.coverage.stopReason.replace(/_/g," "):"");
  for(const key of ["profile-score","profile-badge","profile-stats","profile-breakdown"])$(key).hidden=false;
  $("empty").hidden=true;
 }catch(error){if(id===lookup)$("profile-status").textContent=error.message||"Lookup failed.";}
 finally{if(id===lookup)$("profile-fetch").disabled=false;}
});
document.getElementById("getting-started").addEventListener("click",()=>chrome.tabs.create({url:chrome.runtime.getURL("welcome.html")}));
document.getElementById("data-controls").addEventListener("click",()=>chrome.tabs.create({url:chrome.runtime.getURL("data.html")}));
document.getElementById("ai-settings").addEventListener("click",()=>chrome.tabs.create({url:chrome.runtime.getURL("ai-settings.html")}));
document.getElementById("insights").addEventListener("click",()=>chrome.runtime.openOptionsPage());
document.getElementById("clear").addEventListener("click",()=>{
 if(confirm("Delete your locally saved vibe history?"))chrome.storage.local.remove("myvibeHistory",refresh);
});
refresh();

const siteKey="myvibeCoachSettings";
const defaults={enabled:true,disabledSites:[]};
function normalized(value){
 return {enabled:value?.enabled!==false,disabledSites:Array.isArray(value?.disabledSites)?value.disabledSites.filter(x=>["x.com","reddit.com","threads.net","bsky.app"].includes(x)):[]};
}
function showControls(value){
 const settings=normalized(value),site=document.getElementById("site-choice").value;
 document.getElementById("coach-enabled").checked=settings.enabled;
 document.getElementById("site-enabled").disabled=!site;
 document.getElementById("site-enabled").checked=!settings.disabledSites.includes(site);
}
function saveControl(update){
 chrome.storage.local.get({[siteKey]:defaults},data=>{
  const next=update(normalized(data[siteKey]));
  chrome.storage.local.set({[siteKey]:next},()=>{
   document.getElementById("coach-status").textContent=chrome.runtime.lastError?"Could not save settings. Try again.":"Settings saved locally.";
   if(!chrome.runtime.lastError)showControls(next);
  });
 });
}
document.getElementById("coach-enabled").addEventListener("change",event=>saveControl(s=>({...s,enabled:event.target.checked})));
document.getElementById("site-choice").addEventListener("change",()=>chrome.storage.local.get({[siteKey]:defaults},data=>showControls(data[siteKey])));
document.getElementById("site-enabled").addEventListener("change",event=>{
 const site=document.getElementById("site-choice").value;
 if(!site)return;
 saveControl(s=>({...s,disabledSites:event.target.checked?s.disabledSites.filter(x=>x!==site):[...new Set([...s.disabledSites,site])]}));
});
chrome.storage.local.get({[siteKey]:defaults},data=>showControls(data[siteKey]));

$("proof-start").addEventListener("click",()=>{
 if(!account)return;
 proofEpoch++;challenge=MyVibeAccountProof.createChallenge(account.did);
 $("proof-token").value=challenge.token;$("proof-panel").hidden=false;
 $("proof-check").disabled=false;$("proof-status").textContent="Code expires in 15 minutes. Keep this dashboard open.";
});
$("proof-cancel").addEventListener("click",()=>{
 proofEpoch++;challenge=null;$("proof-panel").hidden=true;$("proof-token").value="";
 $("proof-check").disabled=false;$("proof-status").textContent="Local verification cleared.";
});
$("proof-check").addEventListener("click",async()=>{
 if(!account||!challenge)return;
 const epoch=++proofEpoch,c=challenge,handle=account.handle;
 $("proof-check").disabled=true;
 try{
  if(Date.now()>=c.expiresAt)throw new Error("Code expired. Generate a new one.");
  const feed=await MyVibeBluesky.fetchPublicPosts(handle);
  if(epoch!==proofEpoch)return;
  const proof=feed.profile.did===c.did&&MyVibeAccountProof.checkChallenge(c,feed.posts);
  if(!proof)throw new Error("Matching post not found or code expired. Check again or generate a new code.");
  challenge=null;$("proof-token").value="";$("proof-check").disabled=true;
  $("proof-status").textContent="Local account control observed. Not a verified login or public reputation score. You may delete the verification post.";
 }catch(error){if(epoch===proofEpoch){$("proof-status").textContent=error.message;$("proof-check").disabled=false;}}
});

$("open-account-tab").addEventListener("click",()=>chrome.tabs.create({url:chrome.runtime.getURL("popup.html")+"?dashboard=1"}));
if(new URLSearchParams(location.search).get("dashboard")==="1"){
 $("open-account-tab").hidden=true;$("account-tab-hint").hidden=true;
 document.body.style.width="min(100%, 560px)";document.body.style.margin="24px auto";
}
