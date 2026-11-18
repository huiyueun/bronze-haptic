import * as THREE from 'three';
import {DOCENT} from './tactile-data.mjs';
import {createTactileSound} from './tactile-sound.js';

const anchorCache=new WeakMap();
// Surface anchors are fitted once to the real mesh, rather than screen coordinates.
export function fitAnchors(root,index){
 root.updateMatrixWorld(true);
 if(anchorCache.has(root))return anchorCache.get(root).map(p=>({...p,point:p.part.localToWorld(p.local.clone())}));
 const parts=[...root.userData.parts].sort((a,b)=>new THREE.Box3().setFromObject(a).getCenter(new THREE.Vector3()).x-new THREE.Box3().setFromObject(b).getCenter(new THREE.Vector3()).x);
 const part=parts[0],box=new THREE.Box3().setFromObject(part),size=box.getSize(new THREE.Vector3());
 const vertices=[];part.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++)vertices.push(new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld));}});
 const anchors=DOCENT[index].map((d,number)=>{
  const x=box.min.x+size.x*d.xy[0],y=box.min.y+size.y*d.xy[1];let best=null,score=Infinity;
  for(const v of vertices){const s=((v.x-x)/size.x)**2+((v.y-y)/size.y)**2+.0001*((box.max.z-v.z)/Math.max(size.z,.001))**2;if(s<score){score=s;best=v;}}
  const ray=new THREE.Raycaster(new THREE.Vector3(best.x,best.y,box.max.z+1),new THREE.Vector3(0,0,-1));
  const surface=ray.intersectObject(part,true)[0]?.point||best;
  return {...d,number:number+1,part,local:part.worldToLocal(surface.clone())};
 });
 anchorCache.set(root,anchors);return fitAnchors(root,index);
}
export function setupTactile({renderer,camera,getRoot,getIndex,freeze,restore,isScreenReader=()=>false,announceReader=()=>{}}){
 const entry=document.querySelector('#feel-entry'),exit=document.querySelector('#feel-exit'),panel=document.querySelector('#feel-panel'),canvas=document.querySelector('#feel-canvas'),layer=document.querySelector('#feel-points'),status=document.querySelector('#feel-status'),ctx=canvas.getContext('2d');
 const sound=createTactileSound();let speechId=0;let active=false,mask=null,w=0,h=0,points=[],pointer=null,inside=false,timer=null,cue=null,chosen=null,arrived=null,gesture=0,lastSpokenGesture=-1,last=null;
 function speak(text){status.textContent=text;if(isScreenReader()){announceReader(text);return;}if(!globalThis.speechSynthesis)return;const id=++speechId;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=.95;u.onerror=e=>{if(id===speechId&&active&&!['interrupted','canceled'].includes(e.error))status.textContent=text+' (음성 재생 불가 · 글로 확인해 주세요)';};speechSynthesis.speak(u);}
 function vibrate(p){try{navigator.vibrate?.(p);}catch{}}
 function clearFeedback(){clearTimeout(timer);clearTimeout(cue);timer=cue=null;vibrate(0);sound.stop();inside=false;last=null;arrived=null;canvas.classList.remove('contact');}
 function pulse(){if(!active||!inside||pointer===null||document.hidden)return;vibrate([60,65,60,65,60]);timer=setTimeout(pulse,350);}
 function announce(p,detail){clearTimeout(cue);cue=null;sound.stop();sound.cue(1,true);speak(detail?p.text:p.name);}
 function selectPoint(p,detail){chosen=p;announce(p,detail);layer.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('selected',points[i]===p));}
 function proximity(){clearTimeout(cue);cue=null;if(!active||!inside||!last||arrived||document.hidden)return;let nearest=null,d=Infinity;for(const p of points){const dist=Math.hypot(p.x-last.x,p.y-last.y);if(dist<d){nearest=p;d=dist;}}if(nearest&&d<100){const near=1-d/100;if(!globalThis.speechSynthesis?.speaking)sound.cue(near);cue=setTimeout(proximity,800-near*500);}}
 function hit(x,y){return x>=0&&y>=0&&x<w&&y<h&&mask[(h-1-Math.floor(y))*w+Math.floor(x)]===1;}
 function contact(e){
  const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*w/r.width,y=(e.clientY-r.top)*h/r.height,within=hit(x,y);
  if(within!==inside){clearFeedback();inside=within;if(within){sound.play();pulse();canvas.classList.add('contact');}}
  last={x,y};let p=null,d=Infinity;for(const q of points){const dist=Math.hypot(q.x-x,q.y-y);if(dist<d){p=q;d=dist;}}
  if(!within||d>24)p=null;
  if(p){if(arrived!==p&&(lastSpokenGesture!==gesture||chosen!==p)){selectPoint(p,isScreenReader()||(chosen===p&&lastSpokenGesture!==gesture));lastSpokenGesture=gesture;}arrived=p;clearTimeout(cue);cue=null;}
  else{arrived=null;if(!cue)proximity();if(!isScreenReader()&&!globalThis.speechSynthesis?.speaking)status.textContent='';}
 }
 function layout(){
  const root=getRoot(),r=renderer.domElement.getBoundingClientRect();w=Math.max(1,Math.round(r.width));h=Math.max(1,Math.round(r.height));canvas.width=w;canvas.height=h;
  root.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const target=new THREE.WebGLRenderTarget(w,h),material=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide}),scene=new THREE.Scene();scene.background=new THREE.Color(0);const copy=root.clone(true);copy.traverse(o=>{if(o.isMesh)o.material=material;});scene.add(copy);const data=new Uint8Array(w*h*4),previous=renderer.getRenderTarget();
  try{renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,w,h,data);}finally{renderer.setRenderTarget(previous);target.dispose();material.dispose();}
  mask=new Uint8Array(w*h);for(let i=0;i<mask.length;i++)mask[i]=data[i*4]>127?1:0;
  // Match the original tactile viewer: dark surroundings, translucent interior,
  // and a broad gold boundary around every visible edge and opening.
  const outline=ctx.createImageData(w,h),radius=3;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const index=(h-1-y)*w+x,filled=mask[index];let edge=false;
   for(const [dx,dy] of [[-radius,0],[radius,0],[0,-radius],[0,radius],[-2,-2],[2,2],[-2,2],[2,-2]]){
    const nx=x+dx,ny=h-1-y+dy;if(nx>=0&&ny>=0&&nx<w&&ny<h&&mask[ny*w+nx]!==filled){edge=true;break;}
   }
   outline.data.set(edge?[237,207,139,255]:filled?[27,25,20,80]:[17,27,42,255],(y*w+x)*4);
  }ctx.putImageData(outline,0,0);
  const ray=new THREE.Raycaster();
  points=fitAnchors(root,getIndex()).filter(p=>{
   const q=p.point.clone().project(camera);if(Math.abs(q.x)>=1||Math.abs(q.y)>=1||q.z<=-1||q.z>=1)return false;
   const direction=p.point.clone().sub(camera.position),distance=direction.length();ray.set(camera.position,direction.normalize());
   const first=ray.intersectObject(root,true)[0];let object=first?.object;while(object){if(object===p.part)return true;object=object.parent;}return false;
  }).map(p=>{const q=p.point.clone().project(camera);let x=(q.x+1)*w/2,y=(1-q.y)*h/2;
   // A vertex can round to an empty pixel at the silhouette; move only a few pixels onto it.
   if(!hit(x,y)){let best=Infinity;for(let dy=-12;dy<=12;dy++)for(let dx=-12;dx<=12;dx++)if(dx*dx+dy*dy<best&&hit(x+dx,y+dy)){best=dx*dx+dy*dy;p.offset=[dx,dy];}if(p.offset){x+=p.offset[0];y+=p.offset[1];}}
   return {...p,x,y};});
  layer.replaceChildren();points.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.textContent=p.number;b.setAttribute('aria-label',`${p.number}. ${p.name}`);b.style.left=`${p.x/w*100}%`;b.style.top=`${p.y/h*100}%`;b.onclick=()=>{sound.unlock();selectPoint(p,isScreenReader()||chosen===p);};layer.append(b);});
 }
 function end(){if(!active)return;active=false;clearFeedback();pointer=null;chosen=null;points=[];mask=null;sound.reset();globalThis.speechSynthesis?.cancel();panel.hidden=true;canvas.hidden=true;layer.hidden=true;document.body.classList.remove('feeling');entry.setAttribute('aria-pressed','false');restore();renderer.domElement.closest('#stage').setAttribute('tabindex','0');entry.focus({preventScroll:true});}
 entry.onclick=()=>{if(active){end();return;}if(!getRoot()?.userData.loaded)return;sound.unlock();active=true;document.body.classList.add('feeling');freeze();chosen=null;gesture=0;lastSpokenGesture=-1;panel.hidden=canvas.hidden=layer.hidden=false;document.body.classList.add('feeling');entry.setAttribute('aria-pressed','true');try{layout();renderer.domElement.closest('#stage').setAttribute('tabindex','-1');(layer.querySelector('button')||exit).focus({preventScroll:true});status.textContent='';}catch(e){end();status.textContent='탐색을 준비하지 못했습니다. 다시 시도해 주세요.';if(isScreenReader())announceReader(status.textContent);console.error(e);}};
 canvas.addEventListener('pointerdown',e=>{if(!active||pointer!==null)return;e.preventDefault();sound.unlock();globalThis.speechSynthesis?.cancel();pointer=e.pointerId;gesture++;canvas.setPointerCapture(pointer);contact(e);});
 canvas.addEventListener('pointermove',e=>{if(active&&pointer===e.pointerId){e.preventDefault();contact(e);}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(pointer!==e.pointerId)return;pointer=null;clearFeedback();if(event!=='pointerup'){globalThis.speechSynthesis?.cancel();chosen=null;}});
 exit.onclick=end;addEventListener('keydown',e=>{if(active&&e.key==='Escape'){e.preventDefault();end();}});addEventListener('resize',()=>{if(active)end();});document.addEventListener('visibilitychange',()=>{if(document.hidden)end();});addEventListener('pagehide',end);
 return {isActive:()=>active,end};
}
