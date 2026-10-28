// Same timestamps as the sound/haptic plan. Bounded response, independent of frame rate.
export function pulseMotion(pulses,now,type=0,reduced=false){
 const zero={yaw:0,roll:0,pitch:0,lift:0};if(reduced)return zero;
 const speed=[34,26,21,17][type]||26;
 let kick=0,lift=0;
 for(const p of pulses){const age=(now-p.at)/1000;if(age<0||age>.7)continue;
  const envelope=Math.exp(-age*9),attack=1-Math.exp(-age*95);
  kick+=p.amp*envelope*attack*Math.sin(age*speed);
  lift+=p.amp*envelope*attack;
 }
 // Saturation avoids large excursions when many impacts overlap; max added rotation ~3.7 degrees.
 if(kick===0&&lift===0)return zero;
 const k=Math.tanh(kick*1.4);
 return {yaw:k*.055,roll:-k*.065,pitch:k*.04,lift:Math.tanh(lift)*.035};
}

// Each physical artifact has its own pivot, lag and direction, even within a pair.
export function artifactMotion(pulses,now,type,part,sx,sy,reduced=false){
 if(reduced)return {yaw:0,roll:0,pitch:0,lift:0};
 const paired=type===1||type===3,second=paired&&part===1;
 const kick=pulseMotion(pulses,now-(second?65:0),type,false);
 const strength=[1,1.7,1.9,2][type]||1;
 const direction=second?-1:1,weight=second?.87:1;
 return {yaw:direction*strength*weight*(sx*.16+kick.yaw),roll:direction*strength*(sx*-.12+kick.roll),pitch:strength*(sy*(second?.075:.10)+kick.pitch*(second?-0.8:1)),lift:strength*(sy*.045+kick.lift)*(second?.72:1)};
}
