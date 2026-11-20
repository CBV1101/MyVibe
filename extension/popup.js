function refresh(){
 chrome.storage.local.get({myvibeHistory:[],sharingPreference:{visibility:"private"}},({myvibeHistory,sharingPreference})=>{
  // Never mix scores from incompatible scoring versions.
  const posts=(Array.isArray(myvibeHistory)?myvibeHistory:[]).filter(p=>MyVibeEvidence.isLocalSample(p));
  const score=MyVibeHistory.rollingScore(posts);
  document.getElementById("score").textContent=score.toFixed(1);
  document.getElementById("score-label").textContent=MyVibesGauge.label(score);
  document.querySelector(".privacy:not([aria-label]) small").textContent=MyVibeSharing.description(sharingPreference);
  document.getElementById("count").textContent=posts.length;
  document.getElementById("share").textContent=posts.length?Math.round(posts.filter(p=>p.flags.length===0).length/posts.length*100)+"%":"—";
  document.getElementById("empty").hidden=posts.length>0;
  document.getElementById("gauge-container").replaceChildren(MyVibesGauge.createGauge(score));
  document.getElementById("badge-container").replaceChildren(MyVibesGauge.createBadge(score));
 });
}
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
