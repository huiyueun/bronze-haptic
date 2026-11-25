/* 청동의 울림 — 작품 소개 · 만든 사람 · 사용법 안내 창.
   앱 기본 음성 모드: 단추는 한 번 누르면 이름을 읽고, 한 번 더 누르면 실행(앱의 다른 단추와 같은 방식).
   창을 열거나 탭을 바꾸면 그 내용을 문장마다 짚어 가며 읽어 준다.
   스크린리더(톡백) 모드: 한 번에 실행하고 앱 음성은 내지 않는다(톡백이 읽는다). */
(function(){
 const $=s=>document.querySelector(s),dlg=$('#guide');if(!dlg)return;
 const isSR=()=>{const r=document.querySelector('#experience > .reader-announcement');return !!r&&r.getAttribute('aria-live')==='polite';};
 const canSpeak=()=>'speechSynthesis' in window&&typeof SpeechSynthesisUtterance==='function';
 let gen=0,pending=null,pendingTimer=0,opener=null,tab='about';
 function stopReading(){gen++;try{if(canSpeak())speechSynthesis.cancel();}catch(e){}dlg.querySelectorAll('.reading').forEach(e=>e.classList.remove('reading'));}
 function say(text,cb){if(isSR()||!canSpeak()){cb&&cb();return;}try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=.95;let done=false;const f=()=>{if(done)return;done=true;cb&&cb();};u.onend=f;u.onerror=f;speechSynthesis.speak(u);setTimeout(f,2500+text.length*220);}catch(e){cb&&cb();}}
 function readPanel(){stopReading();if(tab==='video')return;if(isSR()||!canSpeak())return;const my=gen,panel=$('#gp-'+tab),items=[...panel.querySelectorAll('h3,p,li')];let i=0;
  (function next(){if(my!==gen||!dlg.open)return;items.forEach(e=>e.classList.remove('reading'));if(i>=items.length)return;const el=items[i++];el.classList.add('reading');try{el.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(e){}
   const t=el.textContent.replace(/\s+/g,' ').trim();if(!t){next();return;}
   try{const u=new SpeechSynthesisUtterance(t);u.lang='ko-KR';u.rate=.95;let done=false;const f=()=>{if(done||my!==gen)return;done=true;setTimeout(next,200);};u.onend=f;u.onerror=f;speechSynthesis.speak(u);setTimeout(f,2500+t.length*220);}catch(e){next();}})();}
 function showTab(name,read){stopReading();$('#guide-video').pause();tab=name;$('#guide-listen').hidden=name==='video';dlg.querySelectorAll('[role=tab]').forEach(b=>{const on=b.dataset.tab===name;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
  dlg.querySelectorAll('.g-panel').forEach(p=>{p.hidden=p.id!=='gp-'+name;});dlg.scrollTop=0;if(read)readPanel();}
 function open(from,name){if(name)tab=name;opener=from||document.activeElement;stopReading();showTab(tab,false);if(!dlg.open)dlg.showModal();setTimeout(()=>{try{$('#guide-title').focus({preventScroll:true});}catch(e){}},30);
  if(!isSR())say('작품 소개와 사용법 창입니다. 위쪽에 작품 소개, 작품 영상, 만든 사람, 사용법 단추가 있습니다.',()=>{if(dlg.open)readPanel();});}
 function close(){stopReading();if(dlg.open)dlg.close();}
 dlg.addEventListener('close',()=>{$('#guide-video').pause();stopReading();clearPending();try{opener&&opener.focus({preventScroll:true});}catch(e){}});
 function clearPending(){if(pending)pending.removeAttribute('data-preview');pending=null;clearTimeout(pendingTimer);}
 /* 두 번 누르기: 앱 기본 음성일 때만 */
 function twoTap(btn,action){btn.addEventListener('click',e=>{if(!e.isTrusted||isSR()){clearPending();action(btn);return;}
  if(pending===btn){clearPending();action(btn);return;}
  clearPending();stopReading();pending=btn;btn.setAttribute('data-preview','true');say((btn.dataset.say||btn.textContent.trim())+'. 한 번 더 누르면 실행합니다.');pendingTimer=setTimeout(clearPending,4000);});}
 twoTap($('#guide-open'),b=>open(b));
 document.querySelectorAll('[data-guide-tab]').forEach(b=>twoTap(b,x=>open(x,x.dataset.guideTab)));
 twoTap($('#guide-close'),close);twoTap($('#guide-close2'),close);
 twoTap($('#guide-listen'),()=>readPanel());
 dlg.querySelectorAll('[role=tab]').forEach(b=>twoTap(b,x=>{showTab(x.dataset.tab,true);x.focus({preventScroll:true});}));
 /* 탭 목록: 좌우 화살표로 이동 */
 $('#guide .g-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=[...dlg.querySelectorAll('[role=tab]')],i=tabs.indexOf(document.activeElement);if(i<0)return;e.preventDefault();
  const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[n].focus();showTab(tabs[n].dataset.tab,!isSR());});
 $('#guide-video').addEventListener('play',stopReading);
 dlg.addEventListener('click',e=>{if(e.target===dlg)close();});
 dlg.addEventListener('cancel',()=>stopReading());
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopReading();$('#guide-video').pause();}});
})();
