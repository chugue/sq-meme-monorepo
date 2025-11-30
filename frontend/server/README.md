# Squid Meme Backend Server

Squid Meme Chrome Extension을 위한 Express 백엔드 서버입니다.

## 설치

```bash
cd server
yarn install
```

## 환경 변수 설정

`.env.example` 파일을 참고하여 `.env` 파일을 생성하고 필요한 환경 변수를 설정하세요.

```bash
cp .env.example .env
```

## 개발 서버 실행

```bash
yarn dev
```

서버는 기본적으로 `http://localhost:3001`에서 실행됩니다.

## 빌드

```bash
yarn build
```

## 프로덕션 실행

```bash
yarn start
```

## API 엔드포인트

### Health Check
- `GET /health` - 서버 상태 확인

### 댓글 API
- `GET /api/comments/:challengeId` - 댓글 목록 조회
- `POST /api/comments` - 댓글 작성
- `DELETE /api/comments/:commentId` - 댓글 삭제

### 방(Challenge) API
- `GET /api/challenges?username=xxx&username_tag=xxx` - 방 존재 여부 확인
- `POST /api/challenges` - 새 방 생성

## 기술 스택

- Express.js
- TypeScript
- Supabase (데이터베이스)
- CORS

