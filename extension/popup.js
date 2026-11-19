function refresh(){
 chrome.storage.local.get({myvibeHistory:[]},({myvibeHistory})=>{
  // Never mix scores from incompatible scoring versions.
  const posts=myvibeHistory.filter(p=>MyVibeEvidence.isLocalSample(p));
  const score=MyVibeHistory.rollingScore(posts);
  document.getElementById("score").textContent=score.toFixed(1);
  document.getElementById("score-label").textContent=MyVibesGauge.label(score);
  document.getElementById("count").textContent=posts.length;
  document.getElementById("share").textContent=posts.length?Math.round(posts.filter(p=>p.flags.length===0).length/posts.length*100)+"%":"—";
  document.getElementById("empty").hidden=posts.length>0;
  document.getElementById("gauge-container").replaceChildren(MyVibesGauge.createGauge(score));
  document.getElementById("badge-container").replaceChildren(MyVibesGauge.createBadge(score));
 });
}
document.getElementById("data-controls").addEventListener("click",()=>chrome.tabs.create({url:chrome.runtime.getURL("data.html")}));
document.getElementById("ai-settings").addEventListener("click",()=>chrome.tabs.create({url:chrome.runtime.getURL("ai-settings.html")}));
document.getElementById("insights").addEventListener("click",()=>chrome.runtime.openOptionsPage());
document.getElementById("clear").addEventListener("click",()=>{
 if(confirm("Delete your locally saved vibe history?"))chrome.storage.local.remove("myvibeHistory",refresh);
});
refresh();
