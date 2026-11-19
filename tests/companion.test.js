const test=require("node:test"),assert=require("node:assert/strict");
const {createServer,secureEqual}=require("../server/server.js");
const token="very-long-development-token-12345";
async function withServer(fn){
 const server=createServer({token,analyze:async text=>({score:text==="bad"?12:50,label:"neutral",reason:"Test",confidence:"high"})});
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 try{await fn("http://127.0.0.1:"+server.address().port)}
 finally{await new Promise(resolve=>server.close(resolve))}
}
test("token required, health available, credentials compared",()=>{
 assert.throws(()=>createServer({token:"short",analyze:async()=>({})}));
 assert.equal(secureEqual(token,token),true);
 assert.equal(secureEqual("wrong",token),false);
});
test("private companion refuses missing auth and unauthorized web origins",async()=>{
 await withServer(async base=>{
  const bad=await fetch(base+"/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"hello"})});
  assert.equal(bad.status,401);
  const origin=await fetch(base+"/analyze",{method:"POST",headers:{Origin:"https://evil.example",Authorization:"Bearer "+token},body:JSON.stringify({text:"hello"})});
  assert.equal(origin.status,403);
 });
});
test("companion enforces payload validation and gives scoped result",async()=>{
 await withServer(async base=>{
  const headers={Authorization:"Bearer "+token,"Content-Type":"application/json"};
  const invalid=await fetch(base+"/analyze",{method:"POST",headers,body:JSON.stringify({text:"x".repeat(3001)})});
  assert.equal(invalid.status,400);
  const ok=await fetch(base+"/analyze",{method:"POST",headers,body:JSON.stringify({text:"Hello"})});
  assert.equal(ok.status,200);
  assert.equal((await ok.json()).score,50);
 });
});
