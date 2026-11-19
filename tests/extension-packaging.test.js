"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../extension"),manifest=JSON.parse(fs.readFileSync(path.join(root,"manifest.json"),"utf8"));
const exists=relative=>{
 assert.equal(relative.includes(".."),false,"File path escapes extension: "+relative);
 assert.ok(fs.existsSync(path.join(root,relative)),"Missing packaged file: "+relative);
};
test("MV3 extension references existing scripts and user interfaces",()=>{
 assert.equal(manifest.manifest_version,3);
 assert.ok(manifest.content_scripts.length>0);
 for(const entry of manifest.content_scripts)for(const script of entry.js)exists(script);
 exists(manifest.background.service_worker);
 exists(manifest.action.default_popup);
 exists(manifest.options_page);
 for(const html of ["popup.html","insights.html","data.html","ai-settings.html"]){
  exists(html);
  const source=fs.readFileSync(path.join(root,html),"utf8");
  for(const match of source.matchAll(/<script\s+src="([^"]+)"/g))exists(match[1]);
  assert.doesNotMatch(source,/<script\s+(?:src="https?:|type="module")/i,"Unexpected remote or module script in "+html);
 }
});
test("permissions stay scoped and do not enable public score publication",()=>{
 assert.deepEqual(manifest.permissions,["storage"]);
 assert.ok(!manifest.host_permissions.includes("<all_urls>"));
 assert.ok(!manifest.host_permissions.includes("https://*/*"));
 assert.ok(manifest.host_permissions.every(p=>p.startsWith("https://public.api.bsky.app/")||p.startsWith("http://127.0.0.1:4317/")));
 const evidence=require("../extension/evidence.js");
 const sharing=require("../extension/sharing.js");
 assert.equal(evidence.publicBadgeScore([]),null);
 assert.equal(sharing.canPublish({visibility:"interested"},[]),false);
});
