from pathlib import Path
import subprocess,json,hashlib
root=Path(__file__).resolve().parents[1];library=root.parent/'audio-library'/'공유마당-방울';out=root/'docs'/'audio';out.mkdir(exist_ok=True)
sources=json.loads((library/'sources.json').read_text())['items']; report=[]
# Creative timbres from licensed recordings, not reconstructions of artifact sounds.
profiles={
 'paljuryeong':{'rate':1.14,'tail':.72,'eq':'highpass=f=800,equalizer=f=4800:t=q:w=0.8:g=3','label':'밝고 짧은 잔울림'},
 'ssangduryeong':{'rate':1.02,'tail':.8,'eq':'highpass=f=350,equalizer=f=2200:t=q:w=1:g=3','label':'단단하고 선명한 타격'},
 'johap-ssangduryeong':{'rate':.89,'tail':1,'eq':'highpass=f=180,equalizer=f=950:t=q:w=0.7:g=3,lowpass=f=6500','label':'낮고 풍성한 울림'},
 'ganduryeong':{'rate':.78,'tail':1,'eq':'highpass=f=120,equalizer=f=650:t=q:w=0.7:g=4,lowpass=f=4200','label':'묵직하고 긴 울림'}
}
for asset,title,starts,duration in [('paljuryeong','국악기_방울3',[2.12,4.32,7.32],.65),('ssangduryeong','국악기_방울5',[.82,1.52,2.57],.5),('johap-ssangduryeong','국악기_방울1',[.72,1.77,2.07],.65),('ganduryeong','국악기_방울4',[1.62,2.32,2.77],.65)]:
 source=library/'originals'/title/(title+'.wav');meta=next(x for x in sources if x['name']==title)
 profile=profiles[asset];length=duration/profile['rate']*profile['tail']
 for i,start in enumerate(starts):
  target=out/f'{asset}-{i}.wav';subprocess.run(['ffmpeg','-y','-v','error','-ss',str(start),'-i',str(source),'-ac','1','-ar','44100','-af',f"atrim=duration={duration},asetpts=PTS-STARTPTS,asetrate={44100*profile['rate']},aresample=44100,{profile['eq']},atrim=duration={length},afade=t=in:d=0.006,afade=t=out:st={length-.12}:d=0.12,alimiter=limit=0.9:level=false:latency=true",'-c:a','pcm_s16le',str(target)],check=True)
 report.append({'type':asset,'title':title,'author':meta['author'],'source':meta['url'],'license':meta['license'],'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'starts':starts,'duration':length,'timbre':profile,'changes':'구간 발췌·모노 변환·종류별 피치/길이/EQ·페이드·피크 제한. 체험용 음색 디자인, 유물 소리 복원 아님. 재생 시 기울기에 따라 추가 ±4% 속도 변화.','files':[f'{asset}-{i}.wav' for i in range(3)]})
(out/'provenance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('Prepared',sum(1 for _ in out.glob('*.wav')),'recorded samples',sum(p.stat().st_size for p in out.glob('*.wav')),'bytes')
