"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {analyze}=require("../extension/tone.js");
const fixture=path.join(__dirname,"../evaluation/curated-tone-cases.json");
function classify(score){return score>50?"positive":score<50?"negative":"neutral";}
function evaluate(cases,scorer=analyze){
 if(!Array.isArray(cases))throw new TypeError("Evaluation cases must be an array");
 const seen=new Set(),categories={neutral:0,negative:0,positive:0,advisory:0},passes={neutral:0,negative:0,positive:0,advisory:0},failures=[];
 for(const row of cases){
  if(!row||typeof row.id!=="string"||typeof row.text!=="string"||!categories.hasOwnProperty(row.expected)||seen.has(row.id))throw new Error("Malformed or duplicate evaluation case");
  seen.add(row.id);
  const score=scorer(row.text).score;
  if(!Number.isFinite(score)||score<0||score>100)throw new Error("Invalid score for "+row.id);
  categories[row.expected]++;
  // Ambiguous categories are counted as neutral for numerical scoring.
  const actual=classify(score),expected=row.expected==="advisory"?"neutral":row.expected;
  if(actual===expected)passes[row.expected]++;
  else failures.push({id:row.id,expected,actual,score,text:row.text});
 }
 const total=cases.length,passtotal=Object.values(passes).reduce((a,b)=>a+b,0);
 const falsePositive=categories.neutral+categories.advisory-passes.neutral-passes.advisory;
 return {total,passed:passtotal,failed:total-passtotal,passRate:total?passtotal/total:0,
  falsePositiveNeutral: falsePositive,categories,passes,failures,
  // These are regression checks on curated examples, NOT measured model accuracy.
  releaseGate:total>=50&&falsePositive===0&&passes.negative===categories.negative&&passes.positive===categories.positive
 };
}
function formatReport(report){
 const lines=["MyVibe curated heuristic regression evaluation","Sample: "+report.total+" manually curated examples; NOT a representative accuracy study","Passed: "+report.passed+"/"+report.total,"Neutral/advisory false positives: "+report.falsePositiveNeutral];
 for(const key of ["neutral","advisory","negative","positive"])lines.push(key+": "+report.passes[key]+"/"+report.categories[key]);
 lines.push("Release gate: "+(report.releaseGate?"PASS":"FAIL"));
 for(const f of report.failures)lines.push("FAIL "+f.id+" expected="+f.expected+" actual="+f.actual+" score="+f.score+" text="+JSON.stringify(f.text));
 return lines.join("\n");
}
if(require.main===module){
 const fixtureData=JSON.parse(fs.readFileSync(fixture,"utf8"));
 const report=evaluate(fixtureData.cases);
 process.stdout.write(formatReport(report)+"\n");
 if(!report.releaseGate)process.exitCode=1;
}
module.exports={evaluate,formatReport,classify};
