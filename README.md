웹토이 프로젝트 보일러플레이트. AI로 무엇이든 만들기 프로젝트에 앞서 프로덕트를 빠르게 생산할 수 있도록 세팅되었습니다.

## 스택

- **Next.js 16** (App Router, TypeScript, `src/` 디렉토리)
- **Tailwind CSS v4**
- **shadcn/ui 스타일 컴포넌트** (`src/components/ui/`)
- **Supabase** (`src/lib/supabase/`) — client / server / middleware
- **Vercel Analytics**
- **ESLint + Prettier** — import order 검사, 세미콜론, 큰따옴표, trailing comma, Tailwind 클래스 정렬

## 포함된 구성

- `src/lib/supabase/*` — 인증/DB 연결 보일러플레이트
- `src/components/ui/*` — button, card, dialog, progress
- `src/lib/utils.ts` — `cn()` 유틸
- `.env.example`, `.prettierrc.json`, `components.json`
- `src/app/layout.tsx`의 기본 메타데이터 구조

## 시작하기

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 스크립트

| 명령어                 | 설명               |
| ---------------------- | ------------------ |
| `npm run dev`          | 개발 서버          |
| `npm run build`        | 프로덕션 빌드      |
| `npm run lint`         | ESLint 검사        |
| `npm run lint:fix`     | ESLint 자동 수정   |
| `npm run format`       | Prettier 전체 포맷 |
| `npm run format:check` | 포맷 확인만 (CI용) |

## clone 후 진행할 것

- [ ] 실제 Supabase 프로젝트 생성 및 `.env.local` 값 채우기
- [ ] Vercel 프로젝트 연결 및 배포
