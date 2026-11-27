const $=id=>document.getElementById(id);
function refresh(){
 chrome.storage.local.get({sharingPreference:{visibility:"private"}},({sharingPreference})=>{
  document.querySelector(".privacy:not([aria-label]) small").textContent=MyVibeSharing.description(sharingPreference);
 });
}
let lookup=0;
function hideProfile(){
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
  const report=MyVibeArchive.analyzeArchive(result.posts,MyVibeTone,MyVibeHistory);
  if(!report.count)throw new Error("No usable public posts found.");
  $("score").textContent=report.score.toFixed(1);
  $("score-label").textContent=MyVibesGauge.label(report.score);
  $("count").textContent=report.count;
  $("share").textContent=Math.round(report.neutral/report.count*100)+"%";
  $("profile-breakdown").textContent=report.positive+" positive · "+report.neutral+" neutral · "+report.negative+" negative";
  $("gauge-container").replaceChildren(MyVibesGauge.createGauge(report.score));
  $("badge-container").replaceChildren(MyVibesGauge.createBadge(report.score));
  $("profile-status").textContent="@"+result.profile.handle+" · Private estimate · Ownership not verified · Limited feed";
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
