# Word Master Adventure

React + TypeScript + Vite로 만든 스마트폰·폴더블에 대응하는 영어 학습 앱입니다. DAY 01~50 지도와 기존 레오파드게코 이미지를 유지하고, DAY 01~05의 단어 200개를 이야기와 가로세로 퍼즐로 학습합니다.

## 실행 및 검사

Node.js 22.12 이상이 필요합니다. 의존성이 이미 설치된 환경에서는 설치를 반복하지 않아도 됩니다.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run test:render
npm run build
npm run preview
```

`npm test`는 데이터·퍼즐·진행·저장·음성 제어 로직 검사입니다. `test:render`는 React 서버 렌더링 검사이며, 브라우저의 실제 레이아웃·터치·오디오 출력 검사가 아닙니다. 빌드 결과는 `dist/`에 생성됩니다. 개발 서버는 모바일에서 접근 가능한 네트워크에서만 기기의 IP로 접속할 수 있습니다.

## 학습 흐름

- DAY 01~05 각각 40개 단어, 원본 순서대로 5개씩 8세트, 총 40세트.
- 예문 8세트 완료 → 같은 DAY 퍼즐 해제 → 퍼즐 완료 → 다음 DAY 해제.
- DAY 06~50은 준비 중입니다. XP 계산 및 보상은 구현하지 않았으며 상단 XP·연속 일수는 기존 0 값을 유지합니다.
- 공통 `SentenceLesson`과 `CrosswordGame`에 DAY를 전달합니다. 퍼즐 엔진은 DAY마다 복제하지 않습니다.
- 각 DAY의 40개 단어만 무작위 선택합니다. 최대 20회 생성 시도, 10~13개 우선/8개 이상 대체, 연결·교차·인접·번호·가장자리 검사.
- 입력·Backspace·교차 칸 공유·방향 전환·두 단계 힌트·단어/전체 채점·새 퍼즐을 제공합니다.
- 단어장에는 전체 단어, 별표, 오답 복습 탭이 있습니다. 한글 뜻을 보고 영어 철자를 입력하며 성공/실패 이력을 보존합니다.
- 별표 해제와 복습 성공은 기존 오답 이력을 삭제하지 않습니다. 새 퍼즐도 완료 이력과 오답을 보존합니다.

## 데이터 출처

`src/data/vocabulary/day01.json`~`day05.json`의 영어 철자·순서·ID·DAY와 `meaning: null`을 보존합니다. 원본 PDF의 뜻 칸은 비어 있습니다. 별도 `dayNN-learning-meanings.json`에 일반적 용법을 바탕으로 작성한 학습용 뜻을 관리하고 공통 접근자가 합쳐 반환합니다. `src/data/lessons/dayNN.json`의 이야기와 번역도 앱을 위해 작성한 콘텐츠입니다. 교재 공식 뜻·예문 또는 특정 사전의 인용으로 표시하지 않습니다. 이 출처 설명은 개발 문서와 데이터 메타데이터에 보존하며 학습 카드에는 반복 노출하지 않습니다.

기존 DAY 01 이야기·뜻과 사용자 제공 `public/gecko-mascot.jpg`는 유지했습니다. 각 DAY는 40개 뜻과 8개 이야기를 갖고, 모든 대상 단어가 원형 그대로 해당 이야기에 등장합니다.

## 음성

실제 MP3 240개(단어 200개·전체 이야기 40개)를 포함하고 HTML5 Audio를 기본 재생 방식으로 사용합니다. Piper의 미국 영어 목소리로 기존 영어 원문만 로컬 합성했습니다. 한글 해석을 읽지 않습니다. 유료 API나 서비스 키를 사용하지 않습니다.

- `public/audio/words`와 `public/audio/stories`의 콘텐츠 해시 경로를 사용합니다. 동일 단어는 한 파일을 공유합니다.
- 클릭 안에서 즉시 `audio.play()`를 요청하며 Promise 거절·로딩 시간 초과·파일 오류를 처리합니다. MP3 실패 시에만 기존 Web Speech API를 요청당 한 번 시도합니다.
- 느리게 0.75 / 보통 1 / 빠르게 1.15를 `playbackRate`로 적용하고 기존 설정 키에 저장합니다. 목소리 선택은 보조 TTS에만 적용됩니다.
- 재생 중지·다른 재생으로 교체·세트/화면 이동·컴포넌트 정리 시 중지합니다. 오래된 완료/오류 이벤트가 새 재생을 중단하지 못하도록 재생 요청을 구분합니다.
- 실제 실패 시에만 짧은 안내를 보여 줍니다. MP3/TTS 오류는 개발자 로그에서 구분합니다.

파일 생성과 브라우저·실기기 검증은 별개입니다. 이번 HTML5 Audio 버전의 카카오톡·Chrome·Safari 실제 소리 출력은 아직 검증하지 못했습니다. 자세한 생성·검증 범위는 [MP3 음성 문서](docs/mp3-audio.md)를 참고하세요.

## 저장 호환

기존 DAY 01 키는 그대로 사용합니다. 기존 완료 날짜·퍼즐·오답·힌트와 원래 저장 형식을 초기화하지 않습니다.

| 데이터 | 키 |
|---|---|
| DAY별 예문 | `word-master-adventure:dayNN-sentences:v1` |
| DAY별 퍼즐 | `word-master-adventure:dayNN-puzzle:v1` |
| 별표/오답/복습 이력 | `word-master-adventure:collection:v1` |
| 마지막 학습 위치 | `word-master-adventure:position:v1` |
| 음성 설정 | `word-master-adventure:speech:v1` |

구버전 퍼즐의 완료 이력과 현재 퍼즐에 있는 오답은 복습 목록에 합칩니다. 손상된 항목은 검증 후 제외하며, 저장 실패는 사용자에게 알리고 재저장 버튼을 제공합니다. 기록은 같은 기기·브라우저·공개 주소의 저장소에 남습니다. 다른 도메인으로 이동하면 자동 공유되지 않으므로 기존 주소를 유지해야 합니다.

## 배포

기존 저장소: https://github.com/mjae-0987/English-card

기존 Cloudflare Pages 프로젝트: `english`, 주소: https://english-cq9.pages.dev

설정: Vite / `npm run build` / `dist` / Node 22.12 이상. 실제 설치로 생성된 package-lock.json을 포함합니다.

현재 환경에는 Cloudflare 배포 자격 증명이 없으며 GitHub 자동 배포 연결도 확인되지 않았습니다. 기존 Direct Upload 프로젝트에서 `deploy/word-master-adventure-dist.zip`을 Upload assets에 올릴 수 있습니다. ZIP 최상위에 index.html, assets, audio(MP3 240개), 원본 마스코트, favicon이 들어 있습니다. **저장소 소스 ZIP이나 node_modules를 올리지 마세요.** 기존 프로젝트와 공개 주소를 삭제·중복 생성할 필요가 없습니다.

업로드와 공개 주소 검증이 완료되기 전에는 배포 완료로 표시하지 않습니다. 유료 자동화/추가 결제를 실행하지 않았습니다.

## 검증 범위

[이번 변경 검증](docs/stage6-validation.md)을 참고하세요. 기존 [5단계 브라우저 기록](docs/browser-validation.md)은 이전 DAY 01 버전의 기록이며 이번 변경에 그대로 적용되지 않습니다.

## 오렌지 테마와 폴더블 UI

[현재 변경 및 검증 범위](docs/orange-fold-validation.md)를 참고하세요. 기본 햇살 오렌지와 피치 크림/샌드 오렌지를 설정에서 선택합니다. 760px 이상에서 지도·예문·퍼즐·단어 복습을 2열로 배치하고 최대 너비는 1120px입니다. 너비 변경으로 컴포넌트를 교체하지 않으며 선택 단어/칸과 입력 모드를 별도 view:v1 키로 보존합니다. 원본 데이터·마스코트는 변경하지 않았습니다. 뜻 팝업과 화면 영어 키보드를 제공하며 실제 키보드로 전환할 수 있습니다.

기존 theme/speech/learning 키를 지우지 마세요. 새 테마 키는 `word-master-adventure:theme:v1`입니다. manifest는 standalone 표시를 지원하지만 오프라인 캐시는 구현하지 않았습니다.
