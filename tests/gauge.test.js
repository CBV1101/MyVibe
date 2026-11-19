const assert=require("node:assert/strict");
const test=require("node:test");
const {clamp,hue,color,label}=require("../extension/gauge.js");
test("score controls are clamped",()=>{assert.equal(clamp(-12),0);assert.equal(clamp(130),100);assert.equal(clamp(NaN),50);});
test("gradient progresses from red through yellow to green",()=>{assert.equal(hue(0),0);assert.equal(hue(50),65);assert.equal(hue(100),130);assert.ok(hue(78)>hue(60));});
test("numeric score always has an accessible label",()=>{assert.equal(label(0),"Very negative");assert.equal(label(50),"Neutral");assert.equal(label(78),"Positive");assert.equal(label(100),"Highly positive");});
test("score color resolves to a valid HSL string",()=>{assert.match(color(78),/^hsl\(\d+, 82%, \d+%\)$/);});
