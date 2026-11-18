from pathlib import Path
import base64,html,json
OUT=Path('docs/design/assets')
def esc(s):return html.escape(str(s))
def text(x,y,s,size=22,color='#f6f2e9',weight=400):return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" font-weight="{weight}">{esc(s)}</text>'
def rect(x,y,w,h,fill,stroke='none',r=0):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" rx="{r}"/>'
def svg(name,w,h,parts):
 (OUT/name).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><style>text{{font-family:"Apple SD Gothic Neo","Noto Sans KR",sans-serif}}</style>'+''.join(parts)+'</svg>')
def photo(name,x,y,w,h):
 data=base64.b64encode((OUT/name).read_bytes()).decode()
 return f'<image x="{x}" y="{y}" width="{w}" height="{h}" xlink:href="data:image/png;base64,{data}"/>'
def lum(h):
 cs=[int(h[i:i+2],16)/255 for i in (1,3,5)];cs=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in cs];return sum(c*w for c,w in zip(cs,[.2126,.7152,.0722]))
def ratio(a,b):
 x,y=sorted([lum(a),lum(b)]);return (y+.05)/(x+.05)
p=[rect(0,0,1600,1100,'#f6f2e9'),text(60,76,'UI 배치도',40,'#192536',700),text(60,118,'청동의 울림 · 실제 모바일 화면 · 390 × 844px',22,'#515d6d')]
for x,label in [(60,'관찰 화면'),(480,'유물 살펴보기'),(900,'관찰 화면의 구성')]:p.append(text(x,170,label,26,'#192536',700))
p +=[photo('viewer-light.png',60,194,351,760),photo('viewer-tactile.png',480,194,351,760)]
x,y=900,194;scale=.9
p +=[rect(x,y,351,760,'#eee9df','#7a7e82',12)]
for sy,sh,c,label in [(0,70,'#e4e8ef','출처'),(70,510,'#f6f2e9','중앙 유물 관찰'),(580,50,'#e4e8ef','소리·진동 반응'),(630,60,'#f6f2e9','설명 텍스트'),(690,80,'#edcf8b','유물 종류 선택'),(770,62,'#26488c','유물 살펴보기')]:
 p+=[rect(x+7,y+sy*scale,337,sh*scale,c),text(x+20,y+(sy+sh/2)*scale+8,label,21,'#ffffff' if c=='#26488c' else '#192536')]
p +=[text(1290,260,'상단',28,'#192536',700),text(1290,300,'보조 기능 분리',21,'#515d6d'),text(1290,450,'중앙',28,'#192536',700),text(1290,490,'관찰 공간 확보',21,'#515d6d'),text(1290,760,'하단',28,'#192536',700),text(1290,800,'엄지로 조작',21,'#515d6d'),text(1290,840,'종류 선택 → 살펴보기',21,'#515d6d')]
p +=[text(60,1010,'관찰은 중앙에, 자주 쓰는 조작은 하단에 배치한다.',28,'#192536',700),text(60,1050,'유물 살펴보기에서는 선택 메뉴를 숨기고, 현재 유물·부위별 설명·돌아가기만 표시한다.',22,'#515d6d')]
svg('layout.svg',1600,1100,p)
colors=[('Paper','#f6f2e9','기본 바탕'),('Ink','#192536','기본 글자'),('Blue','#26488c','실행 · 포커스'),('Gold','#edcf8b','윤곽 · 활성'),('Night','#111b2a','탐색 바탕'),('Muted','#515d6d','보조 글자'),('Line','#7a7e82','경계 · 패턴'),('Night muted','#c5cedb','탐색 보조 글자')]
p=[rect(0,0,1600,1000,'#f6f2e9'),text(60,80,'사용 색상표',44,'#192536',700),text(60,125,'청동 유물의 질감을 유지하고, 조작과 윤곽에 대비를 집중한다.',25,'#515d6d')]
for i,(name,c,role) in enumerate(colors):
 x=60+(i%4)*380;y=180+(i//4)*340
 p +=[rect(x,y,350,165,c,'#7a7e82',12),text(x,y+210,name,28,'#192536',700),text(x,y+252,c.upper(),23,'#515d6d'),text(x,y+294,role,23,'#192536')]
p +=[text(60,928,'보조 색상  ·  진동 패턴 #79501D  ·  어두운 화면 포커스 #99BAFF',24,'#515d6d')]
svg('palette.svg',1600,1000,p)
pairs=[('본문 / 아이보리','#192536','#f6f2e9','일반 글자 ≥ 4.5'),('보조 글자 / 아이보리','#515d6d','#f6f2e9','일반 글자 ≥ 4.5'),('파랑 / 아이보리','#26488c','#f6f2e9','일반 글자 ≥ 4.5'),('흰색 / 실행 버튼','#ffffff','#26488c','일반 글자 ≥ 4.5'),('골드 / 탐색 바탕','#edcf8b','#111b2a','번호 ≥ 4.5 · 선 ≥ 3'),('밝은 글자 / 탐색 바탕','#f6f2e9','#111b2a','일반 글자 ≥ 4.5'),('경계선 / 아이보리','#7a7e82','#f6f2e9','조작 경계 ≥ 3')]
p=[rect(0,0,1600,1060,'#111b2a'),text(60,80,'명암비 표',44,weight=700),text(60,124,'WCAG 상대 휘도 공식 · (밝은 휘도 + 0.05) / (어두운 휘도 + 0.05)',24,'#c5cedb')]
for i,(label,fg,bg,target) in enumerate(pairs):
 y=170+i*108
 p +=[rect(60,y,330,82,bg,'#7a7e82',8),text(80,y+52,'청동의 울림 Aa',28,fg,700),text(430,y+35,label,26),text(430,y+69,f'{fg.upper()}  /  {bg.upper()}',21,'#c5cedb'),text(1010,y+52,f'{ratio(fg,bg):.2f}:1',34,'#edcf8b',700),text(1250,y+49,target,21)]
p +=[text(60,982,'일반 글자 4.5:1 이상 · 조작 경계 3:1 이상을 기준으로 색상 쌍의 명암비를 계산한다.',23,'#c5cedb'),text(60,1022,'기준: WCAG 2.2 · 1.4.3 Contrast (Minimum) / 1.4.11 Non-text Contrast',21,'#c5cedb')]
svg('contrast.svg',1600,1060,p)
(OUT/'contrast.json').write_text(json.dumps([dict(label=l,foreground=f,background=b,ratio=round(ratio(f,b),2)) for l,f,b,t in pairs],ensure_ascii=False,indent=2))

rows=[('관찰 본문','#192536','#f6f2e9','밝은 바탕에서 글자를 또렷하게'),('보조 문구','#515d6d','#f6f2e9','작은 정보도 읽기 대비를 유지'),('실행 버튼','#ffffff','#26488c','눌러야 할 행동을 분명하게'),('윤곽·번호','#edcf8b','#111b2a','어두운 바탕에서 모양을 강조'),('부위별 해설','#f6f2e9','#111b2a','형태를 보며 설명을 읽도록')]
p=[rect(0,0,1600,850,'#f6f2e9'),text(60,76,'색상과 명암',40,'#192536',700),text(60,122,'실제 UI 색상과 명암비를 함께 읽는다.',23,'#515d6d')]
for i,(role,fg,bg,why) in enumerate(rows):
 y=170+i*120
 p +=[rect(60,y,320,90,bg,'#7a7e82',8),text(82,y+57,'유물 살펴보기',28,fg,700),text(420,y+34,role,25,'#192536',700),text(420,y+72,fg.upper()+' / '+bg.upper(),21,'#515d6d'),text(900,y+55,f'{ratio(fg,bg):.2f}:1',30,'#26488c',700),text(1120,y+52,why,22,'#192536')]
p +=[text(60,817,'명암비: WCAG 상대 휘도 공식으로 계산 · 색상 외에도 밑줄, 테두리, 굵기로 상태를 구분한다.',22,'#515d6d')]
svg('color-contrast.svg',1600,850,p)
