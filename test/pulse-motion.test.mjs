import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pulseMotion,artifactMotion} from '../src/pulse-motion.mjs';
test('model responds only after a scheduled impact and settles after its tail',()=>{
 const p=[{at:100,amp:.7}];assert.deepEqual(pulseMotion(p,99),{yaw:0,roll:0,pitch:0,lift:0});
 assert.ok(Math.abs(pulseMotion(p,150).roll)>0);assert.deepEqual(pulseMotion(p,801),{yaw:0,roll:0,pitch:0,lift:0});
});
test('overlapping impacts stay small and reduced motion disables them',()=>{
 const p=Array.from({length:180},(_,i)=>({at:i,amp:1}));for(let t=0;t<1000;t+=8){const v=pulseMotion(p,t);assert.ok(Math.abs(v.yaw)<=.055&&Math.abs(v.roll)<=.065&&Math.abs(v.pitch)<=.04&&v.lift<=.035);}
 assert.deepEqual(pulseMotion(p,100,0,true),{yaw:0,roll:0,pitch:0,lift:0});
});

test("stronger impacts create larger three dimensional motion",()=>{const weak=pulseMotion([{at:0,amp:.2}],50),strong=pulseMotion([{at:0,amp:.9}],50);for(const key of ["yaw","roll","pitch","lift"])assert.ok(Math.abs(strong[key])>Math.abs(weak[key]));});

test('paired artifacts use different timing and opposing directions',()=>{
 const p=[{at:0,amp:.8}];for(const type of [1,3]){const a=artifactMotion(p,40,type,0,0,0),b=artifactMotion(p,40,type,1,0,0);assert.ok(Math.abs(a.roll)>0);assert.equal(Math.abs(b.roll),0);const later=artifactMotion(p,120,type,1,.3,.2);assert.notDeepEqual(a,later);}
});
test('larger types move more, remain bounded and settle',()=>{
 const p=[{at:0,amp:.8}],base=artifactMotion(p,70,0,0,.5,.5);for(const type of [1,2,3]){const m=artifactMotion(p,70,type,0,.5,.5);assert.ok(Math.abs(m.yaw)>Math.abs(base.yaw));}
 for(const type of [0,1,2,3])for(const part of [0,1]){const m=artifactMotion(p,100,type,part,1,1);assert.ok(Math.abs(m.yaw)<.44&&Math.abs(m.roll)<.38&&Math.abs(m.pitch)<.29);assert.deepEqual(artifactMotion(p,1000,type,part,0,0,true),{yaw:0,roll:0,pitch:0,lift:0});}
});
