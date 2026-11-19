"use strict";
const {POLICY,schema,validateResult}=require("./policy.js");
function extractText(payload){
 const chunks=[];
 for(const item of payload?.output||[])for(const part of item.content||[])if(part.type==="output_text"&&typeof part.text==="string")chunks.push(part.text);
 if(!chunks.length)throw new Error("No textual AI response");
 return chunks.join("\n");
}
function makeClient({apiKey,model,fetcher=globalThis.fetch}){
 if(!apiKey||!model)throw new Error("Missing OPENAI_API_KEY or MYVIBE_MODEL");
 return async function analyze(text,context=""){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetcher("https://api.openai.com/v1/responses",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+apiKey},
    signal:controller.signal,
    body:JSON.stringify({model,store:false, max_output_tokens:900,
      instructions:POLICY,
      input:[{role:"user",content:JSON.stringify({draft:text,conversationContext:context})}],
      text:{format:{type:"json_schema",name:"myvibe_tone",strict:true,schema}}
    })
   });
   if(!response.ok)throw new Error("AI provider returned "+response.status);
   const data=await response.json();
   if(data.status==="incomplete")throw new Error("Incomplete AI response");
   return validateResult(JSON.parse(extractText(data)));
  }finally{clearTimeout(timeout)}
 };
}
module.exports={extractText,makeClient};
