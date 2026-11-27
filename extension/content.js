(() => {
 "use strict";
 if(window.__myVibeInstalled)return;
 window.__myVibeInstalled=true;
 const selectors='textarea,[contenteditable="true"],[role="textbox"]';
 let active=null,review=null,requestSerial=0,coachEnabled=false,dismissed=null;
 const site=location.hostname.replace(/^www\./,"").replace(/^twitter\.com$/,"x.com");
 function allowed(settings){return settings?.enabled!==false&&(!Array.isArray(settings?.disabledSites)||!settings.disabledSites.includes(site));}
 const panel=document.createElement("aside");
 panel.id="myvibe-tone-panel";
 panel.setAttribute("aria-label","MyVibe writing coach");
 panel.style.cssText="display:none;position:fixed;z-index:2147483647;box-sizing:border-box;max-width:270px;width:calc(100vw - 24px);max-height:min(75vh,600px);overflow:auto;background:#faf9fc;color:#393544;border:1px solid #ded9e7;border-radius:12px;padding:10px;font:12px/1.4 system-ui,sans-serif;box-shadow:0 4px 16px #0002";
 panel.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px"><strong>✦ MyVibes</strong><button type="button" data-close style="border:0;background:none;color:#393544;cursor:pointer" aria-label="Close writing coach">×</button></div><p data-status></p><div data-flags style="white-space:pre-line"></div><button type="button" data-rewrite style="display:none;margin-top:10px;border:0;border-radius:7px;padding:8px;background:#c6b4ff;color:#161526;cursor:pointer">Use local suggestion</button><details data-options><summary style="cursor:pointer;color:#71628b">More options</summary><details data-context style="margin-top:10px"><summary style="cursor:pointer">Optional conversation context for AI</summary><label style="display:block;margin:8px 0 5px" for="myvibe-ai-context">Paste only context you agree to share</label><textarea id="myvibe-ai-context" data-context-value rows="3" maxlength="1500" style="width:100%;max-width:100%;background:#fff;color:#393544;border:1px solid #77708d;border-radius:6px;padding:7px"></textarea><small>Context is sent only when you click Analyze with AI. Nothing is collected automatically.</small></details><button type="button" data-ai style="display:block;margin-top:10px;border:1px solid #a8c8ff;border-radius:7px;padding:7px;background:#edf1fa;color:#393544;cursor:pointer">Analyze with AI (opt-in)</button><div data-ai-result role="status" style="display:none;margin-top:10px;white-space:pre-wrap;overflow-wrap:anywhere;padding:9px;background:#edf1fa;border-radius:7px"></div><div data-ai-preview style="display:none;margin-top:8px"><strong>Optional rewrite preview</strong><p data-ai-text style="white-space:pre-wrap;overflow-wrap:anywhere"></p><button type="button" data-ai-apply style="border:0;border-radius:7px;padding:7px;background:#c6b4ff;color:#161526;cursor:pointer">Use AI wording</button></div><small>Private feedback · AI is optional</small></details>';
 document.documentElement.appendChild(panel);
 const el=s=>panel.querySelector(s);
 function textOf(node){return node?.matches("textarea,input")?node.value:(node?.innerText||"");}
 function isEditor(node){
  if(!node||panel.contains(node)||!node.matches?.(selectors))return false;
  if(node.matches('input,[contenteditable="false"]'))return false;
  if(node.closest('[aria-hidden="true"],[inert]')||node.disabled||node.readOnly||node.getAttribute("aria-readonly")==="true")return false;
  if(node.closest('[role="search"],[role="navigation"],header,nav,[data-myvibe-ignore]'))return false;
  if(node.closest('form')?.querySelector('input[type="password"]'))return false;
  if(node.matches("textarea")&&node.type==="search")return false;
  if(node.matches("textarea"))return true;
  // Only actual editable rich-text roots, not decorative textbox containers.
  return node.isContentEditable&&!node.parentElement?.closest('[contenteditable="true"]');
 }
 function usableEditor(node){return coachEnabled&&!!node&&document.contains(node)&&isEditor(node)&&node.getClientRects().length>0;}
 function disableCoach(){coachEnabled=false;hideCoach();el("[data-context-value]").value="";}
 function clearReview(){
  review=null;requestSerial++;
  el("[data-ai-result]").style.display="none";
  el("[data-ai-preview]").style.display="none";
  el("[data-ai-text]").textContent="";
  el("[data-ai]").disabled=false;
 }
 function draw(){
  if(!usableEditor(active)){hideCoach();return;}
  const text=textOf(active).trim();
  if(!text){if(dismissed===active)dismissed=null;hideCoach();return;}
  const result=MyVibeTone.analyze(text);
  if(dismissed===active){panel.style.display="none";return;}
  if(!result.flags.length){panel.style.display="none";return;}
  el("[data-status]").textContent="";
  el("[data-flags]").textContent=result.flags.slice(0,1).map(f=>(f.label==="Identity-directed hostility"?"Hate speech":f.label)+"\nConsider: "+f.tip).join("");
  el("[data-rewrite]").style.display=result.changed?"block":"none";
  panel.style.display="block";
  positionCoach();
 }
 function insertIntoEditor(editor,suggestion){
  if(!usableEditor(editor)||!suggestion)return false;
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
 function hideCoach(){clearTimeout(debounce);active=null;clearReview();panel.style.display="none";}
 function positionCoach(){
  if(!usableEditor(active)){hideCoach();return;}
  const rect=active.getBoundingClientRect();
  if(rect.bottom<=0||rect.top>=window.innerHeight||rect.right<=0||rect.left>=window.innerWidth){panel.style.display="none";return;}
  panel.style.display="block";
  if(dismissed===active||!textOf(active).trim()||!MyVibeTone.analyze(textOf(active)).flags.length){panel.style.display="none";return;}
  const width=Math.min(270,window.innerWidth-16);
  panel.style.left=Math.max(8,Math.min(window.innerWidth-width-8,rect.left))+"px";
  const spaceBelow=window.innerHeight-rect.bottom,spaceAbove=rect.top,height=panel.getBoundingClientRect().height;
  panel.style.top=(spaceBelow>=height+8||spaceBelow>=spaceAbove?Math.max(8,Math.min(window.innerHeight-height-8,rect.bottom+8)):Math.max(8,rect.top-height-8))+"px";
 }
 chrome.storage.local.get({myvibeCoachSettings:{enabled:true,disabledSites:[]}},data=>{coachEnabled=allowed(data.myvibeCoachSettings);});
 chrome.storage.onChanged?.addListener((changes,area)=>{
  if(area!=="local"||!changes.myvibeCoachSettings)return;
  const enabled=allowed(changes.myvibeCoachSettings.newValue);
  if(!enabled)disableCoach();else{
   coachEnabled=true;
   dismissed=null;
   const focused=document.activeElement;
   if(isEditor(focused)){active=focused;clearReview();draw();}
  }
 });
 window.addEventListener("scroll",()=>{if(active)positionCoach();},{capture:true,passive:true});
 window.addEventListener("resize",()=>{if(active&&panel.style.display!=="none")positionCoach();},{passive:true});
 document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&panel.style.display!=="none"&&(panel.contains(document.activeElement)||document.activeElement===active)){
   event.stopPropagation();dismissed=active;hideCoach();el("[data-context-value]").value="";
  }
 },true);
 document.addEventListener("focusin",event=>{
  if(!coachEnabled||!isEditor(event.target))return;
  if(dismissed&&dismissed!==event.target)dismissed=null;
  if(active!==event.target){active=event.target;clearReview();el("[data-context-value]").value="";}
  draw();
 },true);
 document.addEventListener("input",event=>{
  if(!coachEnabled||!isEditor(event.target))return;
  if(active!==event.target){active=event.target;el("[data-context-value]").value="";}
  clearReview();clearTimeout(debounce);debounce=setTimeout(draw,220);
 },true);
 el("[data-context-value]").addEventListener("input",clearReview);
 // Social apps often unmount or hide composers without an input event.
 // Invalidate previews and close the coach when the editor leaves the page.
 const observer=new MutationObserver(()=>{
  if(active&&!usableEditor(active)){hideCoach();}
 });
 observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["hidden","style","class","aria-hidden","inert","contenteditable","readonly","disabled"]});
 el("[data-close]").addEventListener("click",()=>{dismissed=active;hideCoach();el("[data-context-value]").value="";});
 el("[data-rewrite]").addEventListener("click",()=>{
  if(!usableEditor(active))return;
  const {suggestion,changed}=MyVibeTone.analyze(textOf(active));if(changed)insertIntoEditor(active,suggestion);
 });
 el("[data-ai]").addEventListener("click",()=>{
  if(!usableEditor(active))return;
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
   if(!usableEditor(editor)||!MyVibeReview.sameDraft(active,editor,textOf(editor),requestedText)||el("[data-context-value]").value!==context){area.textContent="Draft or context changed. Analyze again.";return;}
   if(chrome.runtime.lastError||response?.error||!response?.result){area.textContent=response?.error||"AI unavailable. Local coaching is still available.";return;}
   try{
    const result=MyVibeReview.normalizeReview(response.result);
    area.textContent="AI interpretation ("+result.confidence+" confidence): "+result.interpretation+"\nSuggestion: "+result.reason;
    review={editor,text:requestedText,context,rewrite:result.rewrite};
    if(result.rewrite&&result.rewrite!==requestedText){
     el("[data-ai-text]").textContent=result.rewrite;
     el("[data-ai-preview]").style.display="block";
    }
   }catch(_error){area.textContent="Invalid AI feedback. Your draft has not been changed.";}
  });
 });
 el("[data-ai-apply]").addEventListener("click",()=>{
  if(!review||!usableEditor(review.editor))return;
  if(!usableEditor(review.editor)||!MyVibeReview.sameDraft(active,review.editor,textOf(review.editor),review.text)||el("[data-context-value]").value!==review.context){
   el("[data-ai-result]").textContent="Draft or context changed; reanalyze before applying a rewrite.";
   el("[data-ai-preview]").style.display="none";review=null;return;
  }
  insertIntoEditor(review.editor,review.rewrite);
 });

})();