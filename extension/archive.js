/* Local opt-in archive insights. No network, persistence, account verification or payments. */
(function(root){
 "use strict";
 const LIMIT=5000,MAX_TEXT=4000;
 function csvRows(input){
  const rows=[];let row=[],field="",quoted=false;
  const text=String(input).replace(/^\uFEFF/,"");
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(quoted){
    if(c==='"'&&text[i+1]==='"'){field+='"';i++;}
    else if(c==='"')quoted=false;
    else field+=c;
   }else if(c==='"')quoted=true;
   else if(c===','){row.push(field);field="";}
   else if(c==='\n'||c==='\r'){
    if(c==='\r'&&text[i+1]==='\n')i++;
    row.push(field);field="";
    if(row.some(x=>x.trim()!==""))rows.push(row);
    row=[];
   }else field+=c;
  }
  if(quoted)throw new Error("Malformed CSV: unmatched quote");
  row.push(field);if(row.some(x=>x.trim()!==""))rows.push(row);
  return rows;
 }
 function parseArchive(raw,filename){
  if(typeof raw!=="string"||raw.length>8*1024*1024)throw new Error("Archive must be a text file under 8 MB");
  let records=[];
  if(/\.csv$/i.test(filename)){
   const rows=csvRows(raw);
   if(!rows.length)throw new Error("CSV is empty");
   const headers=rows.shift().map(s=>s.trim().toLowerCase());
   const textIndex=headers.findIndex(s=>["text","content","message","post"].includes(s));
   const dateIndex=headers.findIndex(s=>["date","created_at","timestamp","time"].includes(s));
   if(textIndex<0)throw new Error('CSV needs a "text", "content", "message" or "post" column');
   records=rows.map((r,i)=>({text:r[textIndex],date:dateIndex>=0?r[dateIndex]:null,position:i}));
  }else if(/\.json$/i.test(filename)){
   const payload=JSON.parse(raw);
   const values=Array.isArray(payload)?payload:Array.isArray(payload.posts)?payload.posts:Array.isArray(payload.messages)?payload.messages:null;
   if(!values)throw new Error('JSON must be an array, {"posts":[...]}, or {"messages":[...]}');
   records=values.map((item,i)=>typeof item==="string"?{text:item,position:i}:{text:item?.text??item?.content??item?.message??item?.post,date:item?.date??item?.created_at??item?.timestamp,position:i});
  }else throw new Error("Use a .csv or .json file");
  if(records.length>LIMIT)throw new Error("Import a maximum of 5,000 messages per session");
  const normalized=records.map((item)=>{
   if(typeof item.text!=="string"||!item.text.trim()||item.text.length>MAX_TEXT)return null;
   let date=null;
   if(item.date!==undefined&&item.date!==null&&String(item.date).trim()){
    const dateObj=new Date(item.date);
    if(!Number.isNaN(dateObj.getTime()))date=dateObj.toISOString();
   }
   return {text:item.text.trim(),date,position:item.position};
  }).filter(Boolean);
  if(!normalized.length)throw new Error("No usable messages found");
  return normalized.sort((a,b)=>a.date&&b.date?Date.parse(a.date)-Date.parse(b.date):a.position-b.position);
 }
 function analyzeArchive(records,tone,history){
  if(!Array.isArray(records)||!tone||!history)throw new TypeError("Missing records or scoring engine");
  let overall=50;
  const categories=new Map();
  let positive=0,negative=0,neutral=0;
  const timeline=records.map((item,i)=>{
   const result=tone.analyze(item.text);
   if(result.score===null)return null;
   const before=overall;
   overall=history.nextScore(before,result.score);
   const delta=overall-before;
   if(result.score>50)positive++;else if(result.score<50)negative++;else neutral++;
   for(const f of result.flags||[])if(f.weight>0)categories.set(f.id,(categories.get(f.id)||0)+1);
   for(const p of result.positives||[])categories.set(p.id,(categories.get(p.id)||0)+1);
   return {index:i+1,date:item.date,text:item.text,uri:typeof item.uri==="string"?item.uri:null,source:typeof item.source==="string"?item.source:null,score:result.score,previous:Number(before.toFixed(2)),after:Number(overall.toFixed(2)),delta:Number(delta.toFixed(2)),reasons:[
     ...(result.flags||[]).filter(f=>f.weight>0).map(f=>({id:f.id,label:f.label,type:"negative",confidence:f.confidence})),
     ...(result.positives||[]).map(p=>({id:p.id,label:p.label,type:"positive",confidence:"heuristic"}))
   ]};
  }).filter(Boolean);
  return {score:Number(overall.toFixed(1)),count:timeline.length,positive,negative,neutral,categories:[...categories].map(([id,count])=>({id,count})).sort((a,b)=>b.count-a.count),timeline};
 }
 root.MyVibeArchive={parseArchive,analyzeArchive,csvRows};
 if(typeof module!=="undefined"&&module.exports)module.exports={parseArchive,analyzeArchive,csvRows};
})(typeof globalThis!=="undefined"?globalThis:this);
