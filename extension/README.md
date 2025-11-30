# 🦑 Squid Meme

MemeX 플랫폼을 위한 Chrome Extension - 댓글 기능 데모

## 🚀 빠른 시작

### 1. 패키지 설치

```bash
yarn install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 API 서버 URL을 입력하세요:

```env
VITE_API_URL=http://localhost:3001
```

### 3. 서버 설정

#### 3.1 서버 패키지 설치

```bash
cd server
yarn install
```

#### 3.2 서버 환경 변수 설정

`server` 폴더에 `.env` 파일을 생성하고 Supabase 정보를 입력하세요:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
PORT=3001
```

Supabase 프로젝트 URL과 Anon Key는 [Supabase Dashboard](https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api)에서 확인할 수 있습니다.

#### 3.3 Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트를 생성하세요.
2. Supabase Dashboard > SQL Editor에서 `docs/supabase-schema.sql` 파일의 내용을 실행하세요.

이렇게 하면 `comments` 테이블이 생성됩니다.

#### 3.4 서버 실행

```bash
cd server
yarn dev
```

서버는 기본적으로 `http://localhost:3001`에서 실행됩니다.

### 4. 개발 서버 실행

확장 프로그램 개발 서버를 실행하세요:

```bash
yarn dev
```

### 5. Chrome Extension 로드

1. Chrome에서 `chrome://extensions/`로 이동
2. "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `.output/chrome-mv3` 폴더 선택

### 6. 테스트

1. **서버가 실행 중인지 확인**
   ```bash
   curl http://localhost:3001/health
   ```

2. [MemeX](https://app.memex.xyz) 웹사이트로 이동

3. 프로필 페이지에서 댓글 기능이 표시되는지 확인

4. 댓글을 작성하고 확인

5. 브라우저 콘솔에서 네트워크 요청 확인

## 📁 프로젝트 구조

```
squid_meme/
├── src/
│   ├── components/        # React 컴포넌트
│   │   ├── CommentApp.tsx      # 메인 앱 컴포넌트
│   │   ├── CommentSection.tsx  # 댓글 UI 컴포넌트
│   │   ├── CommentSection.css  # 댓글 스타일
│   │   └── JotaiProvider.tsx   # Jotai Provider
│   ├── hooks/            # 커스텀 훅
│   │   └── useComments.ts      # 댓글 관련 훅
│   ├── atoms/            # Jotai Atoms
│   │   └── commentAtoms.ts     # 댓글 상태 관리
│   ├── lib/              # 라이브러리 설정
│   │   ├── api.ts              # 서버 API 클라이언트
│   │   └── supabase.ts         # Supabase 클라이언트 (사용하지 않음)
│   └── types/            # TypeScript 타입
│       └── comment.ts          # 댓글 타입 정의
├── entrypoints/
│   └── content.ts        # Content Script (메인 진입점)
├── docs/
│   └── supabase-schema.sql     # 데이터베이스 스키마
└── README.md
```

## 🛠 기술 스택

### 클라이언트
- **WXT**: Chrome Extension 프레임워크
- **React**: UI 라이브러리
- **Jotai**: 전역 상태 관리
- **TanStack Query**: 서버 상태 관리

### 서버
- **Express.js**: 백엔드 서버
- **TypeScript**: 타입 안정성
- **Supabase**: 데이터베이스 (PostgreSQL + REST API)

## 📝 주요 기능

- ✅ 댓글 작성
- ✅ 댓글 목록 조회
- ✅ 실시간 댓글 업데이트 (5초마다 자동 갱신)
- ✅ 지갑 주소 표시 (데모용 랜덤 주소 생성)

## 🎯 다음 단계

- [ ] 지갑 연동 (Wagmi + Viem)
- [ ] 프로필별 댓글 필터링
- [ ] 댓글 좋아요/좋아요 취소
- [ ] 이미지 첨부 기능

## 📄 라이선스

MIT
