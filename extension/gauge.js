/* Shared, dependency-free MyVibes gauge and inline badge. */
(function(root){
 "use strict";
 const NS="http://www.w3.org/2000/svg";
 const clamp=s=>Math.max(0,Math.min(100,Number.isFinite(Number(s))?Number(s):50));
 function hue(score){
  const s=clamp(score);
  // 0 = strong red, 50 = yellow, 100 = saturated green.
  return Math.round((s/100)*130);
 }
 function color(score){return "hsl("+hue(score)+", 82%, "+(score>80?37:score>55?41:47)+"%)";}
 function label(score){const s=clamp(score);return s>=80?"Highly positive":s>=60?"Positive":s>=40?"Neutral":s>=20?"Negative":"Very negative";}
 function svg(tag,attrs){const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs||{}))el.setAttribute(k,String(v));return el;}
 function createGauge(score){
  const s=clamp(score),svgEl=svg("svg",{viewBox:"0 0 300 174",role:"img","aria-label":"MyVibes score "+s+" out of 100, "+label(s)});
  svgEl.classList.add("myvibes-gauge");
  const defs=svg("defs"),gradient=svg("linearGradient",{id:"myvibes-spectrum",x1:"0%",y1:"0%",x2:"100%",y2:"0%"});
  for(const [offset,c] of [["0%","#d91430"],["25%","#fa792d"],["50%","#ffd638"],["75%","#96d53e"],["100%","#008b4a"]])gradient.appendChild(svg("stop",{offset,"stop-color":c}));
  defs.appendChild(gradient);svgEl.appendChild(defs);
  svgEl.appendChild(svg("path",{d:"M 28 142 A 122 122 0 0 1 272 142",fill:"none",stroke:"url(#myvibes-spectrum)","stroke-width":27,"stroke-linecap":"round"}));
  // From 180° (0) through 90° (50) to 0° (100).
  const theta=Math.PI*(1-s/100),cx=150,cy=142,tipX=cx+105*Math.cos(theta),tipY=cy-105*Math.sin(theta);
  svgEl.appendChild(svg("line",{x1:cx,y1:cy,x2:tipX,y2:tipY,stroke:"#242b37","stroke-width":6,"stroke-linecap":"round"}));
  svgEl.appendChild(svg("circle",{cx,cy,r:10,fill:"#242b37"}));
  svgEl.appendChild(svg("circle",{cx,cy,r:4,fill:"#ffffff"}));
  const t=svg("text",{x:150,y:107,"text-anchor":"middle","font-size":18,"font-weight":600,fill:"#3a4557"});t.textContent="MyVibes";svgEl.appendChild(t);
  const n=svg("text",{x:150,y:131,"text-anchor":"middle","font-size":26,"font-weight":800,fill:color(s)});n.textContent=String(Math.round(s));svgEl.appendChild(n);
  const a=svg("text",{x:16,y:168,"font-size":11,fill:"#687386"});a.textContent="0";svgEl.appendChild(a);
  const b=svg("text",{x:267,y:168,"font-size":11,fill:"#687386"});b.textContent="100";svgEl.appendChild(b);
  return svgEl;
 }
 function createBadge(score){
  const s=clamp(score),badge=document.createElement("span");
  badge.className="myvibes-badge";
  badge.setAttribute("role","img");badge.setAttribute("aria-label","MyVibes score "+Math.round(s)+" of 100, "+label(s));
  const title=document.createElement("span");title.className="myvibes-badge-name";title.textContent="MyVibes";
  const number=document.createElement("strong");number.className="myvibes-badge-number";number.textContent=String(Math.round(s));number.style.color=color(s);
  const track=document.createElement("span");track.className="myvibes-badge-track";
  const marker=document.createElement("span");marker.className="myvibes-badge-marker";marker.style.left=s+"%";track.appendChild(marker);
  badge.append(title,number,track);return badge;
 }
 root.MyVibesGauge={clamp,hue,color,label,createGauge,createBadge};
 if(typeof module!=="undefined"&&module.exports)module.exports={clamp,hue,color,label};
})(typeof globalThis!=="undefined"?globalThis:this);
