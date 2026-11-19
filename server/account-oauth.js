"use strict";
/* Local OAuth proof-of-ownership development server; never serves a public score.
 * OAuth protocol (PKCE, PAR, DPoP) delegated to @atproto/oauth-client-node.
 */
const http=require("node:http");
const fs=require("node:fs");
const pathModule=require("node:path");
const {randomBytes,timingSafeEqual}=require("node:crypto");
const {cleanHandle,isDid}=require("../extension/bluesky.js");
const {getOwnedPosts}=require("./owned-posts.js");
const MAX_PENDING=100,TTL=10*60*1000,SESSION_TTL=60*60*1000;
const LOCAL_REDIRECT_URI="http://127.0.0.1:4318/oauth/callback";
const LOCAL_CLIENT_ID="http://localhost?redirect_uri="+encodeURIComponent(LOCAL_REDIRECT_URI)+"&scope=atproto";
function resolveClientId(value){
 const proposed=String(value||"").trim();
 if(!proposed||proposed==="localhost")return LOCAL_CLIENT_ID;
 const parsed=new URL(proposed);
 if(parsed.protocol!=="https:"||!parsed.hostname||parsed.username||parsed.password||parsed.hash)
  throw new Error("MYVIBE_ATPROTO_CLIENT_ID must be a public HTTPS metadata URL or 'localhost'");
 return parsed.toString();
}
const STATIC={"/":"account.html","/account-ui.js":"account-ui.js","/account.css":"account.css","/tone.js":"../extension/tone.js","/history.js":"../extension/history.js","/archive.js":"../extension/archive.js","/trace.js":"../extension/trace.js","/owner-review.js":"owner-review.js"};
const token=()=>randomBytes(32).toString("base64url");
function equal(a,b){if(typeof a!=="string"||typeof b!=="string")return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&x.length>0&&timingSafeEqual(x,y);}
function cookies(req){return Object.fromEntries(String(req.headers.cookie||"").split(";").map(x=>x.trim().split("=")).filter(x=>x.length===2));}
function path(url){return new URL(url,"http://127.0.0.1");}
function createAccountServer({oauth,clock=Date.now,fetchPosts=getOwnedPosts}){
 if(!oauth||typeof oauth.authorize!=="function"||typeof oauth.callback!=="function")throw new TypeError("OAuth client required");
 const pending=new Map(),sessions=new Map();
 const server=http.createServer(async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("Content-Security-Policy","default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'");
  const send=(code,message)=>{res.writeHead(code,{"Content-Type":"application/json; charset=utf-8"});res.end(JSON.stringify(message));};
  let url;
  try{url=path(req.url)}catch{return send(400,{error:"Invalid request"})}
  // Explicit host check blocks browser DNS-rebinding tricks against loopback.
  const expectedHost="127.0.0.1:"+server.address()?.port;
  if(req.headers.host!==expectedHost)return send(403,{error:"Host not permitted"});
  if(req.method==="GET"&&Object.hasOwn(STATIC,url.pathname)){
   const file=STATIC[url.pathname];
   const type=file.endsWith(".js")?"text/javascript; charset=utf-8":file.endsWith(".css")?"text/css; charset=utf-8":"text/html; charset=utf-8";
   res.writeHead(200,{"Content-Type":type});
   return res.end(fs.readFileSync(pathModule.join(__dirname,file)));
  }
  const c=cookies(req);
  for(const [id,entry] of sessions)if(clock()-entry.linkedAt>=SESSION_TTL)sessions.delete(id);
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
     if(typeof session?.signOut==="function")try{await session.signOut()}catch{}
     return send(403,{error:"Account link verification failed"});
    }
    const sid=token();
    sessions.set(sid,{did:session.did,linkedAt:clock(),csrf:token()});
    res.setHeader("Set-Cookie",["mv_session="+sid+"; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600","mv_oauth=; HttpOnly; SameSite=Lax; Path=/oauth; Max-Age=0"]);
    return send(200,{linked:true,did:session.did,notice:"Local development connection only. Public badge disabled."});
   }catch(_err){return send(400,{error:"OAuth callback could not be verified"})}
  }
  const sid=c.mv_session,connected=sid&&sessions.get(sid);
  if(req.method==="GET"&&url.pathname==="/account"){
   if(!connected)return send(200,{linked:false,publicScore:null,publicBadgeEnabled:false});
   return send(200,{linked:true,did:connected.did,linkedAt:connected.linkedAt,publicScore:null,publicBadgeEnabled:false,csrf:connected.csrf});
  }
  if(req.method==="GET"&&url.pathname==="/account/posts"){
   if(!connected)return send(401,{error:"Authentication required"});
   // A website must not be able to query the owner's session via localhost.
   const site=req.headers["sec-fetch-site"],origin=req.headers.origin;
   if(site&&site!=="same-origin"&&site!=="none")return send(403,{error:"Cross-site request denied"});
   if(origin&&origin!=="http://"+expectedHost)return send(403,{error:"Foreign origin"});
   // Same-origin page must demonstrate a per-session CSRF token even for read requests.
   if(!equal(req.headers["x-myvibe-csrf"],connected.csrf))return send(403,{error:"Session validation required"});
   // Do not accept actor, handle or DID query parameters from the caller.
   if([...url.searchParams].length)return send(400,{error:"Account selection is not supported"});
   const now=clock();
   if(Number.isFinite(connected.lastPostRead)&&now-connected.lastPostRead<15000)return send(429,{error:"Retry after 15 seconds"});
   connected.lastPostRead=now;
   try{
    const result=await fetchPosts(connected.did);
    // Revalidate even when the data supplier is swapped during tests or upgrades.
    if(result?.did!==connected.did||!Array.isArray(result?.posts)||
       result.posts.length>300||result.posts.some(p=>p.authorDid!==connected.did||typeof p.text!=="string"||p.text.length>4000||!p.text.trim()||typeof p.uri!=="string"||!p.uri.startsWith("at://"+connected.did+"/app.bsky.feed.post/"))
      throw new Error("Post source attribution mismatch");
    return send(200,{source:"bluesky_public_appview",did:connected.did,posts:result.posts,complete:false,warning:"This feed is incomplete and scores are private heuristic estimates.",hasMore:Boolean(result.hasMore),verifiedAccountSession:true,publicScore:null,publicBadgeEnabled:false});
   }catch(_error){return send(502,{error:"Could not retrieve account posts"})}
  }
  if(req.method==="POST"&&url.pathname==="/disconnect"){
   // Require no cross-origin browser requests and enforce Fetch Metadata when supplied.
   const origin=req.headers.origin;
   const site=req.headers["sec-fetch-site"];
   if(origin&&origin!=="http://"+expectedHost)return send(403,{error:"Foreign origin"});
   if(site&&site!=="same-origin"&&site!=="none")return send(403,{error:"Foreign request"});
   if(!connected)return send(401,{error:"Not connected"});
   // Double submit token is required, supplied by a same-origin account page later.
   if(!equal(req.headers["x-myvibe-csrf"],connected.csrf))return send(403,{error:"CSRF validation required"});
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
 const resolved=resolveClientId(clientId);
 const {NodeOAuthClient}=await import("@atproto/oauth-client-node");
 return NodeOAuthClient.fromClientId({clientId:resolved,stateStore:createStore(),sessionStore:createStore()});
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
module.exports={createAccountServer,makeOAuthClient,createStore,equal,resolveClientId,LOCAL_CLIENT_ID,LOCAL_REDIRECT_URI};
