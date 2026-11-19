function refresh(){
 chrome.storage.local.get({myvibeHistory:[]},({myvibeHistory})=>{
  // Legacy v0.1-0.3 samples used a different baseline. Do not mix incompatible scores.
  const posts=myvibeHistory.filter(p=>p.schemaVersion===3&&Number.isFinite(p.score));
  document.getElementById("count").textContent=posts.length;
  const score=MyVibeHistory.rollingScore(posts);
  document.getElementById("score").textContent=score.toFixed(1);
  document.getElementById("share").textContent=posts.length?Math.round(posts.filter(p=>p.flags.length===0).length/posts.length*100)+"%":"—";
  document.getElementById("empty").hidden=posts.length>0;
 });
}
document.getElementById("clear").addEventListener("click",()=>{
 if(confirm("Delete your locally saved vibe history?"))chrome.storage.local.remove("myvibeHistory",refresh);
});
refresh();
