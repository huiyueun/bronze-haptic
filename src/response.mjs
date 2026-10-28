export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const SOURCE='https://digital.khs.go.kr/record/recordDetail3D.do?ichDataUid=13903604992362301744&bizId=BIZ200400001214';
export const TYPES=[
 {id:'paljuryeong',name:'팔주령',description:'전 덕산 청동방울 일괄 · 1점',base:2100,decay:.24,voice:3},
 {id:'ssangduryeong',name:'쌍두령',description:'전 덕산 청동방울 일괄 · 한 쌍',base:1560,decay:.32,voice:2},
 {id:'johap-ssangduryeong',name:'조합식쌍두령',description:'전 덕산 청동방울 일괄 · 1점',base:1680,decay:.36,voice:2},
 {id:'ganduryeong',name:'간두령',description:'전 덕산 청동방울 일괄 · 한 쌍',base:980,decay:.48,voice:1}
].map(t=>({...t,vertexColors:true,fullResolution:true,source:SOURCE}));
// Normalized energy and orientation create a single event plan for both outputs.
export function planImpact(index,energy,tilt){
 const type=TYPES[index],e=clamp(energy,.08,1),t=clamp(tilt,-1,1);
 index=type.voice;
 // Recorded snippets already contain natural micro-impacts; avoid stacking a synthetic dense rattle.
 const count=index===3?1+Math.floor(e*2):index===2?1+Math.floor(e*1.5):1;
 const spacing=(index===2?.07:.035)*(1.18-.65*e)*(1+.3*Math.abs(t));
 return Array.from({length:count},(_,i)=>({delay:i*spacing,amplitude:e*Math.pow(.73,i),frequency:type.base*(1+t*.08)*(index===2&&i%2?1.18:1+i*.015),decay:type.decay*(.8+.5*e)*(1-.22*Math.abs(t)),pulse:Math.min(index===0?300:Math.floor(spacing*1000)-3,Math.round(((index===0?100:12)+e*(index===0?180:25))*Math.pow(.8,i)))}));
}
export function vibrationPattern(plan){let end=0;const pattern=[0];for(const p of plan){const start=Math.max(end,Math.round(p.delay*1000)),duration=Math.max(7,Math.round(p.pulse));pattern.push(start-end,duration);end=start+duration;}return pattern;}
export class MotionTracker{
 constructor(){this.reset();}
 reset(){this.gravity=null;this.energy=0;this.lastTime=0;this.lastHit=-Infinity;this.tilt=0;this.lastTilt=null;}
 sample(event,now){
 const valid=a=>a&&[a.x,a.y,a.z].every(Number.isFinite);
 const dt=this.lastTime?clamp((now-this.lastTime)/1000,.008,.1):.016;this.lastTime=now;
 let a=event.acceleration,raw=event.accelerationIncludingGravity;
 if(valid(raw)){
  const alpha=1-Math.exp(-dt/.35);
  if(!this.gravity)this.gravity={...raw};
  const residual={x:raw.x-this.gravity.x,y:raw.y-this.gravity.y,z:raw.z-this.gravity.z};
  for(const k of ['x','y','z'])this.gravity[k]+=alpha*(raw[k]-this.gravity[k]);
  if(!valid(a))a=residual;
  this.tilt=clamp(Math.atan2(this.gravity.x,Math.hypot(this.gravity.y,this.gravity.z))*2/Math.PI,-1,1);
 }
 if(!valid(a))return null;
 const speed=Math.hypot(a.x,a.y,a.z);
 const rotation=event.rotationRate;const angular=rotation?Math.hypot(rotation.alpha||0,rotation.beta||0,rotation.gamma||0):0;
 const target=clamp((speed-.65)/15+Math.max(0,angular-25)/800);
 this.energy+=(target-this.energy)*(1-Math.exp(-dt/.045));
 // Quiet acceleration never produces impacts, even at a constant tilted posture.
 const interval=280-190*this.energy;
 if(target>.1&&this.energy>.11&&now-this.lastHit>interval){this.lastHit=now;return {energy:this.energy,tilt:this.tilt,speed};}
 return {energy:0,tilt:this.tilt,speed};
 }
}
