"use strict";
const http=require("node:http");
const {timingSafeEqual}=require("node:crypto");
const {makeClient}=require("./ai.js");
const HOST="127.0.0.1",PORT=Number(process.env.MYVIBE_PORT||4317),MAX_BODY=7000;
function secureEqual(a,b){const x=Buffer.from(a||""),y=Buffer.from(b||"");return x.length===y.length&&x.length>0&&timingSafeEqual(x,y);}
function createServer({token,analyze}){
 if(!token||token.length<24)throw new Error("MYVIBE_LOCAL_TOKEN must be at least 24 characters");
 if(typeof analyze!=="function")throw new Error("AI analyzer required");
 let lastRequests=[];
 return http.createServer(async(req,res)=>{
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  // No permissive CORS: browser sites cannot invoke this service directly.
  const send=(code,body)=>{res.statusCode=code;res.end(JSON.stringify(body));};
  if(req.url==="/health"&&req.method==="GET")return send(200,{status:"ok",mode:"local-companion"});
  if(req.url!=="/analyze"||req.method!=="POST")return send(404,{error:"Not found"});
  const origin=req.headers.origin;
  if(origin && !/^chrome-extension:\/\/[a-z]{32}$/.test(origin))return send(403,{error:"Not permitted"});
  if(!secureEqual((req.headers.authorization||"").replace(/^Bearer /,""),token))return send(401,{error:"Unauthorized"});
  const now=Date.now();lastRequests=lastRequests.filter(time=>now-time<60000);
  if(lastRequests.length>=20)return send(429,{error:"Rate limit reached"});
  lastRequests.push(now);
  let body="";
  try{
   for await(const chunk of req){
    body+=chunk.toString("utf8");
    if(Buffer.byteLength(body)>MAX_BODY)return send(413,{error:"Request too large"});
   }
   const value=JSON.parse(body);
   const text=value?.text,context=value?.context??"";
   if(typeof text!=="string"||!text.trim()||text.length>3000||typeof context!=="string"||context.length>1500)return send(400,{error:"Invalid draft or context"});
   const result=await analyze(text,context);
   return send(200,result);
  }catch(_error){
   // Do not log private post contents or provider responses.
   return send(502,{error:"Analysis unavailable; local tone coaching is still available"});
  }
 });
}
if(require.main===module){
 try{
  const key=process.env.OPENAI_API_KEY,model=process.env.MYVIBE_MODEL,token=process.env.MYVIBE_LOCAL_TOKEN;
  const server=createServer({token,analyze:makeClient({apiKey:key,model})});
  server.listen(PORT,HOST,()=>process.stdout.write("MyVibe local AI companion on "+HOST+":"+PORT+"\n"));
 }catch(error){process.stderr.write(error.message+"\n");process.exitCode=1}
}
module.exports={createServer,secureEqual};
