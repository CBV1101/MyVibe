(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 let report=null,requestId=0,source=null;
 const sample=[
  {text:"I disagree with that decision because the evidence suggests another approach.",date:"2026-09-01"},
  {text:"Congratulations! You deserve this!",date:"2026-09-04"},
  {text:"Your post is dumb",date:"2026-09-08"},
  {text:"Keep going! You got this!",date:"2026-09-14"},
  {text:"You're a fucking idiot",date:"2026-09-18"},
  {text:"I appreciate you",date:"2026-09-22"}
 ];
 const fmt=n=>n>0?"+"+n.toFixed(2):n.toFixed(2);
 function setError(error){$("error").hidden=!error;$("error").textContent=error?String(error.message||error):"";}
 function render(){
  $("results").hidden=!report;$("insights-export").hidden=!report;if(!report)return;
  $("score").textContent=report.score.toFixed(1);
  $("count").textContent=report.count;
  $("positive").textContent=report.positive;
  $("negative").textContent=report.negative;
  $("overview").textContent=report.negative+" messages had negative scoring signals, "+report.positive+" had positive signals and "+report.neutral+" were neutral. All numbers describe this imported sample, not your verified public score.";
  $("categories").replaceChildren();
  for(const c of report.categories.slice(0,10)){const tag=document.createElement("span");tag.className="tag";tag.textContent=c.id.replace(/-/g," ")+": "+c.count;$("categories").append(tag);}
  const selected=$("filter").value;
  $("timeline").replaceChildren();
  for(const e of report.timeline.filter(e=>selected==="all"||selected==="positive"&&e.score>50||selected==="negative"&&e.score<50||selected==="neutral"&&e.score===50).slice(-500).reverse()){
   const node=document.createElement("article");node.className="entry";
   const head=document.createElement("div");head.className="entry-head";
   const label=document.createElement("strong");label.textContent=e.date?new Date(e.date).toLocaleDateString():"Message "+e.index;
   const delta=document.createElement("span");delta.className="delta "+(e.delta>0?"positive":e.delta<0?"negative":"");delta.textContent=fmt(e.delta)+" points";
   head.append(label,delta);
   const text=document.createElement("p");text.className="message";text.textContent=e.text;
   const reasons=document.createElement("div");reasons.className="reasons";reasons.textContent=e.reasons.length?e.reasons.map(r=>r.label+" ("+r.confidence+")").join(" · "):"No positive or negative signals detected";
   const scoreline=document.createElement("div");scoreline.className="scoreline";scoreline.textContent="Message "+e.score+"/100 · Overall "+e.previous.toFixed(2)+" → "+e.after.toFixed(2);
   node.append(head,text,reasons,scoreline);
   const url=MyVibeTrace.postLink(e.uri);
   if(url){const link=document.createElement("a");link.href=url;link.target="_blank";link.rel="noopener noreferrer";link.textContent="View original Bluesky post";link.style.display="inline-block";link.style.marginTop="7px";node.append(link);}
   $("timeline").append(node);
  }
 }
 function load(records,provenance=null){report=MyVibeArchive.analyzeArchive(records,MyVibeTone,MyVibeHistory);source=provenance;$("export-status").textContent="";setError(null);render();}
 function download(content,filename,mime){const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
 $("export-json").addEventListener("click",()=>{if(!report)return;download(JSON.stringify(MyVibeTrace.exportDocument(report,source),null,2),"myvibes-analysis.json","application/json");$("export-status").textContent="Export created locally. It contains the analyzed message text.";});
 $("export-csv").addEventListener("click",()=>{if(!report)return;download(MyVibeTrace.reportCsv(report),"myvibes-analysis.csv","text/csv");$("export-status").textContent="CSV created locally. It contains the analyzed message text.";});
 $("bluesky-fetch").addEventListener("click",async()=>{
  const id=++requestId,button=$("bluesky-fetch");
  const handle=$("bluesky-handle").value;
  button.disabled=true;
  $("bluesky-status").textContent="Fetching public posts. No account login or posting permission is requested.";
  $("bluesky-source").hidden=true;
  try{
   const response=await MyVibeBluesky.fetchPublicPosts(handle);
   if(id!==requestId)return;
   if(!response.posts.length)throw new Error("No public text posts were found in the retrieved pages");
   load(response.posts.map((item,index)=>({text:item.text,date:item.date,position:index,uri:item.uri,source:item.source})),{type:"bluesky_public_feed",did:response.profile.did,handle:response.profile.handle,hasMore:response.hasMore,count:response.posts.length});
   $("bluesky-source").hidden=false;
   $("bluesky-source").textContent="Public AppView: @"+response.profile.handle+" · DID: "+response.profile.did+
    "\n"+response.posts.length+" public posts analyzed (up to "+response.requests+" feed pages)."+
    "\nRead-only public lookup, NOT account ownership verification. Feed may be incomplete and scores are private local estimates.";
   $("bluesky-status").textContent="Public posts loaded. This score cannot be published or used as a verified account score.";
  }catch(err){
   if(id===requestId){setError(err);$("bluesky-status").textContent="Import failed. Your existing analysis, if any, remains unchanged.";}
  }finally{if(id===requestId)button.disabled=false;}
 });
 $("archive").addEventListener("change",async(e)=>{
  const file=e.target.files?.[0];if(!file)return;
  const id=++requestId;$("bluesky-fetch").disabled=false;$("bluesky-status").textContent="";
  try{
   if(file.size>8*1024*1024)throw new Error("Maximum file size is 8 MB");
   const contents=await file.text();
   if(id!==requestId)return; // Clear, example or newer import won the race.
   load(MyVibeArchive.parseArchive(contents,file.name));
   $("bluesky-source").hidden=true;$("bluesky-source").textContent="";
  }catch(err){if(id===requestId){report=null;source=null;render();setError(err);}}
 });
 $("example").addEventListener("click",()=>{requestId++;$("bluesky-fetch").disabled=false;$("bluesky-status").textContent="";$("bluesky-source").hidden=true;$("bluesky-source").textContent="";load(sample.map((r,i)=>({...r,position:i})));});
 $("reset").addEventListener("click",()=>{requestId++;report=null;source=null;$("export-status").textContent="";$("archive").value="";$("bluesky-handle").value="";$("bluesky-source").hidden=true;$("bluesky-source").textContent="";$("bluesky-status").textContent="";$("bluesky-fetch").disabled=false;setError(null);render();});
 $("filter").addEventListener("change",render);
})();
