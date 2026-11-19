/* Opt-in, user-initiated AI request. API key never enters the extension. */
const ENDPOINT="http://127.0.0.1:4317/analyze";
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message?.type!=="MYVIBE_AI_ANALYZE")return false;
 // Only accept messages from this extension's content scripts on supported sites.
 const url=sender.url||"";
 if(!/^https:\/\/(x\.com|twitter\.com|www\.reddit\.com|www\.threads\.net|bsky\.app)\//.test(url)){
  reply({error:"Unsupported source"});return false;
 }
 chrome.storage.local.get({aiEnabled:false,aiToken:""},async ({aiEnabled,aiToken})=>{
  if(!aiEnabled||!aiToken){reply({error:"Enable and configure AI in the extension settings"});return;}
  const text=message.text,context=message.context??"";
  if(typeof text!=="string"||!text.trim()||text.length>3000||typeof context!=="string"||context.length>1500){
   reply({error:"Draft or context too long"});return;
  }
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),14000);
  try{
   const response=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+aiToken},
     body:JSON.stringify({text,context}),signal:controller.signal});
   if(!response.ok)throw new Error("Local companion: "+response.status);
   reply({result:await response.json()});
  }catch(_error){reply({error:"AI unavailable. Local analysis remains active."})}
  finally{clearTimeout(timeout)}
 });
 return true;
});
