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
p=[rect(0,0,1600,1100,'#111b2a'),text(60,76,'청동의 울림  /  UI 배치도',40,weight=700),text(60,118,'실제 모바일 캡처 · 390 × 844 CSS px · 안전영역 0px 환경',22,'#c5cedb')]
for x,label in [(60,'01  관찰'),(480,'02  손끝탐색'),(900,'03  영역 구조')]:p.append(text(x,170,label,26,weight=700))
p +=[photo('viewer-light.png',60,194,351,760),photo('viewer-tactile.png',480,194,351,760)]
x,y=900,194;scale=.9
p +=[rect(x,y,351,760,'#1b293b','#c5cedb',12)]
for sy,sh,c,label in [(0,58,'#293649','출처 · 우측 상단'),(58,576,'#23364e','3D 관찰 / 현재 시점 윤곽'),(634,51,'#3d4a5a','반응 패턴 / 탐색 종료'),(685,151,'#796b3d','유물 선택 + 도구')]:
 p+=[rect(x+7,y+sy*scale,337,sh*scale,c),text(x+20,y+(sy+sh/2)*scale+8,label,20)]
p +=[text(1290,260,'8px',32,'#edcf8b',700),text(1290,294,'메뉴 바깥 여백',20),text(1290,378,'4 + 2',32,'#edcf8b',700),text(1290,412,'유물 4열 · 도구 2열',20),text(1290,496,'4 / 8px',32,'#edcf8b',700),text(1290,530,'유물 / 도구 간격',20),text(1290,614,'48px+',32,'#edcf8b',700),text(1290,648,'일반 화면 도구 높이',20),text(1290,732,'16px',32,'#edcf8b',700),text(1290,766,'메뉴 기본 글자',20)]
p +=[text(60,1010,'큰 관찰 영역 → 짧은 반응 → 하단 조작',28,'#edcf8b',700),text(60,1050,'데스크톱: 우측 세로 메뉴 164px  |  모바일: 하단 고정  |  손끝탐색: 보고 있던 자세를 유지',22,'#c5cedb')]
svg('layout.svg',1600,1100,p)
colors=[('Paper','#f6f2e9','기본 바탕'),('Ink','#192536','기본 글자'),('Blue','#26488c','실행 · 포커스'),('Gold','#edcf8b','윤곽 · 활성'),('Night','#111b2a','탐색 바탕'),('Muted','#515d6d','보조 글자'),('Line','#7a7e82','경계 · 패턴'),('Night muted','#c5cedb','탐색 보조 글자')]
p=[rect(0,0,1600,1000,'#f6f2e9'),text(60,80,'사용 색상표',44,'#192536',700),text(60,125,'청동 유물의 질감은 유지하고, 조작과 윤곽에 대비를 집중합니다.',25,'#515d6d')]
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
p +=[text(60,982,'고정 색상 조합의 계산값입니다. 3D 표면 전체의 대비나 전체 사이트의 접근성 적합 판정을 뜻하지 않습니다.',23,'#c5cedb'),text(60,1022,'기준: WCAG 2.2 · 1.4.3 Contrast (Minimum) / 1.4.11 Non-text Contrast',21,'#c5cedb')]
svg('contrast.svg',1600,1060,p)
(OUT/'contrast.json').write_text(json.dumps([dict(label=l,foreground=f,background=b,ratio=round(ratio(f,b),2)) for l,f,b,t in pairs],ensure_ascii=False,indent=2))
