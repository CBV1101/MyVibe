(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 function read(){return new Promise(resolve=>chrome.storage.local.get({myvibeHistory:[],aiEnabled:false,aiToken:""},resolve));}
 function refresh(){
  read().then(data=>{
   const {privateSamples,untrusted}=MyVibeEvidence.partition(data.myvibeHistory);
   $("overview").textContent=privateSamples.length+" current-schema private samples · "+untrusted.length+" legacy or unrecognized records · "+(data.aiEnabled?"Optional AI enabled":"Optional AI disabled");
  });
 }
 $("export").addEventListener("click",async ()=>{
  const data=await read();
  // Exclude secrets. A local companion access token is never exported.
  const output={format:"myvibes-private-export-v1",exportedAt:new Date().toISOString(),warning:"Private draft samples are NOT verified published messages",history:Array.isArray(data.myvibeHistory)?data.myvibeHistory:[],aiEnabled:Boolean(data.aiEnabled)};
  const blob=new Blob([JSON.stringify(output,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");link.href=url;link.download="myvibes-private-data.json";link.click();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
  $("export-status").textContent="Export prepared without local companion token.";
 });
 $("delete").addEventListener("click",()=>{
  if(!confirm("Delete all locally saved MyVibes history and AI settings from this browser?"))return;
  chrome.storage.local.remove(["myvibeHistory","aiEnabled","aiToken"],()=>{
   $("delete-status").textContent="Local samples and AI settings deleted.";refresh();
  });
 });
 refresh();
})();