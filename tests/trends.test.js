const test=require("node:test"),assert=require("node:assert/strict");
const {summarize}=require("../extension/trends.js");
const rows=[{index:1,date:"2026-11-01T23:00:00Z",score:20,delta:-2.4},{index:2,date:"2026-11-02T00:00:00Z",score:80,delta:3},{index:3,date:null,score:50,delta:0},{index:4,date:"2026-12-01",score:50,delta:-0.1}];
test("monthly averages distinguish message tone from rolling impact",()=>{const r=summarize(rows);assert.equal(r.undated,1);assert.deepEqual(r.periods,[{period:"2026-11",count:2,positive:1,negative:1,neutral:0,average:50},{period:"2026-12",count:1,positive:0,negative:0,neutral:1,average:50}]);assert.deepEqual(r.strongest.map(x=>x.index),[2,1,4]);});
test("UTC weeks start on Monday",()=>assert.deepEqual(summarize(rows,"week").periods.map(x=>x.period),["2026-10-26","2026-11-02","2026-11-30"]));
test("empty and invalid dates do not fabricate trends",()=>{assert.deepEqual(summarize([]),{periods:[],undated:0,strongest:[]});assert.equal(summarize([{date:"invalid",delta:0}]).undated,1);assert.throws(()=>summarize([],"day"));});
