import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {artifactMotion} from './pulse-motion.mjs';
import {TYPES,clamp,planImpact,vibrationPattern,MotionTracker} from './response.mjs';
const $=s=>document.querySelector(s),stage=$('#stage'),host=$('#webgl');
let selected=0,enabled=false,busy=false,sensorSeen=false,sensorTimer=0,audioContext,master,compressor,rotating=false;
let energyVisual=0,lastFrame=0,frame=0,scene,renderer,camera,orbit,objects=[],drag=null,pulses=[],timers=new Set(),voices=new Set();
let lastOrientation=0,orientationAvailable=false,motion=new MotionTracker(),sensorGeneration=0,slide=null;
let statusTimer;
const status=text=>{const note=$('#activation-status');if(note)note.textContent=text;const el=$('#status');el.textContent=text;el.hidden=!text;clearTimeout(statusTimer);if(text)statusTimer=setTimeout(()=>el.hidden=true,5500);};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const nav=$('#types');
TYPES.forEach((t,i)=>{const b=document.createElement('button');b.textContent=t.name;b.dataset.index=i;b.onclick=()=>select(i);nav.append(b);});
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),textureLoader=new THREE.TextureLoader();
const assetLoads=new Map();
const sampleBuffers=new Map(),sampleLoads=new Map(),sampleCursor=new Map();
let swayX=0,swayY=0,swayTargetX=0,swayTargetY=0,lastSensorAt=0;
function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m;}
function makeObject(){const group=new THREE.Group();group.userData.home=0;group.userData.yaw=0;group.visible=false;return group;}
async function ensureAsset(index){
 const group=objects[index];if(!group)return;
 if(group.userData.loaded){$('#asset-loading').hidden=true;return;}
 $('#asset-loading').hidden=false;$('#asset-loading').textContent='유물 3D 원본을 불러오는 중…';
 if(!assetLoads.has(index))assetLoads.set(index,(async()=>{
  const type=TYPES[index],id=type.id,base=`assets/${id}`,mobile=matchMedia('(pointer:coarse)').matches||innerWidth<700,size=mobile?4096:8192;
  let gltf,map=null,normalMap=null;
  if(type.vertexColors)gltf=await loader.loadAsync(`${base}/${mobile&&!type.fullResolution?'model-mobile':'model'}.glb`);
  else{
   [gltf,map,normalMap]=await Promise.all([loader.loadAsync(`${base}/model.glb`),textureLoader.loadAsync(`${base}/texture-${size}.webp`),textureLoader.loadAsync(`${base}/normal-${size}.webp`)]);
   map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());normalMap.anisotropy=map.anisotropy;
  }
  const model=gltf.scene;model.rotation.x=0;model.updateMatrixWorld(true);
  let bounds=new THREE.Box3().setFromObject(model),dimensions=bounds.getSize(new THREE.Vector3());const scale=2.8/Math.max(dimensions.y,dimensions.x);model.scale.setScalar(scale);model.updateMatrixWorld(true);bounds=new THREE.Box3().setFromObject(model);const center=bounds.getCenter(new THREE.Vector3());model.position.sub(center);
  model.traverse(o=>{if(!o.isMesh)return;o.material=new THREE.MeshStandardMaterial({map,normalMap,vertexColors:!!type.vertexColors,normalScale:new THREE.Vector2(1,1),metalness:type.vertexColors?.12:.25,roughness:type.vertexColors?.8:.68,side:THREE.DoubleSide});o.castShadow=true;o.receiveShadow=true;});
  group.add(model);group.updateMatrixWorld(true);
  group.userData.parts=[...model.children].map(child=>{
   const center=new THREE.Box3().setFromObject(child).getCenter(new THREE.Vector3());model.worldToLocal(center);
   const pivot=new THREE.Group();model.add(pivot);pivot.position.copy(center);pivot.updateMatrixWorld(true);pivot.attach(child);
   pivot.userData.baseY=pivot.position.y;pivot.userData.sx=0;pivot.userData.sy=0;pivot.userData.displayScale=scale;return pivot;
  });group.userData.loaded=true;group.userData.textureSize=size;
 })().catch(error=>{assetLoads.delete(index);throw error;}));
 try{await assetLoads.get(index);if(selected===index)$('#asset-loading').hidden=true;wake();}catch(error){if(selected===index){$('#asset-loading').textContent='원본을 불러오지 못했습니다. 여기를 눌러 다시 시도하세요.';$('#asset-loading').hidden=false;}console.error(error);}
}
$('#asset-loading').onclick=()=>ensureAsset(selected);
function setup3D(){try{
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.4));renderer.setClearColor(0,0);renderer.shadowMap.enabled=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.append(renderer.domElement);
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,1,.1,50);camera.position.set(0,.7,7.6);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xfff5dc,0x68725f,2));const key=new THREE.DirectionalLight(0xffefd4,3);key.position.set(-3,5,4);key.castShadow=false;key.shadow.mapSize.set(1024,1024);scene.add(key);const rim=new THREE.DirectionalLight(0xdce8ee,2);rim.position.set(4,2,-3);scene.add(rim);
 objects=TYPES.map(()=>{const g=makeObject();scene.add(g);return g;});
 const floor=mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.12}),scene,0,-1.63,0);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
 camera.lookAt(0,0,0);
 new ResizeObserver(resize).observe(stage);resize();
 }catch(e){host.textContent='이 브라우저에서 3D 화면을 열 수 없습니다. 최신 브라우저에서 다시 열어주세요.';host.style.cssText='display:grid;place-items:center;padding:50px;text-align:center;font-size:12px';console.error(e);}
}
function resize(){if(!renderer)return;const r=stage.getBoundingClientRect();camera.aspect=r.width/r.height;camera.updateProjectionMatrix();if(!rotating)camera.position.set(0,.7,Math.max(7.6,5/camera.aspect));renderer.setSize(r.width,r.height);wake();}
function wake(){if(!frame&&!document.hidden)frame=requestAnimationFrame(draw);}
function draw(now){frame=0;const dt=Math.min((now-lastFrame)/1000||.016,.05);lastFrame=now;energyVisual*=Math.exp(-dt*6);if(now-lastSensorAt>140){swayTargetX=0;swayTargetY=0;}const follow=1-Math.exp(-dt*7);swayX+=(swayTargetX-swayX)*follow;swayY+=(swayTargetY-swayY)*follow;if(slide){const t=clamp((now-slide.start)/320),ease=1-Math.pow(1-t,3);objects[slide.from].position.x=-slide.direction*ease*5;objects[selected].position.x=slide.direction*(1-ease)*5;if(t===1){objects[slide.from].visible=false;objects[slide.from].position.x=0;objects[selected].position.x=0;slide=null;}}const g=objects[selected];if(g){g.rotation.set(0,g.userData.yaw,0);g.position.y=0;
 (g.userData.parts||[]).forEach((part,i)=>{const f=1-Math.exp(-dt*(i===1?5:9));part.userData.sx+=(swayX-part.userData.sx)*f;part.userData.sy+=(swayY-part.userData.sy)*f;
  const m=artifactMotion(pulses,now,selected,i,part.userData.sx,part.userData.sy,reduced);part.rotation.set(m.pitch,m.yaw,m.roll);part.position.y=part.userData.baseY+m.lift/part.userData.displayScale;
 });if(orbit)orbit.update();renderer.render(scene,camera);}drawPattern(now);if(slide||(objects[selected]?.userData.parts||[]).some(p=>Math.abs(p.userData.sx)+Math.abs(p.userData.sy)>.002)||Math.abs(swayX)+Math.abs(swayY)>.002||energyVisual>.002||pulses.some(p=>now-p.at<3500))wake();}
function stopSound(){for(const timer of timers)clearTimeout(timer);timers.clear();for(const v of voices){try{v.stop();}catch{}}voices.clear();try{navigator.vibrate?.(0);}catch{}pulses=[];energyVisual=0;wake();}
function select(i){const previous=selected;stopSound();selected=(i+TYPES.length)%TYPES.length;motion.reset();swayTargetX=swayTargetY=swayX=swayY=0;if(audioContext)loadSamples(selected).catch(()=>status('음원을 불러오지 못했습니다. 연결을 확인하고 다시 활성화해 주세요.'));nav.querySelectorAll('button').forEach((b,n)=>b.setAttribute('aria-current',String(n===selected)));history.replaceState(null,'',`#${TYPES[selected].id}`);objects.forEach((g,n)=>{g.visible=n===selected;g.position.x=0;});slide=null;if(!reduced&&objects.length&&objects[selected].userData.loaded&&previous!==selected){const direction=i>previous?1:-1;objects[previous].visible=true;slide={from:previous,start:performance.now(),direction};}if(orbit){camera.position.set(0,.7,Math.max(7.6,5/camera.aspect));orbit.target.set(0,0,0);orbit.update();}$('#asset-source').href=TYPES[selected].source||`https://www.museum.go.kr/MUSEUM/contents/M0505000000.do?relicId=${TYPES[selected].relicId}&schM=view`;$('#asset-source').textContent=`3D 원본 · ${TYPES[selected].vertexColors?'국가유산청':'국립중앙박물관'} ↗`;ensureAsset(selected);wake();}
async function audio(){try{if(!audioContext){audioContext=new(window.AudioContext||window.webkitAudioContext)();master=audioContext.createGain();master.gain.value=.55;compressor=audioContext.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=8;master.connect(compressor);compressor.connect(audioContext.destination);}await audioContext.resume();return audioContext.state==='running';}catch{return false;}}
async function loadSamples(index){
 const id=TYPES[index].id;if(sampleBuffers.has(id))return sampleBuffers.get(id);
 if(!sampleLoads.has(id))sampleLoads.set(id,Promise.all([0,1,2].map(async n=>{const r=await fetch(`audio/${id}-${n}.wav`);if(!r.ok)throw new Error('Recording load failed');return audioContext.decodeAudioData(await r.arrayBuffer());})).then(buffers=>{sampleBuffers.set(id,buffers);return buffers;}).catch(error=>{sampleLoads.delete(id);throw error;}));
 return sampleLoads.get(id);
}
function soundEvent(p,index,at){
 const type=TYPES[index],buffers=sampleBuffers.get(type.id);if(!buffers||audioContext?.state!=='running')return;
 const cursor=sampleCursor.get(type.id)||0;sampleCursor.set(type.id,cursor+1);
 const source=audioContext.createBufferSource(),gain=audioContext.createGain();source.buffer=buffers[cursor%buffers.length];
 // Keep the recorded timbre: tilt and successive contacts vary playback by at most 4%.
 const rate=clamp(1+(p.frequency/type.base-1)*.2,.96,1.04);source.playbackRate.value=rate;
 gain.gain.setValueAtTime(p.amplitude*1.8,at);source.connect(gain);gain.connect(master);
 if(voices.size>=24){const oldest=voices.values().next().value;try{oldest.stop();}catch{}voices.delete(oldest);}
 voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};source.start(at);source.stop(at+source.buffer.duration/rate+.01);
}
function impact(energy,tilt){if(document.hidden||!audioContext||audioContext.state!=='running'||!sampleBuffers.has(TYPES[selected].id))return;const plan=planImpact(selected,energy,tilt),now=performance.now(),at=audioContext.currentTime+.012;
 for(const p of plan){soundEvent(p,selected,at+p.delay);pulses.push({at:now+12+p.delay*1000,amp:p.amplitude,duration:p.pulse});}
 if(pulses.length>180)pulses=pulses.slice(-180);
 const timer=setTimeout(()=>{timers.delete(timer);try{const accepted=navigator.vibrate?.(vibrationPattern(plan));if(accepted===false)status('소리 재생 중 · 진동이 차단되어 있습니다. 기기 설정을 확인하세요.');}catch{}},12);timers.add(timer);
 energyVisual=Math.max(energyVisual,energy);wake();}
function drawPattern(now){const c=$('#pattern'),w=c.clientWidth,h=c.clientHeight,dpr=Math.min(devicePixelRatio,2);if(c.width!==w*dpr||c.height!==h*dpr){c.width=w*dpr;c.height=h*dpr;}const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);g.strokeStyle='#a4ac982b';g.lineWidth=1;g.beginPath();g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();pulses=pulses.filter(p=>now-p.at<3500);g.strokeStyle='#758862';g.lineWidth=1.5;g.beginPath();for(let x=0;x<w;x++){const time=now-(1-x/w)*3500;let amp=0;for(const p of pulses){const age=time-p.at;if(age>=0&&age<400)amp+=p.amp*Math.exp(-age/100)*Math.sin(age*.17);}const y=h/2-clamp(amp,-1,1)*(h*.4);x?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();for(const p of pulses){const x=w*(1-(now-p.at)/3500);if(x<0||x>w)continue;g.fillStyle='#b09458';g.fillRect(x,h/2-2,Math.max(2,p.duration/3500*w),4);}}
function onMotion(e){if(!enabled||document.hidden)return;const reading=motion.sample(e,performance.now());if(!reading)return;lastSensorAt=performance.now();const raw=e.accelerationIncludingGravity;const ax=Number.isFinite(e.acceleration?.x)?e.acceleration.x:(raw?.x||0)-(motion.gravity?.x||0);const ay=Number.isFinite(e.acceleration?.y)?e.acceleration.y:(raw?.y||0)-(motion.gravity?.y||0);const strength=v=>Math.sign(v)*Math.pow(Math.abs(clamp(v/18,-1,1)),1.3);swayTargetX=strength(ax);swayTargetY=strength(ay);if(Math.abs(swayTargetX)+Math.abs(swayTargetY)+Math.abs(swayX)+Math.abs(swayY)>.002)wake();if(!sensorSeen){sensorSeen=true;clearTimeout(sensorTimer);status('');}if(orientationAvailable)motion.tilt=lastOrientation;if(reading.energy>0)impact(reading.energy,motion.tilt);}
function onOrientation(e){if(!enabled||!Number.isFinite(e.gamma))return;orientationAvailable=true;lastOrientation=clamp(e.gamma/90,-1,1);motion.tilt=lastOrientation;}
function stopSensors(message){sensorGeneration++;enabled=false;clearTimeout(sensorTimer);window.removeEventListener('devicemotion',onMotion);window.removeEventListener('deviceorientation',onOrientation);$('#start').disabled=false;motion.reset();swayTargetX=swayTargetY=0;stopSound();if(message)status(message);}
async function start(){if(busy)return;if(enabled){$('#activation').close();return;}busy=true;$('#start').disabled=true;const generation=++sensorGeneration;
 try{
 // Request both permissions within this click's transient activation, before awaiting audio.
 const requests=[window.DeviceMotionEvent,window.DeviceOrientationEvent].map(API=>typeof API?.requestPermission==='function'?API.requestPermission().catch(()=>'denied'):Promise.resolve('granted'));
 const soundReady=audio();const [motionPermission,orientationPermission]=await Promise.all(requests);const audioReady=await soundReady;
 if(generation!==sensorGeneration||document.hidden)return;
 if(!audioReady){status('소리를 시작할 수 없습니다. 브라우저 소리 설정을 확인해 주세요.');return;}
 try{await Promise.all(TYPES.map((_,i)=>loadSamples(i)));}catch{status('음원을 불러오지 못했습니다. 연결을 확인하고 다시 눌러 주세요.');return;}if(generation!==sensorGeneration||document.hidden)return;status('');
 if(!window.isSecureContext){status('흔들림 감지는 HTTPS 주소에서 사용하세요.');return;}
 if(motionPermission!=='granted'){status('동작 센서 권한이 허용되지 않았습니다. 브라우저 설정에서 허용한 뒤 화면을 터치하세요.');return;}
 if(!window.DeviceMotionEvent){$('#activation').close();status('이 기기는 동작 센서가 없습니다. 유물을 가로로 돌려볼 수 있어요.');return;}
 enabled=true;sensorSeen=false;orientationAvailable=false;motion.reset();$('#activation').close();window.addEventListener('devicemotion',onMotion);if(orientationPermission==='granted')window.addEventListener('deviceorientation',onOrientation);
 status('');sensorTimer=setTimeout(()=>{if(enabled&&!sensorSeen)status('센서 값이 들어오지 않습니다. 휴대폰에서 센서 권한을 확인해 주세요.');},3500);wake();
 }catch{status('센서를 시작하지 못했습니다. 화면을 터치해 다시 시도하세요.');}finally{busy=false;$('#start').disabled=false;}}
$('#start').onclick=start;
// Horizontal drag changes only the object's yaw; vertical dragging never tilts it.
stage.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;drag={id:e.pointerId,x:e.clientX,yaw:objects[selected]?.userData.yaw||0};stage.setPointerCapture(e.pointerId);});
stage.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const g=objects[selected];if(g){g.userData.yaw=drag.yaw+(e.clientX-drag.x)*.009;wake();}});
function endDrag(e){if(drag?.id===e.pointerId)drag=null;}
stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);stage.addEventListener('lostpointercapture',endDrag);
stage.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();if(objects[selected])objects[selected].userData.yaw+=(e.key==='ArrowRight'?1:-1)*.15;wake();}});
$('#types').addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();select(selected+(e.key==='ArrowRight'?1:-1));nav.children[selected].focus();}});
$('#fullscreen').onclick=async()=>{const root=$('#experience');try{if(document.fullscreenElement)await document.exitFullscreen();else if(root.classList.contains('immersive'))root.classList.remove('immersive');else if(root.requestFullscreen)await root.requestFullscreen();else{root.classList.add('immersive');status('화면 확장 모드 · 이 브라우저는 시스템 전체화면을 지원하지 않습니다.');}}catch{root.classList.toggle('immersive');status('화면 확장 모드로 전환했습니다.');}syncFullscreen();};
function syncFullscreen(){const active=!!document.fullscreenElement||$('#experience').classList.contains('immersive');$('#fullscreen').setAttribute('aria-label',active?'전체화면 종료':'전체화면');$('#fullscreen').textContent=active?'⊡':'⛶';resize();}document.addEventListener('fullscreenchange',syncFullscreen);
$('#about').onclick=()=>$('#info').showModal();$('#close-info').onclick=()=>$('#info').close();
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopSensors();audioContext?.suspend();if(frame)cancelAnimationFrame(frame);frame=0;}else{wake();if(!$('#activation').open)$('#activation').showModal();}});window.addEventListener('pagehide',()=>stopSensors());
setup3D();select(Math.max(0,TYPES.findIndex(type=>type.id===location.hash.slice(1))));wake();

$('#activation').addEventListener('cancel',e=>e.preventDefault());
$('#activation').showModal();
