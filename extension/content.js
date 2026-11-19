(() => {
 "use strict";
 if(window.__myVibeInstalled)return;
 window.__myVibeInstalled=true;
 const selectors='textarea,[contenteditable="true"],[role="textbox"]';
 let active=null;
 const panel=document.createElement("aside");
 panel.id="myvibe-tone-panel";
 panel.setAttribute("aria-label","MyVibe tone coach");
 panel.style.cssText="display:none;position:fixed;z-index:2147483647;max-width:340px;width:calc(100vw - 24px);background:#161526;color:#f9f7ff;border:1px solid #76679b;border-radius:12px;padding:13px;font:13px/1.45 system-ui,sans-serif;box-shadow:0 12px 30px #0006";
 panel.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px"><strong>✦ MyVibe</strong><button type="button" data-close style="border:0;background:none;color:#fff;cursor:pointer" aria-label="Close">×</button></div><p data-status></p><div data-flags style="white-space:pre-line"></div><button type="button" data-rewrite style="display:none;margin-top:10px;border:0;border-radius:7px;padding:8px;background:#c6b4ff;color:#161526;cursor:pointer">Use suggested wording</button><button type="button" data-ai style="display:block;margin-top:10px;border:1px solid #a8c8ff;border-radius:7px;padding:7px;background:#263854;color:#fff;cursor:pointer">Analyze with AI (opt-in)</button><div data-ai-result role="status" style="display:none;margin-top:10px;white-space:pre-line;padding:9px;background:#27354a;border-radius:7px"></div><button type="button" data-record style="display:block;margin-top:10px;border:1px solid #8b7bb5;border-radius:7px;padding:7px;background:transparent;color:#fff;cursor:pointer">Add to my vibe history</button><small style="display:block;margin-top:9px;color:#c0bdd0">Private, local prototype · no text is stored</small>';
 document.documentElement.appendChild(panel);
 function textOf(el){return el.matches("textarea,input")?el.value:(el.innerText||"");}
 function isEditor(el){return el?.matches?.(selectors)||el?.isContentEditable;}
 function draw(){
  if(!active||!document.contains(active)){panel.style.display="none";return;}
  const text=textOf(active).trim();
  if(!text){panel.style.display="none";return;}
  const result=MyVibeTone.analyze(text);
  panel.querySelector("[data-status]").textContent="Draft vibe: "+result.score+"/100 · "+(result.score>50?"Positive":result.score===50?"Neutral":"Consider revising");
  panel.querySelector("[data-flags]").textContent=(result.positives.length?"✓ Positive signals: "+result.positives.map(p=>p.label).join(", ")+"\n\n":"")+(result.flags.length?result.flags.map(f=>"• "+f.label+" ("+f.confidence+" confidence)\n  "+f.interpretation+"\n  Consider: "+f.tip).join("\n\n"):"No attacks detected. Disagreement and normal discussion are neutral.");
  panel.querySelector("[data-rewrite]").style.display=result.changed?"block":"none";
  const rect=active.getBoundingClientRect();
  panel.style.left=Math.max(8,Math.min(window.innerWidth-350,rect.left))+"px";
  panel.style.top=(rect.bottom+190<window.innerHeight?rect.bottom+8:Math.max(8,rect.top-190))+"px";
  panel.style.display="block";
 }
 let debounce;
 document.addEventListener("focusin",e=>{if(isEditor(e.target)){active=e.target;draw();}},true);
 document.addEventListener("input",e=>{if(isEditor(e.target)){active=e.target;clearTimeout(debounce);debounce=setTimeout(draw,220);}},true);
 panel.querySelector("[data-close]").addEventListener("click",()=>{active=null;panel.style.display="none";});
 panel.querySelector("[data-rewrite]").addEventListener("click",()=>{
  if(!active)return;
  const {suggestion,changed}=MyVibeTone.analyze(textOf(active));
  if(!changed)return;
  active.focus();
  if(active.matches("textarea,input")){
   const proto=active instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
   Object.getOwnPropertyDescriptor(proto,"value").set.call(active,suggestion);
  }else{
   const selection=window.getSelection(),range=document.createRange();
   range.selectNodeContents(active);selection.removeAllRanges();selection.addRange(range);
   if(!document.execCommand("insertText",false,suggestion))active.textContent=suggestion;
  }
  active.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertText",data:suggestion}));
  draw();
 });
 panel.querySelector("[data-ai]").addEventListener("click",()=>{
  if(!active)return;
  const requestedText=textOf(active).trim();
  if(!requestedText)return;
  if(requestedText.length>3000){panel.querySelector("[data-ai-result]").textContent="AI supports drafts up to 3,000 characters.";panel.querySelector("[data-ai-result]").style.display="block";return;}
  const area=panel.querySelector("[data-ai-result]"),button=panel.querySelector("[data-ai]");
  area.style.display="block";area.textContent="Requesting AI interpretation…";button.disabled=true;
  // Do not automatically send each keystroke. Only a user click can trigger this call.
  chrome.runtime.sendMessage({type:"MYVIBE_AI_ANALYZE",text:requestedText},(response)=>{
   button.disabled=false;
   if(chrome.runtime.lastError||response?.error||!response?.result){area.textContent=response?.error||"AI unavailable; local coaching remains active.";return;}
   const a=response.result;
   // A result for an older draft should never be shown as if it were the current text.
   if(!active||textOf(active).trim()!==requestedText){area.textContent="Draft changed. Analyze again to see updated feedback.";return;}
   area.textContent="AI interpretation ("+a.confidence+" confidence): "+a.interpretation+"\n"+
    "Message estimate: "+a.score+"/100. "+a.reason+(a.rewrite?"\nOptional rewrite: "+a.rewrite:"");
   // AI output is advisory. Never automatically replace user text or update public score.
  });
 });
 panel.querySelector("[data-record]").addEventListener("click",()=>{
  if(!active)return;
  const result=MyVibeTone.analyze(textOf(active));
  if(result.score===null)return;
  chrome.storage.local.get({myvibeHistory:[]},({myvibeHistory})=>{
   const entry={schemaVersion:3,score:result.score,respectfulness:result.respectfulness,constructiveness:result.constructiveness,at:Date.now(),platform:location.hostname,flags:result.flags.map(f=>f.id),positiveSignals:result.positives.map(p=>p.id)};
   chrome.storage.local.set({myvibeHistory:[...myvibeHistory,entry].slice(-500)});
   panel.querySelector("[data-record]").textContent="Added ✓";
   setTimeout(()=>panel.querySelector("[data-record]").textContent="Add to my vibe history",1200);
  });
 });
})();
