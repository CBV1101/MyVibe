(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 let report=null,requestId=0,source=null,visibleCount=100;
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
 function clearFilters(){ $("search").value="";$("filter").value="all";$("date-from").value="";$("date-to").value="";$("signal").value="";visibleCount=100; }
 function renderTrends(){
  $("trend-chart").replaceChildren();
  $("trend-rows").replaceChildren();$("impact").replaceChildren();$("trend-status").textContent="";
  if(!report)return;
  const t=MyVibeTrends.summarize(report.timeline,$("period").value);
  $("trend-status").textContent=t.periods.length+" dated periods; "+t.undated+" messages without usable dates.";
  for(const p of t.periods.slice(-12)){
   const row=document.createElement("div");row.className="trend-bar";const label=document.createElement("span");label.textContent=p.period;const track=document.createElement("div");track.className="trend-track";const fill=document.createElement("div");fill.className="trend-fill";fill.style.width=p.average+"%";track.append(fill);const value=document.createElement("span");value.textContent=p.average.toFixed(1);row.append(label,track,value);$("trend-chart").append(row);
  }
  for(const p of t.periods){
   const tr=document.createElement("tr");
   for(const v of [p.period,p.average.toFixed(1),p.count,p.positive,p.neutral,p.negative]){
    const td=document.createElement("td");td.textContent=v;tr.append(td);
   }
   $("trend-rows").append(tr);
  }
  for(const e of t.strongest){
   const li=document.createElement("li");const button=document.createElement("button");button.type="button";button.textContent="Message "+e.index+": "+fmt(e.delta)+" rolling points (message score "+e.score+"/100)";button.addEventListener("click",()=>{clearFilters();visibleCount=report.timeline.length-report.timeline.findIndex(x=>x.index===e.index);render();const target=$("message-"+e.index);target?.focus();target?.scrollIntoView({block:"center"});});li.append(button);$("impact").append(li);
  }
 }
 function render(){
  renderTrends();$("results").hidden=!report;$("insights-export").hidden=!report;if(!report){$("timeline").replaceChildren();$("timeline-status").textContent="";$("show-more").hidden=true;return;}
  $("score").textContent=report.score.toFixed(1);
  $("count").textContent=report.count;
  $("positive").textContent=report.positive;
  $("negative").textContent=report.negative;
  $("overview").textContent=report.negative+" messages had negative scoring signals, "+report.positive+" had positive signals and "+report.neutral+" were neutral. All numbers describe this imported sample, not your verified public score.";
  $("categories").replaceChildren();
  for(const c of report.categories.slice(0,10)){const tag=document.createElement("span");tag.className="tag";tag.textContent=c.id.replace(/-/g," ")+": "+c.count;$("categories").append(tag);}
  const selected=$("filter").value,search=$("search").value.trim().toLocaleLowerCase();
  $("timeline").replaceChildren();
  const from=$("date-from").value,to=$("date-to").value,signal=$("signal").value;
  const matches=report.timeline.filter(e=>(!from&&!to||e.date&&(!from||e.date.slice(0,10)>=from)&&(!to||e.date.slice(0,10)<=to))&&(!signal||e.reasons.some(r=>r.id===signal))&&(selected==="all"||selected==="positive"&&e.score>50||selected==="negative"&&e.score<50||selected==="neutral"&&e.score===50)&&(!search||e.text.toLocaleLowerCase().includes(search))).reverse();
  $("timeline-status").textContent="Showing "+Math.min(visibleCount,matches.length)+" of "+matches.length+" matching messages";
  $("show-more").hidden=matches.length<=visibleCount;
  for(const e of matches.slice(0,visibleCount)){
   const node=document.createElement("article");node.className="entry";node.id="message-"+e.index;node.tabIndex=-1;
   const head=document.createElement("div");head.className="entry-head";
   const label=document.createElement("strong");label.textContent="Message "+e.index+(e.date?" · "+new Date(e.date).toLocaleDateString():"");
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
 function load(records,provenance=null){visibleCount=100;$("search").value="";$("filter").value="all";$("include-text").checked=false;report=MyVibeArchive.analyzeArchive(records,MyVibeTone,MyVibeHistory);source=provenance;clearFilters();$("signal").replaceChildren(new Option("All signals",""));for(const c of report.categories)$("signal").append(new Option(c.id.replace(/-/g," "),c.id));$("export-status").textContent="";setError(null);render();}
 function download(content,filename,mime){const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
 $("export-json").addEventListener("click",()=>{if(!report)return;download(JSON.stringify(MyVibeTrace.exportDocument(report,source,{includeText:$("include-text").checked}),null,2),"myvibes-analysis.json","application/json");$("export-status").textContent="Export created locally. Message text "+($("include-text").checked?"included by your choice.":"excluded.");});
 $("export-csv").addEventListener("click",()=>{if(!report)return;download(MyVibeTrace.reportCsv(report,{includeText:$("include-text").checked}),"myvibes-analysis.csv","text/csv");$("export-status").textContent="CSV created locally. Message text "+($("include-text").checked?"included by your choice.":"excluded.");});
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
  const id=++requestId;$("bluesky-fetch").disabled=false;$("bluesky-status").textContent="";setError(null);
  try{
   if(file.size>8*1024*1024)throw new Error("Maximum file size is 8 MB");
   const contents=await file.text();
   if(id!==requestId)return; // Clear, example or newer import won the race.
   load(MyVibeArchive.parseArchive(contents,file.name));
   $("bluesky-source").hidden=true;$("bluesky-source").textContent="";
  }catch(err){if(id===requestId){setError(err);$("archive").value="";}}
 });
 $("example").addEventListener("click",()=>{requestId++;$("bluesky-fetch").disabled=false;$("bluesky-status").textContent="";$("bluesky-source").hidden=true;$("bluesky-source").textContent="";load(sample.map((r,i)=>({...r,position:i})));});
 $("reset").addEventListener("click",()=>{requestId++;report=null;source=null;clearFilters();$("signal").replaceChildren(new Option("All signals",""));visibleCount=100;$("search").value="";$("include-text").checked=false;$("export-status").textContent="";$("archive").value="";$("filter").value="all";$("timeline-status").textContent="";$("timeline").replaceChildren();$("show-more").hidden=true;$("bluesky-handle").value="";$("bluesky-source").hidden=true;$("bluesky-source").textContent="";$("bluesky-status").textContent="";$("bluesky-fetch").disabled=false;setError(null);render();});
 for(const id of ["date-from","date-to","signal"])$(id).addEventListener("change",()=>{visibleCount=100;render();});
 $("clear-filters").addEventListener("click",()=>{clearFilters();render();});
 $("period").addEventListener("change",renderTrends);
 $("filter").addEventListener("change",()=>{visibleCount=100;render();});
 $("search").addEventListener("input",()=>{visibleCount=100;render();});
 $("show-more").addEventListener("click",()=>{visibleCount+=100;render();});
})();
