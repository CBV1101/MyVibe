"use strict";
/* Local OAuth proof-of-ownership development server; never serves a public score.
 * OAuth protocol (PKCE, PAR, DPoP) delegated to @atproto/oauth-client-node.
 */
const http=require("node:http");
const {randomBytes,timingSafeEqual}=require("node:crypto");
const {cleanHandle,isDid}=require("../extension/bluesky.js");
const MAX_PENDING=100,TTL=10*60*1000;
const token=()=>randomBytes(32).toString("base64url");
function equal(a,b){if(typeof a!=="string"||typeof b!=="string")return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&x.length>0&&timingSafeEqual(x,y);}
function cookies(req){return Object.fromEntries(String(req.headers.cookie||"").split(";").map(x=>x.trim().split("=")).filter(x=>x.length===2));}
function path(url){return new URL(url,"http://127.0.0.1");}
function createAccountServer({oauth,clock=Date.now}){
 if(!oauth||typeof oauth.authorize!=="function"||typeof oauth.callback!=="function")throw new TypeError("OAuth client required");
 const pending=new Map(),sessions=new Map();
 const server=http.createServer(async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("Content-Security-Policy","default-src 'none'; form-action 'self'; base-uri 'none'");
  const send=(code,message)=>{res.writeHead(code,{"Content-Type":"application/json; charset=utf-8"});res.end(JSON.stringify(message));};
  let url;
  try{url=path(req.url)}catch{return send(400,{error:"Invalid request"})}
  const c=cookies(req);
  if(req.method==="GET"&&url.pathname==="/health")return send(200,{status:"ok",publicScores:false});
  if(req.method==="GET"&&url.pathname==="/oauth/start"){
   try{
    const handle=cleanHandle(url.searchParams.get("handle"));
    for(const [k,v] of pending)if(clock()-v.created>TTL)pending.delete(k);
    if(pending.size>=MAX_PENDING)return send(429,{error:"Too many pending logins"});
    const browser=token(),state=token();
    pending.set(browser,{state,created:clock()});
    const destination=await oauth.authorize(handle,{state});
    const parsed=new URL(String(destination));
    if(parsed.protocol!=="https:")throw new Error("OAuth authorization URL must be HTTPS");
    // Only an AT Protocol SDK-produced URL is accepted; not a user-supplied redirect.
    res.writeHead(302,{"Location":parsed.toString(),"Set-Cookie":"mv_oauth="+browser+"; HttpOnly; SameSite=Lax; Path=/oauth; Max-Age=600"});
    return res.end();
   }catch(_err){return send(400,{error:"Unable to start account linking"})}
  }
  if(req.method==="GET"&&url.pathname==="/oauth/callback"){
   const browser=c.mv_oauth,p=browser&&pending.get(browser);
   res.setHeader("Set-Cookie","mv_oauth=; HttpOnly; SameSite=Lax; Path=/oauth; Max-Age=0");
   // Must have initiated this flow in the same browser, and not expired.
   if(!p||clock()-p.created>TTL)return send(403,{error:"Login session expired or not initiated here"});
   pending.delete(browser); // one use even if provider rejects callback
   try{
    const {session,state}=await oauth.callback(url.searchParams);
    if(!equal(p.state,state)||!isDid(session?.did)){
     // SDK may have created a session; revoke it if possible, never associate with browser.
     if(session?.signOut)await session.signOut().catch(()=>{});
     return send(403,{error:"Account link verification failed"});
    }
    const sid=token();
    sessions.set(sid,{did:session.did,linkedAt:clock()});
    res.setHeader("Set-Cookie",["mv_session="+sid+"; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600","mv_oauth=; HttpOnly; SameSite=Lax; Path=/oauth; Max-Age=0"]);
    return send(200,{linked:true,did:session.did,notice:"Local development connection only. Public badge disabled."});
   }catch(_err){return send(400,{error:"OAuth callback could not be verified"})}
  }
  const sid=c.mv_session,connected=sid&&sessions.get(sid);
  if(req.method==="GET"&&url.pathname==="/account"){
   if(!connected)return send(200,{linked:false,publicScore:null,publicBadgeEnabled:false});
   return send(200,{linked:true,did:connected.did,linkedAt:connected.linkedAt,publicScore:null,publicBadgeEnabled:false});
  }
  if(req.method==="POST"&&url.pathname==="/disconnect"){
   // Require no cross-origin browser requests and enforce Fetch Metadata when supplied.
   const origin=req.headers.origin;
   const site=req.headers["sec-fetch-site"];
   if(origin&&origin!=="http://127.0.0.1:"+server.address()?.port)return send(403,{error:"Foreign origin"});
   if(site&&site!=="same-origin"&&site!=="none")return send(403,{error:"Foreign request"});
   if(!connected)return send(401,{error:"Not connected"});
   // Double submit token is required, supplied by a same-origin account page later.
   if(!equal(req.headers["x-myvibe-csrf"],sid))return send(403,{error:"CSRF validation required"});
   sessions.delete(sid);
   try{await oauth.revoke?.(connected.did)}catch(_err){/* local session still revoked */ }
   res.setHeader("Set-Cookie","mv_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
   return send(200,{linked:false,publicScore:null});
  }
  return send(404,{error:"Not found"});
 });
 return {server,pending,sessions};
}
function createStore(){const m=new Map();return {set:async(k,v)=>{m.set(k,v)},get:async k=>m.get(k),del:async k=>{m.delete(k)}};}
async function makeOAuthClient(clientId){
 if(!/^https:\/\/[^/?#]+(?:\/[^?#]*)?$/.test(clientId))throw new Error("MYVIBE_ATPROTO_CLIENT_ID must be a hosted HTTPS metadata document URL");
 const {NodeOAuthClient}=await import("@atproto/oauth-client-node");
 return NodeOAuthClient.fromClientId({clientId,stateStore:createStore(),sessionStore:createStore()});
}
if(require.main===module)(async()=>{
 try{
  // This service MUST NOT be Internet exposed. Production needs persistent encrypted
  // session stores, TLS, account identities, vetted metadata and CSRF handling.
  const client=await makeOAuthClient(process.env.MYVIBE_ATPROTO_CLIENT_ID||"");
  const {server}=createAccountServer({oauth:client});
  server.listen(4318,"127.0.0.1",()=>process.stdout.write("MyVibe OAuth development server on 127.0.0.1:4318\n"));
 }catch(e){process.stderr.write("OAuth setup failed: "+e.message+"\n");process.exitCode=1}
})();
module.exports={createAccountServer,makeOAuthClient,createStore,equal};
