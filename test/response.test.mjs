import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TYPES,MotionTracker,planImpact,vibrationPattern} from '../src/response.mjs';
function sample(mag){return {acceleration:{x:mag,y:0,z:0},accelerationIncludingGravity:{x:0,y:0,z:9.81}};}
test('stationary phone remains silent including a constant tilt',()=>{const m=new MotionTracker();for(let t=16;t<5000;t+=16){const r=m.sample({accelerationIncludingGravity:{x:5,y:0,z:8.4}},t);assert.equal(r.energy,0);}});
test('faster/stronger shaking creates more impacts',()=>{function run(mag){const m=new MotionTracker();let hits=0;for(let t=16;t<3000;t+=16)if(m.sample(sample(mag),t).energy>0)hits++;return hits;}assert.ok(run(15)>run(3));assert.equal(run(0),0);});
test('motion stops immediately when acceleration stops',()=>{const m=new MotionTracker();for(let t=16;t<1000;t+=16)m.sample(sample(12),t);for(let t=1000;t<2000;t+=16)assert.equal(m.sample(sample(0),t).energy,0);});
test('missing sensors do not simulate motion',()=>assert.equal(new MotionTracker().sample({acceleration:{x:null,y:null,z:null}},100),null));
test('types have different tone, rhythm and decay; tilt changes pitch and decay',()=>{const signatures=new Set();for(let i=0;i<TYPES.length;i++){const p=planImpact(i,.6,0),tilted=planImpact(i,.6,.8);signatures.add(JSON.stringify(p));assert.notEqual(p[0].frequency,tilted[0].frequency);assert.notEqual(p[0].decay,tilted[0].decay);assert.ok(vibrationPattern(p).every(n=>Number.isFinite(n)&&n>=0));}assert.equal(signatures.size,TYPES.length);});
test('haptic and sound events start at the same times',()=>{for(let i=0;i<TYPES.length;i++)for(const e of [.1,.5,1]){const p=planImpact(i,e,.8),v=vibrationPattern(p);let time=0;for(let j=0;j<p.length;j++){time+=v[j*2+1];assert.ok(Math.abs(time-p[j].delay*1000)<=1);time+=v[j*2+2];}}});
