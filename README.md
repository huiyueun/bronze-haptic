# 청동 3D 햅틱 뷰어

국가유산청의 실제 청동방울 3D 자료와 공유마당의 방울 녹음을 이용한 흔들기 체험입니다.

## 사용

상단에서 팔주령·쌍두령·조합식쌍두령·간두령을 선택합니다. 초기 팝업에서 소리와 동작 센서를 활성화한 뒤 휴대폰을 흔들면 강도와 기울기에 따라 소리, 유물 움직임, 하단 패턴이 달라집니다. 가로 드래그로 유물을 회전할 수 있습니다.

지원 Android 브라우저에서는 진동을 사용할 수 있습니다. iOS 웹에서는 진동이 지원되지 않습니다. 센서는 HTTPS와 사용자 권한이 필요하며 실제 기기별 반응은 다를 수 있습니다.

## 개발

```sh
npm ci
npm test
npm run build
python3 -m http.server 8768 --directory docs
```

브라우저에서 http://localhost:8768 을 엽니다.

- `src/`: 뷰어, 센서 반응, 개별 유물 움직임
- `docs/`: GitHub Pages에 배포하는 정적 웹 파일 (약 2.2MB)
- `docs/assets/`: 경량화한 GLB 4종 및 출처 기록
- `docs/audio/`: 가공한 녹음 12개 및 출처 기록
- `test/`: 센서 반응과 패턴 움직임 테스트
- `scripts/`: 원본 자료를 경량화하는 선택적 재생성 도구

HTML/CSS는 `docs/index.html`, `docs/style.css`에서 수정합니다. JavaScript 수정 후 `npm run build`로 `docs/app.js`를 갱신하고 함께 커밋합니다.

## GitHub Pages 배포

저장소 Settings → Pages → Deploy from a branch → `main` / `/docs`를 선택합니다.
상대 경로를 사용하므로 저장소 하위 URL에서도 모델과 음원이 로드됩니다.

## 출처와 가공

### 3D 자료

- 제공: 국가유산청, 국보 제255호 전 덕산 청동방울 일괄
- [원본 자료](https://digital.khs.go.kr/record/recordDetail3D.do?ichDataUid=13903604992362301744&bizId=BIZ200400001214)
- 이용 조건: 공공누리 제1유형 (출처표시)
- 전체 PLY에서 팔주령 1점, 쌍두령 2점, 조합식쌍두령 1점, 간두령 2점을 분리했습니다. 총 90,526개 면으로 경량화하고 meshopt 압축을 적용했습니다.
- 색상은 원본 RGB 정점색이며 별도 이미지 텍스처가 아닙니다. 간두령의 표시 간격을 조정했습니다.
- 상세 가공 내역과 원본 해시는 각 `docs/assets/*/provenance.json`에 있습니다.

### 음원

한국저작권위원회가 공유마당에 제공한 국악기_방울 1·3·4·5 녹음을 CC BY 4.0에 따라 사용합니다. 구간 추출, 음높이·필터·감쇠 가공을 적용했습니다. 실제 유물의 실측 녹음이나 복원음은 아닙니다.

개별 원문 링크, 라이선스와 변경 내역은 `docs/audio/provenance.json` 및 뷰어의 ⓘ 안내에 있습니다.

### 라이브러리

Three.js (MIT), 라이선스는 `docs/THREE-LICENSE.txt`에 포함됩니다. 모델·음원의 이용 조건은 각각 위 출처를 따릅니다.

## 원본 재생성 (선택)

일반 빌드와 실행에는 원본이 필요하지 않습니다. 원본 PLY는 `assets-original/deoksan-set/source.ply`에 두고 프로젝트 루트에서 `node scripts/prepare-deoksan-set.mjs`로 재생성합니다. 음원 도구는 PATH의 ffmpeg와 상위 폴더의 `audio-library/공유마당-방울/sources.json` 및 해당 원본 파일을 사용합니다. 대용량 원본은 저장소에 포함하지 않습니다.

## 확인 범위

자동 테스트는 센서 무입력, 강도별 반응, 소리·진동 예약 시각, 독립 유물 움직임과 감소된 움직임 설정을 확인합니다. 실제 휴대폰 센서와 진동 모터는 기기에서 별도 확인이 필요합니다.
