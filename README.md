# AFO Client

AFO(여러 에이전트로 구성된 스쿼드가 질문을 추론하는 과정을 시각화하는 도구)의 프론트엔드입니다.
React + TypeScript + Vite로 만들어졌고, 스쿼드의 세션 하나를 열면 태스크들이 의존관계에 따라
웨이브 단위로 순차 실행되는 모습을 그래프로 재생합니다.

백엔드는 별도 저장소 [`bean-noodles/afo-api`](https://github.com/bean-noodles/afo-api)(FastAPI + Supabase)입니다.

## 1. 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:5173/afo-client/`에서 확인할 수 있습니다.

## 2. 두 가지 실행 모드

로그인 화면은 `VITE_API_BASE_URL` 설정 여부와 무관하게 항상 뜨고, 이메일 매직링크/Google 로그인
둘 다 실제 `afo-api` 서버를 호출합니다(주소를 안 정하면 `http://localhost:8000`로 시도) — 즉
**로그인 자체에는 항상 백엔드가 필요**합니다. `VITE_API_BASE_URL`은 로그인 이후에 어떤 데이터를
보여줄지만 바꿉니다.

- **설정 안 함 (데모 모드)** — 로그인 성공 후 실제 API를 타지 않고 `src/data/tasks.ts`의 샘플
  스쿼드 하나만 보여줍니다. UI/애니메이션만 확인하고 싶을 때 씁니다.
- **설정함 (API 모드)** — 로그인 후 실제 스쿼드 업로드·조회가 `afo-api` 서버를 통해 이루어집니다.

> GitHub Pages 배포 워크플로는 백엔드 URL을 주입하지 않으므로, 배포판도 로그인 자체는 그대로
> 필요합니다 — 방문자가 접근 가능한 `afo-api` 서버가 있어야 로그인할 수 있습니다.

```bash
cp .env.example .env
```

| 변수 | 설명 |
| --- | --- |
| `VITE_API_BASE_URL` | `afo-api` 서버 주소 (예: `http://localhost:8000`). 비워두면 데모 모드. |
| `VITE_GOOGLE_CLIENT_ID` | Google Cloud Console에서 발급한 OAuth 클라이언트 ID. 비워두면 "Sign in with Google" 버튼이 비활성화되고 이메일 로그인만 남습니다. |

로컬에서 `afo-api`도 같이 띄우려면 그 저장소의 README를 따라 `uvicorn app.main:app --reload`로 실행한 뒤
`VITE_API_BASE_URL=http://localhost:8000`을 넣으면 됩니다.

## 3. 주요 화면/기능

- **로그인** (`src/components/Login.tsx`) — 이메일 매직링크, Google Sign-In(GSI).
- **사이드바 Projects** — 내 스쿼드 목록과 각 스쿼드의 세션(대화) 목록. 스쿼드를 펼치면 세션 목록을
  불러오는 동안 스켈레톤이 표시됩니다. `.zip`으로 새 스쿼드를 업로드할 수 있습니다
  (표준 스쿼드 export 형식: `.squad.json` / `logs/` / `tasks/` / `artifacts/`).
- **TaskGraph** (`src/components/TaskGraph.tsx`) — 세션을 선택하면 태스크들이 실제 실행 순서
  그대로(웨이브 단위) 재생됩니다: 이전 웨이브가 접히고 → 연결선이 그려지고 → 다음 웨이브 노드가
  나타나고 → 설명/출력이 타자 치듯 나오면서 진행률이 함께 올라갑니다. 노드는 클릭해서 수동으로
  접고 펼 수 있습니다.
- **System Log** (`src/components/AgentsTaskforcePanel.tsx`) — 세션 타임라인을 24시간제로 표시하고,
  웨이브 시작/완료 로그만 강조 색으로 구분합니다.
- **데이터 조회** — `@tanstack/react-query`로 스쿼드 목록/상세, 세션 상세를 가져오고 캐싱합니다.

## 4. 스크립트

```bash
npm run dev       # 개발 서버
npm run build     # 타입체크 + 프로덕션 빌드 (dist/)
npm run preview   # 빌드 결과 로컬 미리보기
npm run lint      # oxlint
```

## 5. 배포

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 GitHub Pages로 자동 배포합니다.
빌드 시 백엔드 환경변수를 주입하지 않으므로 로그인 이후엔 항상 데모 모드로 동작하지만,
로그인 화면 자체는 그대로 뜨고 `http://localhost:8000`을 호출하려 시도합니다 (위 2절 참고).
