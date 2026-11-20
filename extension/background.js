/* Opt-in, user-initiated AI request. API key never enters the extension. */
const ENDPOINT="http://127.0.0.1:4317/analyze";
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message?.type!=="MYVIBE_AI_ANALYZE")return false;
 // Only accept messages from this extension's content scripts on supported sites.
 const url=sender?.url||"";
 if(sender?.id!==chrome.runtime.id||sender?.frameId!==0){
  reply({error:"Unsupported sender"});return false;
 }
 if(!/^https:\/\/(x\.com|twitter\.com|www\.reddit\.com|www\.threads\.net|bsky\.app)\//.test(url)){
  reply({error:"Unsupported source"});return false;
 }
 chrome.storage.local.get({aiEnabled:false,aiToken:"",myvibeCoachSettings:{enabled:true,disabledSites:[]}},async ({aiEnabled,aiToken,myvibeCoachSettings})=>{
  const site=new URL(url).hostname.replace(/^www\./,"").replace(/^twitter\.com$/,"x.com");
  if(!aiEnabled||!aiToken||myvibeCoachSettings?.enabled===false||myvibeCoachSettings?.disabledSites?.includes?.(site)){
   reply({error:"AI is disabled for this site or in extension settings"});return;
  }
  const text=message.text,context=message.context??"";
  if(typeof text!=="string"||!text.trim()||text.length>3000||typeof context!=="string"||context.length>1500){
   reply({error:"Draft or context too long"});return;
  }
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),14000);
  let revoked=false;
  const onSettingsChanged=(changes,area)=>{
   if(area!=="local")return;
   if(changes.aiEnabled?.newValue===false||changes.aiToken?.newValue!==undefined&&changes.aiToken.newValue!==aiToken||changes.myvibeCoachSettings){
    revoked=true;controller.abort();
   }
  };
  chrome.storage.onChanged.addListener(onSettingsChanged);
  try{
   const response=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+aiToken},
     body:JSON.stringify({text,context}),signal:controller.signal});
   if(!response.ok)throw new Error("Local companion: "+response.status);
   const raw=await response.text();
   if(raw.length>16000)throw new Error("AI response too large");
   const result=JSON.parse(raw);
   if(!result||typeof result!=="object"||Array.isArray(result))throw new Error("Invalid AI response");
   if(revoked){reply({error:"AI request cancelled after settings changed"});return;}
   reply({result});
  }catch(_error){reply({error:"AI unavailable. Local analysis remains active."})}
  finally{clearTimeout(timeout);chrome.storage.onChanged.removeListener(onSettingsChanged)}
 });
 return true;
});
