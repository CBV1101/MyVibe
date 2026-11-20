(() => {
 "use strict";
 if(window.__myVibeInstalled)return;
 window.__myVibeInstalled=true;
 const selectors='textarea,[contenteditable="true"],[role="textbox"]';
 let active=null,review=null,requestSerial=0;
 const panel=document.createElement("aside");
 panel.id="myvibe-tone-panel";
 panel.setAttribute("aria-label","MyVibe writing coach");
 panel.style.cssText="display:none;position:fixed;z-index:2147483647;max-width:350px;width:calc(100vw - 24px);max-height:min(75vh,600px);overflow:auto;background:#161526;color:#f9f7ff;border:1px solid #76679b;border-radius:12px;padding:13px;font:13px/1.45 system-ui,sans-serif;box-shadow:0 12px 30px #0006";
 panel.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px"><strong>✦ MyVibes</strong><button type="button" data-close style="border:0;background:none;color:#fff;cursor:pointer" aria-label="Close writing coach">×</button></div><p data-status></p><div data-flags style="white-space:pre-line"></div><button type="button" data-rewrite style="display:none;margin-top:10px;border:0;border-radius:7px;padding:8px;background:#c6b4ff;color:#161526;cursor:pointer">Use local suggestion</button><details data-context style="margin-top:10px"><summary style="cursor:pointer">Optional conversation context for AI</summary><label style="display:block;margin:8px 0 5px" for="myvibe-ai-context">Paste only context you agree to share</label><textarea id="myvibe-ai-context" data-context-value rows="3" maxlength="1500" style="width:100%;max-width:100%;background:#27263c;color:#fff;border:1px solid #77708d;border-radius:6px;padding:7px"></textarea><small>Context is sent only when you click Analyze with AI. Nothing is collected automatically.</small></details><button type="button" data-ai style="display:block;margin-top:10px;border:1px solid #a8c8ff;border-radius:7px;padding:7px;background:#263854;color:#fff;cursor:pointer">Analyze with AI (opt-in)</button><div data-ai-result role="status" style="display:none;margin-top:10px;white-space:pre-wrap;overflow-wrap:anywhere;padding:9px;background:#27354a;border-radius:7px"></div><div data-ai-preview style="display:none;margin-top:8px"><strong>Optional rewrite preview</strong><p data-ai-text style="white-space:pre-wrap;overflow-wrap:anywhere"></p><button type="button" data-ai-apply style="border:0;border-radius:7px;padding:7px;background:#c6b4ff;color:#161526;cursor:pointer">Use AI wording</button></div><button type="button" data-record style="display:block;margin-top:10px;border:1px solid #8b7bb5;border-radius:7px;padding:7px;background:transparent;color:#fff;cursor:pointer">Add to my vibe history</button><small style="display:block;margin-top:9px;color:#c0bdd0">Heuristic scoring stays local · private draft sample only</small>';
 document.documentElement.appendChild(panel);
 const el=s=>panel.querySelector(s);
 function textOf(node){return node?.matches("textarea,input")?node.value:(node?.innerText||"");}
 function isEditor(node){return !panel.contains(node)&&!!(node?.matches?.(selectors)||node?.isContentEditable);}
 function clearReview(){
  review=null;requestSerial++;
  el("[data-ai-result]").style.display="none";
  el("[data-ai-preview]").style.display="none";
  el("[data-ai-text]").textContent="";
  el("[data-ai]").disabled=false;
 }
 function draw(){
  if(!active||!document.contains(active)){panel.style.display="none";return;}
  const text=textOf(active).trim();
  if(!text){panel.style.display="none";return;}
  const result=MyVibeTone.analyze(text);
  el("[data-status]").textContent="Draft vibe: "+result.score+"/100 · "+(result.score>50?"Positive":result.score===50?"Neutral":"Consider revising");
  el("[data-flags]").textContent=(result.positives.length?"✓ Positive signals: "+result.positives.map(p=>p.label).join(", ")+"\n\n":"")+(result.flags.length?result.flags.map(f=>"• "+f.label+" ("+f.confidence+" confidence)\n  "+f.interpretation+"\n  Consider: "+f.tip).join("\n\n"):"No attacks detected. Disagreement and ordinary discussion are neutral.");
  el("[data-rewrite]").style.display=result.changed?"block":"none";
  const rect=active.getBoundingClientRect(),width=Math.min(350,window.innerWidth-16);
  panel.style.left=Math.max(8,Math.min(window.innerWidth-width-8,rect.left))+"px";
  panel.style.top=(rect.bottom+260<window.innerHeight?rect.bottom+8:Math.max(8,rect.top-Math.min(380,window.innerHeight*.75)))+"px";
  panel.style.display="block";
 }
 function insertIntoEditor(editor,suggestion){
  if(!editor||!document.contains(editor)||!suggestion)return false;
  editor.focus();
  if(editor.matches("textarea,input")){
   const proto=editor instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
   Object.getOwnPropertyDescriptor(proto,"value").set.call(editor,suggestion);
  }else{
   const selection=window.getSelection(),range=document.createRange();
   range.selectNodeContents(editor);selection.removeAllRanges();selection.addRange(range);
   if(!document.execCommand("insertText",false,suggestion))editor.textContent=suggestion;
  }
  editor.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertReplacementText",data:suggestion}));
  clearReview();draw();return true;
 }
 let debounce;
 document.addEventListener("focusin",event=>{
  if(!isEditor(event.target))return;
  if(active!==event.target){active=event.target;clearReview();el("[data-context-value]").value="";}
  draw();
 },true);
 document.addEventListener("input",event=>{
  if(!isEditor(event.target))return;
  if(active!==event.target){active=event.target;el("[data-context-value]").value="";}
  clearReview();clearTimeout(debounce);debounce=setTimeout(draw,220);
 },true);
 el("[data-context-value]").addEventListener("input",clearReview);
 el("[data-close]").addEventListener("click",()=>{active=null;clearReview();panel.style.display="none";});
 el("[data-rewrite]").addEventListener("click",()=>{
  if(!active)return;
  const {suggestion,changed}=MyVibeTone.analyze(textOf(active));if(changed)insertIntoEditor(active,suggestion);
 });
 el("[data-ai]").addEventListener("click",()=>{
  if(!active)return;
  const editor=active,requestedText=textOf(editor).trim(),context=el("[data-context-value]").value;
  if(!requestedText)return;
  const area=el("[data-ai-result]"),button=el("[data-ai]");
  area.style.display="block";
  el("[data-ai-preview]").style.display="none";
  if(requestedText.length>3000||context.length>1500){area.textContent="Draft or context exceeds the limit.";return;}
  const serial=++requestSerial;
  area.textContent="Requesting AI interpretation…";button.disabled=true;
  chrome.runtime.sendMessage({type:"MYVIBE_AI_ANALYZE",text:requestedText,context},(response)=>{
   if(serial!==requestSerial)return;
   button.disabled=false;
   if(!MyVibeReview.sameDraft(active,editor,textOf(editor),requestedText)||el("[data-context-value]").value!==context){area.textContent="Draft or context changed. Analyze again.";return;}
   if(chrome.runtime.lastError||response?.error||!response?.result){area.textContent=response?.error||"AI unavailable. Local coaching is still available.";return;}
   try{
    const result=MyVibeReview.normalizeReview(response.result);
    area.textContent="AI interpretation ("+result.confidence+" confidence): "+result.interpretation+"\nMessage estimate: "+result.score+"/100. "+result.reason;
    review={editor,text:requestedText,context,rewrite:result.rewrite};
    if(result.rewrite&&result.rewrite!==requestedText){
     el("[data-ai-text]").textContent=result.rewrite;
     el("[data-ai-preview]").style.display="block";
    }
   }catch(_error){area.textContent="Invalid AI feedback. Your draft has not been changed.";}
  });
 });
 el("[data-ai-apply]").addEventListener("click",()=>{
  if(!review)return;
  if(!MyVibeReview.sameDraft(active,review.editor,textOf(review.editor),review.text)||el("[data-context-value]").value!==review.context){
   el("[data-ai-result]").textContent="Draft or context changed; reanalyze before applying a rewrite.";
   el("[data-ai-preview]").style.display="none";review=null;return;
  }
  insertIntoEditor(review.editor,review.rewrite);
 });
 el("[data-record]").addEventListener("click",()=>{
  if(!active)return;
  const result=MyVibeTone.analyze(textOf(active));
  if(result.score===null)return;
  const editor=active,originalText=textOf(editor);
  chrome.storage.local.get({myvibeHistory:[]},({myvibeHistory})=>{
   // Saving is an explicit action for this exact draft, not a later editor state.
   // Do not let a delayed storage read record text after the user edits or closes it.
   if(active!==editor||!document.contains(editor)||textOf(editor)!==originalText)return;
   const entry=MyVibeEvidence.createDraftSample({result,platform:location.hostname});
   const history=Array.isArray(myvibeHistory)?myvibeHistory:[];
   chrome.storage.local.set({myvibeHistory:[...history,entry].slice(-500)});
   el("[data-record]").textContent="Added ✓";
   setTimeout(()=>el("[data-record]").textContent="Add to my vibe history",1200);
  });
 });
})();