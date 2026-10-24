# Word Master Adventure

새로 작성한 모바일 전용 React + TypeScript + Vite 앱입니다. 기존 프로젝트를 사용하지 않았습니다.

## 실행

```bash
npm install
npm run dev
```

Vite가 표시하는 주소로 접속합니다. 같은 네트워크에서 접속할 수 있는 환경이라면 해당 기기의 IP와 포트로 모바일 브라우저에서 확인할 수 있습니다.

```bash
npm run build
npm run preview
```

`dist/`에 정적 빌드가 생성됩니다. 배포 및 외부 서비스 연결은 포함하지 않습니다.

## 구성

- `src/App.tsx`: 해시 기반 화면 이동, 학습 지도, DAY 상세, 준비 중 화면과 안내 대화상자
- `src/state/learning.tsx`: 임시 학습 기록, DAY/단계 정의, 진행률 및 순차 잠금 판단
- `src/components/`: 직접 작성한 SVG 아이콘과 식물 장식
- `src/styles.css`: 320~430px 모바일 스타일, 하단 고정 메뉴, Safe Area, 모션 감소 지원
- `public/gecko-mascot.jpg`: 사용자가 제공한 게코 원본 이미지

현재 콘텐츠가 준비된 DAY 01 예문 학습만 열려 있습니다. `getStepStatus`는 콘텐츠 존재 여부를 우선 확인한 뒤 완료 기록과 순차 해제 정책(`sequential`)을 적용합니다. 향후 자유 선택 정책(`free`)도 콘텐츠가 준비된 단계에만 적용됩니다.

DAY 01 예문은 실제 학습 화면으로 연결되며 세트 완료 기록을 브라우저 localStorage에 저장합니다. 예문 8개 세트를 완료하면 DAY 01 가로세로 퍼즐이 열립니다. 다른 DAY는 계속 잠겨 있습니다. 상단 XP와 연속 학습 일수는 0인 임시 데이터입니다. 앱 내 PDF 처리와 XP 보상은 구현하지 않았습니다.

첨부물에서 별도의 학습 지도 참고 이미지는 확인되지 않아, 요청한 지그재그 경로와 모바일 게임 스타일을 직접 구현했습니다.

## 3단계 단어 데이터

`src/data/vocabulary/day01.json`~`day05.json`에 첨부 PDF의 영어 단어를 각 40개씩 원본 순서로 등록했습니다. **첨부 PDF의 한글 뜻 칸은 비어 있으므로 원본 보존용 JSON 200개 항목 모두 `meaning: null`입니다.** 원본 미수록 상태와 3단계 검증 결과는 [단어 데이터 검증 기록](docs/vocabulary-verification.md)에 정리했습니다. 지도에는 등록 단어 수 또는 준비 중 상태를 표시합니다.

정적 검증: `python3 scripts/validate-vocabulary.py` (npm 설치 불필요).

## 4단계 DAY 01 예문 학습

- 지도에서 DAY 01 예문 노드를 선택하거나 `#/learn/day/1`로 이동합니다.
- 원본 5개 JSON은 그대로 유지하며, DAY 01의 학습용 뜻 40개는 `src/data/vocabulary/day01-learning-meanings.json`에 별도로 저장했습니다. `getDayVocabulary(1)`은 이 뜻을 합쳐 반환합니다. 뜻과 예문은 새로 작성한 콘텐츠이며 교재 원문이 아닙니다.
- 원본 순서의 연속된 5개 단어로 구성한 이야기 8개는 `src/data/lessons/day01.json`에 있습니다.
- 강조한 단어의 뜻 보기, 5개 뜻 목록, 영어 단어·이야기 발음, 해석 숨기기·보기, 이전·다음 및 세트 선택을 제공합니다.
- 세트마다 완료 버튼을 눌러 기록하며, 8개가 모두 완료되어야 지도에 DAY 01 예문 완료 별이 표시됩니다. 다시 학습해도 기록은 유지되고 XP는 부여하지 않습니다.
- 발음은 Web Speech API로 사용자의 클릭 안에서 시작합니다. 미지원·재생 오류와 저장소 접근 실패를 화면에 안내합니다.
- [학습 콘텐츠와 검증 안내](docs/day01-learning.md)

설치 없이 실행하는 검증 (저장 로직 검증은 Node 22.6+ 권장):

```bash
python3 scripts/validate-day01-lessons.py
node --experimental-strip-types scripts/day01-progress.test.mjs
```

## 5단계 DAY 01 가로세로 퍼즐

지도 DAY 01 퍼즐 노드, 하단 퍼즐 메뉴 또는 `#/puzzle/day/1`로 이동합니다. 예문 8세트 완료 전에는 잠금 안내를 표시합니다.

- 40개 단어 중 교차 가능한 10~13개를 무작위로 배치하며 최대 20회 시도합니다. 10개 이상이 어려우면 8개 이상인 최선의 결과를 사용하고, 그마저 실패하면 명시적인 다시 생성 버튼을 표시합니다.
- 가로·세로 모두 포함한 하나의 연결된 퍼즐을 생성합니다. 교차 문자를 맞추고 인접 단어 충돌을 막으며, 빈 가장자리를 제거하고 시작점 순서로 번호를 부여합니다. 격자는 최대 15×15이며 짧은 변이 가로가 되도록 정리합니다.
- 칸 선택, 교차 칸 재선택/방향 전환, 영어 입력, 자동 다음 칸, Backspace, 붙여넣기와 글자 수정을 지원합니다. 실제 영어 입력창과 현재 단어 패턴을 격자 위의 sticky 카드에 표시합니다.
- 기본 힌트는 기존 영어 이야기에서 정답 단어를 빈칸으로 바꾼 문장입니다. 단어마다 한글 뜻 → 한 글자 순으로 두 단계 힌트를 제공합니다.
- 단어 확인/전체 채점은 답을 자동 공개하지 않습니다. 오답은 수정할 수 있으며 전체 정답인 경우 원본 게코 이미지와 함께 완료 화면을 표시합니다.
- 현재 퍼즐·입력·힌트·오답과 완료 날짜를 localStorage에 저장합니다. 새 퍼즐을 생성해도 이전 완료 기록은 유지합니다. 저장 실패는 화면에 안내합니다.
- DAY 01 예문과 퍼즐이 모두 완료되면 지도에서 DAY 01 전체가 완료됩니다. 새 퍼즐을 시작해도 이미 완료한 DAY 기록은 유지합니다.

검증:

```bash
node --experimental-strip-types scripts/crossword.test.mjs
```

100개 시드 생성 검사와 입력·힌트 문장·채점·저장/복원 테스트를 포함합니다. [퍼즐 검증 및 배포 안내](docs/puzzle-and-deployment.md)에서 현재 실행/배포 검증 범위를 확인할 수 있습니다.

## Cloudflare Pages 빌드 설정

GitHub에 이 프로젝트를 저장한 다음 Cloudflare Pages에서 해당 저장소를 연결합니다.

| 설정 | 값 |
| --- | --- |
| Framework preset | Vite |
| Production branch | 업로드한 기본 브랜치 (보통 main) |
| Root directory | 저장소 루트 |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js | 22 (22.12 이상, `.nvmrc` / `.node-version` 포함) |

이 앱에는 서버 비밀정보나 별도 런타임 환경변수가 필요하지 않습니다. 학습 기록은 브라우저별로 저장합니다. `package-lock.json`은 실제 의존성 설치로 생성한 경우에만 포함하며 임의로 만들지 않습니다. 현재 lockfile은 없습니다.
