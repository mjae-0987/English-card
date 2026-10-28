# HTML5 Audio migration

현재 상태: 승인받은 무료 Piper 모델로 **실제 MP3 240개(단어 200개 + 전체 이야기 40개, 총 5,336,089바이트)**를 생성했습니다. `catalog.generated.json`에 실제 파일·원문·모델 체크섬을 기록했습니다. GitHub 및 Cloudflare 반영 여부는 실제 커밋과 공개 응답으로 별도 확인하며, 파일 생성·빌드만으로 배포 완료로 표시하지 않습니다.

## 범위 및 호환

- 기존 단어 200개와 영어 이야기 40개만 사용합니다. 원본 단어·뜻·예문·캐릭터·퍼즐·학습 상태 파일은 변경하지 않습니다.
- 중복 단어는 첫 단어 ID의 한 MP3로 공유하며 wordIds에 별칭 ID를 기록합니다. 현재 200개 철자가 모두 달라 단어 파일은 200개가 필요합니다.
- AudioPlayer의 단일 소유자가 HTMLAudioElement를 관리합니다. React 리렌더·화면 너비 변경으로 새 플레이어를 만들지 않습니다.
- play()는 클릭 안에서 바로 호출합니다. fetch/canplay 이벤트를 기다렸다가 호출하는 방식이나 자동 재생에 의존하지 않습니다.
- play Promise 거절, MediaError, 로딩 시간 초과를 처리하고 재시도 가능 상태로 복원합니다. 요청 번호로 오래된 Promise·이벤트를 무시합니다.
- pause/resume/stop, 0.75/1/1.15 playbackRate, 종료 상태 복원, 다른 음성 및 경로 전환 시 중지를 제공합니다.
- MP3 실패 시 기존 TTS를 요청당 한 번만 사용합니다. 개발자 로그는 [audio:mp3] / [audio:tts]로 구분하며 사용자에게는 짧은 오류만 표시합니다.
- 기존 useSpeech 인터페이스는 useAudio의 호환 별칭입니다. 기존 speech:v1 키의 속도/음성 선택 형식을 유지합니다. 목소리 선택은 보조 TTS에만 적용합니다.

## 생성 방법

외부 TTS 서버에 학습 원문을 보내지 않고 Piper의 미국 영어 모델을 로컬 CPU에서 실행합니다. 유료 API, API 키 또는 추가 결제를 사용하지 않습니다. 엔진과 모델을 처음 내려받기 위한 네트워크 접근만 필요합니다.

검토한 모델: en_US-ljspeech-high, 단일 미국 영어 여성 음성. 모델 카드에는 데이터셋 public domain이 명시되어 있고, 모델 저장소 메타데이터는 MIT입니다. Piper 엔진은 GPL-3.0-or-later이며 생성 도구로만 쓰고 앱에 엔진/모델을 배포하지 않습니다.

출처:

- https://huggingface.co/rhasspy/piper-voices/raw/main/en/en_US/ljspeech/high/MODEL_CARD
- https://huggingface.co/rhasspy/piper-voices/raw/main/README.md
- https://keithito.com/LJ-Speech-Dataset/
- https://pypi.org/project/piper-tts/ (검토 당시 1.8.0)

실제 모델 카드와 다운로드 파일 해시를 기록한 다음 생성했습니다. 각 파일은 정확한 영어 원문을 입력으로 사용하며 한글 해석을 포함하지 않습니다. 전체 이야기를 한 WAV로 합성한 뒤 하나의 MP3로 변환했습니다. 모델 SHA-256: `5d4f08ba6a2a48c44592eed3ce56bf85e9de3dd4e20df90541ae68a8310c029a`.

```sh
python3 scripts/audio/generate.py --plan
python3 scripts/audio/generate.py --model /path/to/en_US-ljspeech-high.onnx --model-card /path/to/MODEL_CARD --voice-id en_US-ljspeech-high
python3 scripts/audio/validate.py
```

생성기는 모델을 자동 다운로드하지 않습니다. 승인 후 별도로 준비한 piper-tts/ffmpeg/ffprobe가 필요합니다. 변환은 22,050Hz mono MP3 64kbps입니다. 실제 생성·디코딩 검사에 전부 성공한 경우에만 src/audio/catalog.generated.json을 갱신합니다.

파일명은 단어/세트 ID와 원문·모델·인코딩 해시를 조합합니다. 캐시가 다른 영어 원문이나 목소리의 오디오를 재사용하지 않도록 합니다. 각 파일의 sha256, textSha256, 바이트 수, 길이를 기록합니다. 모델 카드도 public/audio에 보존합니다.

## 서버 및 배포

public/audio/words와 public/audio/stories의 MP3를 Vite가 dist/audio로 복사합니다. Cloudflare용 _headers에 콘텐츠 해시 파일 캐시를 설정합니다. 404.html로 누락된 MP3가 SPA index.html의 HTTP 200으로 대체되지 않도록 합니다. .mp3의 Content-Type은 호스트의 audio/mpeg MIME 매핑을 사용합니다.

배포 전 실제 240개 파일/경로/체크섬/전체 디코딩/원문 일치 검사를 통과해야 합니다. 배포 후 HTTP 200, audio/mpeg, Content-Length, 범위 요청, 대소문자와 누락 경로 404를 확인해야 합니다. 카카오톡 사용자 에이전트의 브라우저 에뮬레이션과 실제 Android/iPhone 카카오톡 내장 브라우저는 구분하여 보고합니다.

## 지금 확인한 것과 아직 확인하지 않은 것

- 오디오 서비스 자동 검사 6개: 사용자 클릭 동기 play 호출, 속도/일시정지/재시작/중지, 중복 요청 경합, 한 번의 TTS 대체, MP3/TTS 오류 구분, 로딩 시간 제한 통과.
- 실제 파일 240개를 생성했습니다. 생성기는 각 파일을 ffprobe/ffmpeg로 끝까지 디코딩하고 원문 길이에 따른 최소 재생 시간을 검사한 뒤에만 catalog를 작성합니다.
- `npm run build`는 Node만 사용하는 파일 누락·원문·경로·체크섬 검사를 먼저 실행합니다. Cloudflare 빌드 시 Python/Piper/모델 다운로드가 필요하지 않습니다.
- `python3 scripts/audio/validate.py`, `npm test`, `npm run test:render`, `npm run build` 통과. 기존 데이터·상태·퍼즐·디자인·마스코트 주요 32개 파일의 SHA-256이 변경 전과 같습니다.
- 단어 provide, DAY 01 세트 01, DAY 05 세트 08의 MP3를 PCM으로 디코딩해 무음이 아닌 신호(RMS 16-bit 약 3832~4451)를 확인했습니다. 이는 실제 기기 스피커 출력 확인을 대신하지 않습니다.
- 원문과 합성 입력의 일치는 검사했지만, 사람이 240개를 모두 청취하거나 재전사해 확인한 것은 아닙니다.
- `scripts/audio-browser-check.mjs`는 실제 HTMLAudioElement 재생 시간·PCM 신호·종료·교체·속도·오류·HTTP 경로를 확인하도록 준비했습니다. 이번 환경의 브라우저 실행 요청이 취소되어 실행 결과는 없습니다.
- 카카오톡·Chrome·Safari 실기기 소리 출력, 폴드 실기기, 이번 MP3의 Cloudflare 공개 파일 접근은 미검증입니다. 이전 Web Speech 기반 브라우저 검사 결과를 MP3 검증으로 사용하지 않습니다.

기존 Cloudflare Pages 연결 정보가 환경에 없으므로 실제 배포에는 별도 보안 연결 또는 기존 프로젝트의 직접 업로드가 필요합니다. 새 Pages 프로젝트를 만들지 않습니다.
