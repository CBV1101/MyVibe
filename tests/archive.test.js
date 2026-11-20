const test=require("node:test");
const assert=require("node:assert/strict");
const {parseArchive,analyzeArchive,csvRows}=require("../extension/archive.js");
const tone=require("../extension/tone.js");
const history=require("../extension/history.js");
test("csv quoted commas and multiline fields",()=>{
 const rows=csvRows('text,date\n"Hello, friend",2026-01-01\n"Line one\nLine two",2026-01-02\n');
 assert.equal(rows[1][0],"Hello, friend");
 assert.equal(rows[2][0],"Line one\nLine two");
});
test("JSON and CSV import are normalized and ordered",()=>{
 const a=parseArchive('[{"text":"Hello","date":"2026-01-02"},{"text":"Keep going!","date":"2026-01-01"}]',"a.json");
 assert.equal(a[0].text,"Keep going!");
 const b=parseArchive('text,date\n"Your post is dumb",2026-01-02\n"Keep going!",2026-01-03',"a.csv");
 assert.equal(b.length,2);
});
test("unsupported, empty, malformed and excessive data fail safely",()=>{
 assert.throws(()=>parseArchive("hi","file.txt"));
 assert.throws(()=>parseArchive('{"other":[]}',"a.json"));
 assert.throws(()=>parseArchive("nope\nhi","a.csv"));
 assert.throws(()=>parseArchive('"unterminated',"a.csv"));
 assert.throws(()=>parseArchive('x'.repeat(8*1024*1024+1),"a.json"));
});
test("archive changes are explained and neutral entries remain neutral",()=>{
 const r=analyzeArchive(parseArchive(JSON.stringify(["Keep going! You got this!","I disagree with your policy.","You are dumb"]),"a.json"),tone,history);
 assert.equal(r.count,3);
 assert.equal(r.positive,1);assert.equal(r.neutral,1);assert.equal(r.negative,1);
 assert.ok(r.timeline[0].delta>0);
 assert.ok(r.timeline[2].delta<0);
 assert.equal(r.timeline[1].score,50);
 assert.ok(r.timeline[2].reasons.some(x=>x.type==="negative"));
});

test("CSV parser rejects malformed and ambiguous rows rather than silently corrupting text",()=>{
 for(const input of [
  'text,date\n"valid"x,2026-01-01',
  'text,date\nhello"friend,2026-01-01',
  'text,date\n"unfinished,2026-01-01',
  'text,date\nhello,2026-01-01,extra',
  'text,date\nhello',
  'text,text\nhello,world'
 ])assert.throws(()=>parseArchive(input,"archive.csv"),input);
});
test("CSV correctly preserves escaped quotes, line breaks and UTF-8 BOM",()=>{
 const rows=parseArchive('\uFEFFtext,date\n"He said ""hello"", then left",2026-01-01\n"Line one\nLine two",2026-01-02',"archive.csv");
 assert.equal(rows[0].text,'He said "hello", then left');
 assert.equal(rows[1].text,"Line one\nLine two");
});
test("CSV rejects oversized row counts early",()=>{
 const csv="text\n"+"message\n".repeat(5001);
 assert.throws(()=>parseArchive(csv,"archive.csv"),/5,000/);
});
test("import does not accept a scalar JSON document",()=>{
 for(const value of ["null","42","true",'"a string"'])assert.throws(()=>parseArchive(value,"archive.json"));
});
