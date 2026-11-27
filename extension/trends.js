(function(root){
"use strict";
function summarize(timeline,period="month"){
 if(!["month","week"].includes(period))throw new Error("Unsupported period");
 const buckets=new Map();let undated=0;
 for(const e of timeline){
  const d=e.date?new Date(e.date):null;
  if(!d||!Number.isFinite(d.getTime())){undated++;continue;}
  let key=d.toISOString().slice(0,7);
  if(period==="week"){d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);key=d.toISOString().slice(0,10);}
  const b=buckets.get(key)||{period:key,count:0,sum:0,positive:0,negative:0,neutral:0};
  b.count++;b.sum+=e.score;b[e.score>50?"positive":e.score<50?"negative":"neutral"]++;buckets.set(key,b);
 }
 const periods=[...buckets.values()].sort((a,b)=>a.period.localeCompare(b.period)).map(({sum,...b})=>({...b,average:Number((sum/b.count).toFixed(1))}));
 const strongest=[...timeline].filter(e=>e.delta!==0).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)||a.index-b.index).slice(0,5).map(({index,delta,score})=>({index,delta,score}));
 return {periods,undated,strongest};
}
root.MyVibeTrends={summarize};
if(typeof module!=="undefined"&&module.exports)module.exports=root.MyVibeTrends;
})(typeof globalThis!=="undefined"?globalThis:this);
