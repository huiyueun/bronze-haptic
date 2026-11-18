// Keyboard-wedge sensors send one digit followed by Enter (including numpad Enter).
// Keep this separate from ordinary Enter activation and from editable fields.
export function createPartCommand({isEnabled,onSelect,now=()=>performance.now()}){
 let digits='',updated=0,consumedEnter=false;
 function reset(){digits='';updated=0;consumedEnter=false;}
 function keydown(event){
  const editable=event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
  if(!isEnabled()||editable||event.isComposing||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey){reset();return;}
  const time=now();if(time-updated>2000)digits='';
  if(event.key==='Enter'&&event.repeat&&consumedEnter){event.preventDefault();event.stopImmediatePropagation();return;}
  if(/^\d$/.test(event.key)){
   event.preventDefault();event.stopImmediatePropagation();
   if(!event.repeat){digits=(digits+event.key).slice(0,2);updated=time;consumedEnter=false;}
   return;
  }
  if(event.key==='Enter'&&digits){
   event.preventDefault();event.stopImmediatePropagation();
   const number=/^[123]$/.test(digits)?Number(digits):null;
   digits='';consumedEnter=true;
   if(number!==null)onSelect(number);
   return;
  }
  reset();
 }
 return {keydown,reset};
}
