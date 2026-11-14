// A soft, clear bell with stable pitch and a gently fading metallic overtone. Generated locally; no audio download is needed.
export function createTactileSound({AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,now=()=>performance.now()}={}){
 let context=null,lastPlayed=-Infinity;
 const voices=new Set();
 function unlock(){
  try{
   if(!AudioContextClass)return;
   context??=new AudioContextClass();
   if(context.state==='suspended')context.resume().catch(()=>{});
  }catch{/* Sound is optional; tactile exploration must remain available. */}
 }
 function play(){
  if(!context||context.state!=='running'||now()-lastPlayed<1000)return false;
  lastPlayed=now();
  const start=context.currentTime;
  for(const [frequency,volume,decay] of [[880,.065,1.3],[1762,.018,.9],[2394,.009,.55]]){
   const oscillator=context.createOscillator(),gain=context.createGain();
   oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,start);
   gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.008);
   gain.gain.exponentialRampToValueAtTime(.0001,start+decay);
   oscillator.connect(gain);gain.connect(context.destination);
   const voice={oscillator,gain};voices.add(voice);
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();voices.delete(voice)};
   oscillator.start(start);oscillator.stop(start+decay+.015);
  }
  return true;
 }
 function stop(){for(const {oscillator,gain} of voices){gain.gain.cancelScheduledValues(context.currentTime);gain.gain.setValueAtTime(0,context.currentTime);try{oscillator.stop()}catch{}}}
 function reset(){stop();lastPlayed=-Infinity;}
 function cue(proximity=0,arrival=false){
  if(!context||context.state!=='running')return false;
  const start=context.currentTime;
  for(let i=0;i<2;i++){
   const oscillator=context.createOscillator(),gain=context.createGain(),t=start+i*(arrival?.12:.085);
   const base=arrival?(i?1320:990):460+proximity*330;
   oscillator.type='sine';oscillator.frequency.setValueAtTime(base*(arrival?1:1.45),t);
   oscillator.frequency.exponentialRampToValueAtTime(base,t+.10);
   gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(arrival?.07:.045,t+.012);
   gain.gain.exponentialRampToValueAtTime(.0001,t+.19);
   oscillator.connect(gain);gain.connect(context.destination);
   const voice={oscillator,gain};voices.add(voice);
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();voices.delete(voice)};
   oscillator.start(t);oscillator.stop(t+.2);
  }
  return true;
 }
 return {unlock,play,stop,reset,cue};
}
