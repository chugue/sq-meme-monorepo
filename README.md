# Squid Meme Monorepo

Web3 기반 밈 게임 플랫폼

## 프로젝트 구조

```
squid-meme/
├── backend/      # NestJS API 서버 (Drizzle ORM, PostgreSQL)
├── contracts/    # Solidity 스마트 컨트랙트 (Hardhat 3)
└── frontend/     # 프론트엔드 (준비 중)
```

## 요구 사항

- Node.js 20+
- npm
- PostgreSQL (백엔드용)

## 설치

```bash
# 루트에서 모든 workspace 의존성 설치
npm install
```

## 환경 변수 설정

### Backend (.env.local)

```bash
# backend/.env.local
DATABASE_URL=postgres://user:password@localhost:5432/squid_meme
ETHEREUM_WS_URL=wss://ws.insectarium.memecore.net
GAME_FACTORY_ADDRESS=0x...
```

### Contracts (.env)

```bash
# contracts/.env
INSECTARIUM_PRIVATE_KEY=your_private_key
```

## 실행

### Backend

```bash
# 개발 모드 (watch mode)
cd backend
npm run start:dev

# 또는 루트에서
npm run start:dev --workspace=backend
```

백엔드 서버: http://localhost:3000

### Contracts

```bash
cd contracts

# 컴파일
npm run compile

# 테스트
npm test

# 로컬 배포
npx hardhat ignition deploy ignition/modules/GameFactory.ts

# Sepolia 배포
npx hardhat ignition deploy --network sepolia ignition/modules/GameFactory.ts
```

### Drizzle Studio (DB 관리 UI)

```bash
cd backend
npx drizzle-kit studio
```

Drizzle Studio: http://localhost:4983

## 테스트

```bash
# 모든 워크스페이스 테스트
npm test

# 백엔드 테스트만
npm run test:backend

# 컨트랙트 테스트만
npm run test:contracts
```

## 배포

### Backend (Railway)

Railway에 연결하면 `main` 브랜치 push 시 자동 배포됩니다.

- Root Directory: `/backend`
- Builder: nixpacks
- Start Command: `node dist/main`

환경 변수 설정 필요:
- `DATABASE_URL`
- `ETHEREUM_WS_URL`
- `GAME_FACTORY_ADDRESS`

## API 문서

백엔드 실행 후 Swagger UI 확인:
http://localhost:3000/api



##