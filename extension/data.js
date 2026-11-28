(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 function read(){return new Promise(resolve=>chrome.storage.local.get({myvibeHistory:[],aiEnabled:false,aiToken:"",sharingPreference:{visibility:"private"},myvibeRememberedAccount:null},resolve));}
 function refresh(){
  read().then(data=>{
   const {privateSamples,untrusted}=MyVibeEvidence.partition(data.myvibeHistory);
   $("sharing-interest").checked=MyVibeSharing.normalize(data.sharingPreference).visibility==="interested";
   $("sharing-status").textContent=MyVibeSharing.description(data.sharingPreference);
   $("overview").textContent=privateSamples.length+" current-schema private samples · "+untrusted.length+" legacy or unrecognized records · "+(data.aiEnabled?"Optional AI enabled":"Optional AI disabled")+(data.myvibeRememberedAccount?" · Remembered account metadata present":"");
  });
 }
 $("open-oauth").addEventListener("click",()=>{
  // Open the local first-party console, never fetch credentials into the extension.
  chrome.tabs.create({url:"http://127.0.0.1:4318/"},()=>{
   $("oauth-status").textContent=chrome.runtime.lastError?
    "Could not open the local account console.":
    "Local account console opened. Run npm run oauth:dev if the page cannot connect.";
  });
 });
 $("save-sharing").addEventListener("click",()=>{const visibility=$("sharing-interest").checked?"interested":"private";chrome.storage.local.set({sharingPreference:{visibility}},()=>{if(chrome.runtime.lastError){$("sharing-status").textContent="Could not save sharing preference. Please retry.";}else refresh();});});
 $("export").addEventListener("click",async ()=>{
  const data=await read();
  // Exclude secrets. A local companion access token is never exported.
  const valid=(Array.isArray(data.myvibeHistory)?data.myvibeHistory:[]).filter(MyVibeEvidence.isLocalSample).slice(-MyVibeBackup.MAX_SAMPLES);
  const output={format:MyVibeBackup.FORMAT,exportedAt:new Date().toISOString(),warning:"Private draft samples are NOT verified published messages",history:MyVibeBackup.cleanHistory(valid,MyVibeEvidence)};
  const serialized=JSON.stringify(output,null,2);
  if(new TextEncoder().encode(serialized).byteLength>MyVibeBackup.MAX_BYTES){$("export-status").textContent="Export exceeds 1 MB; no file created. Reduce saved history before exporting.";return;}
  const blob=new Blob([serialized],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");link.href=url;link.download="myvibes-private-data.json";link.click();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
  $("export-status").textContent="Export prepared without local companion token.";
 });
 $("import").addEventListener("click",async()=>{
  const file=$("import-file").files?.[0],status=$("import-status"),button=$("import");
  if(!file){status.textContent="Choose a MyVibes backup first.";return;}
  if(file.size>MyVibeBackup.MAX_BYTES){status.textContent="Backup exceeds the 1 MB limit.";return;}
  button.disabled=true;status.textContent="Validating private backup…";
  try{
   const incoming=MyVibeBackup.parseBackup(await file.text(),MyVibeEvidence);
   // Read just before writing so another page's latest samples are preserved.
   const current=await read(),merged=MyVibeBackup.mergeHistory(current.myvibeHistory,incoming,MyVibeEvidence);
   await new Promise((resolve,reject)=>chrome.storage.local.set({myvibeHistory:merged},()=>chrome.runtime.lastError?reject(new Error("Could not save backup. Please retry.")):resolve()));
   status.textContent="Restored "+incoming.length+" recognized private samples. "+merged.length+" unique samples retained. AI settings and sharing preferences unchanged.";
   refresh();
  }catch(error){status.textContent="Restore not completed: "+error.message;}
  finally{button.disabled=false;$("import-file").value="";}
 });
 $("delete").addEventListener("click",()=>{
  if(!confirm("Delete all locally saved MyVibes history, remembered account and AI settings from this browser?"))return;
  chrome.storage.local.remove(["myvibeHistory","aiEnabled","aiToken","sharingPreference","myvibeCoachSettings","myvibeRememberedAccount"],()=>{
   $("delete-status").textContent=chrome.runtime.lastError?"Could not delete local data. Please retry.":"Local samples, AI settings, coach preferences, remembered account and sharing preference deleted.";refresh();
  });
 });
 refresh();
})();