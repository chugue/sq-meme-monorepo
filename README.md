# Squid Meme

> Bringing utility to meme coins through gamification on MemeCore

A Web3 gaming platform that transforms idle meme tokens into engaging social competitions, seamlessly integrated into the MemeX ecosystem via Chrome Extension.

**[한국어](#한국어) | [English](#english)**

---

# English

## Table of Contents

- [Project Overview](#project-overview)
- [How It Works](#how-it-works)
- [Tokenomics](#tokenomics)
- [Why a Chrome Extension?](#why-a-chrome-extension)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Documentation](#documentation)

---

## Project Overview

### The Problem

Meme coins face a fundamental challenge: **lack of utility**. After the initial hype fades, tokens sit idle in wallets with no purpose beyond speculation. This leads to:

- Declining community engagement
- Reduced trading volume
- Loss of holder interest
- Token value deterioration

### The Solution

**Squid Meme** creates instant utility for any meme token through a simple but addictive game mechanic: **The Last Comment Wins**.

Every meme token can now have its own competitive social game, driving engagement and creating real token utility.

---

## How It Works

### 1. The Game: Last Commenter Wins

![How Last Commenter Wins](./docs/how-last-commentor-wins.png)

**Simple Rules:**
1. **Game Starts** - Prize pool is funded with meme tokens
2. **Users Comment** - Each comment costs tokens and resets the timer
3. **Timer Ends** - When no one comments before timer expires, the last commenter wins 100% of the prize pool

### 2. How Funders Get Paid

![How Funders Get Paid](./docs/how-funder-get-paid.png)

**Fee Distribution Example:**
- Prize Pool: 1,000 tokens (Funder A: 60%, Funder B: 40%)
- Commenter pays: 100 tokens
- Platform receives: 2 tokens (2%)
- Funder A receives: 58.8 tokens (60% of 98%)
- Funder B receives: 39.2 tokens (40% of 98%)
- **Last Commenter wins entire Prize Pool when timer ends**

### 3. Sustainable Game Economy

![Game Economy](./docs/game-economy.png)

**The Virtuous Cycle:**
- **Holders** fund prize pools → Bigger prizes attract more players
- **Players** pay to comment → 98% of fees go back to holders
- **Both** drive token utility → More transactions, more value

---

## Tokenomics

### Economic Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Comment Cost | 0.01% of Total Funding | Dynamic pricing based on prize pool |
| Platform Fee | 2% | Sustainable platform revenue |
| Funder Reward | 98% | Distributed proportionally to funders |
| Prize Distribution | 100% to Winner | Last commenter takes entire pool |

### Incentive Alignment

| Participant | Incentive | Action |
|-------------|-----------|--------|
| **Token Holders** | Earn passive income from comment fees | Fund prize pools |
| **Players** | Win large prizes | Compete by commenting |
| **Token Projects** | Increase token engagement & utility | Create games for their token |
| **Platform** | Sustainable 2% revenue | Facilitate games |

### Why This Economy Lasts

1. **Funders win** - Earn yield on their tokens through fee sharing
2. **Players win** - Chance to win big prizes
3. **Tokens win** - Real utility drives value
4. **Everyone has skin in the game** - Aligned incentives

---

## Why a Chrome Extension?

### Seamless Integration, Maximum Adoption

Instead of building yet another standalone dApp that users need to discover and visit, Squid Meme **injects directly into MemeX** — the platform where meme token communities already exist.

| Approach | User Journey | Friction |
|----------|-------------|----------|
| Standalone dApp | Discover → Visit → Connect Wallet → Find Token → Play | High |
| **Chrome Extension** | Visit MemeX Profile → Game is Already There → Play | **Minimal** |

### Benefits

| Benefit | Description |
|---------|-------------|
| **Zero Navigation** | Game appears naturally on token profile pages |
| **Existing Users** | Leverages MemeX's established community |
| **Contextual** | Game tied directly to token's profile |
| **Viral** | Natural discovery through normal browsing |
| **Trusted** | Users stay on familiar MemeX domain |

---

## Features

### Core Gaming

| Feature | Description |
|---------|-------------|
| **Create Game** | Launch a game on any MemeCore token with custom duration and funding |
| **Comment Competition** | Pay tokens to comment; each comment resets the timer |
| **Prize Claiming** | Winner (last commenter) claims the entire prize pool |
| **Fund Prize Pool** | Anyone can add to the prize pool and earn fee shares |

### Social Features

| Feature | Description |
|---------|-------------|
| **On-Chain Comments** | All comments recorded on blockchain |
| **Like System** | Engage with comments through likes |
| **User Profiles** | Track stats, wins, and game history |
| **Leaderboards** | Rankings by prizes won, comments, and activity |

### Quest & Rewards

| Feature | Description |
|---------|-------------|
| **Daily Check-in** | Maintain streaks for rewards (5-day, 20-day milestones) |
| **Comment Goals** | Earn rewards for activity milestones (20, 50 comments) |
| **Achievement System** | Track accomplishments across the platform |

### Dashboard (Side Panel)

| Feature | Description |
|---------|-------------|
| **Live Games** | Browse all active games across tokens |
| **My Assets** | View token holdings and values |
| **Profile** | Personal stats and game history |
| **Quest Tracker** | Monitor quest progress |

---

## Architecture

### System Overview

![System Overview](./docs/architecture-overview.png)

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, WXT, Wagmi, Viem, Jotai |
| **Backend** | NestJS, TypeScript, Drizzle ORM, PostgreSQL |
| **Contracts** | Solidity 0.8.28, Hardhat 3, OpenZeppelin |
| **Blockchain** | MemeCore (Formicarium Testnet) |
| **Infrastructure** | Railway, Supabase |

### Repository Structure

```
squid-meme/
├── frontend/     # Chrome Extension (React + WXT)
├── backend/      # API Server (NestJS)
├── contracts/    # Smart Contracts (Solidity)
├── docs/         # Documentation & Images
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL
- Chrome Browser

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/squid-meme.git
cd squid-meme

# Install all dependencies
npm install

# Start backend
cd backend && npm run start:dev

# Start frontend extension (new terminal)
cd frontend && npm run dev

# Load in Chrome
# chrome://extensions/ → Developer mode → Load unpacked → frontend/.output/chrome-mv3
```

### Environment Setup

See individual READMEs:
- [Backend Setup](./backend/README.md)
- [Frontend Setup](./frontend/README.md)
- [Contracts Setup](./contracts/README.md)

---

## Documentation

| Document | Description |
|----------|-------------|
| [Backend README](./backend/README.md) | API, database schema, deployment |
| [Frontend README](./frontend/README.md) | Extension architecture, Web3 integration |
| [Contracts README](./contracts/README.md) | Smart contract mechanics, security |

### Network Information

| Property | Value |
|----------|-------|
| Network | Formicarium Testnet (MemeCore) |
| Chain ID | 43521 |
| RPC | https://rpc.formicarium.memecore.net |
| Explorer | https://formicarium.memecorescan.io |

---

# 한국어

## 목차

- [프로젝트 개요](#프로젝트-개요)
- [작동 방식](#작동-방식)
- [토크노믹스](#토크노믹스)
- [왜 크롬 익스텐션인가?](#왜-크롬-익스텐션인가)
- [주요 기능](#주요-기능)
- [아키텍처](#아키텍처)
- [시작하기](#시작하기)
- [문서](#문서)

---

## 프로젝트 개요

### 문제점

밈코인은 근본적인 문제에 직면해 있습니다: **유틸리티의 부재**. 초기 열풍이 지나가면 토큰은 투기 외에는 아무런 목적 없이 지갑에 방치됩니다. 이로 인해:

- 커뮤니티 참여 감소
- 거래량 감소
- 홀더 이탈
- 토큰 가치 하락

### 솔루션

**Squid Meme**은 간단하지만 중독성 있는 게임 메커니즘을 통해 모든 밈 토큰에 즉각적인 유틸리티를 제공합니다: **마지막 댓글 작성자가 승리**.

모든 밈 토큰이 자체적인 경쟁 소셜 게임을 가질 수 있으며, 이를 통해 참여를 유도하고 실질적인 토큰 유틸리티를 창출합니다.

---

## 작동 방식

### 1. 게임: 마지막 댓글 작성자가 승리

![마지막 댓글 작성자가 승리하는 방법](./docs/how-last-commentor-wins.png)

**간단한 규칙:**
1. **게임 시작** - 밈 토큰으로 상금 풀이 구성됩니다
2. **댓글 작성** - 각 댓글은 토큰 비용이 들고 타이머가 리셋됩니다
3. **타이머 종료** - 타이머가 만료되기 전에 아무도 댓글을 달지 않으면, 마지막 댓글 작성자가 상금 풀 전체를 가져갑니다

### 2. 펀더가 수익을 얻는 방법

![펀더가 수익을 얻는 방법](./docs/how-funder-get-paid.png)

**수수료 분배 예시:**
- 상금 풀: 1,000 토큰 (펀더 A: 60%, 펀더 B: 40%)
- 댓글 작성자 지불: 100 토큰
- 플랫폼 수령: 2 토큰 (2%)
- 펀더 A 수령: 58.8 토큰 (98%의 60%)
- 펀더 B 수령: 39.2 토큰 (98%의 40%)
- **타이머 종료 시 마지막 댓글 작성자가 상금 풀 전체 획득**

### 3. 지속 가능한 게임 경제

![게임 경제](./docs/game-economy.png)

**선순환 구조:**
- **홀더**가 상금 풀에 펀딩 → 더 큰 상금이 더 많은 플레이어를 유치
- **플레이어**가 댓글에 토큰 지불 → 수수료의 98%가 홀더에게 돌아감
- **양쪽 모두** 토큰 유틸리티 증가 → 더 많은 거래, 더 많은 가치

---

## 토크노믹스

### 경제 파라미터

| 파라미터 | 값 | 설명 |
|---------|-----|------|
| 댓글 비용 | 총 펀딩의 0.01% | 상금 풀 기반 동적 가격 책정 |
| 플랫폼 수수료 | 2% | 지속 가능한 플랫폼 수익 |
| 펀더 보상 | 98% | 펀더에게 비율대로 분배 |
| 상금 분배 | 승자에게 100% | 마지막 댓글 작성자가 전체 풀 획득 |

### 인센티브 정렬

| 참여자 | 인센티브 | 행동 |
|-------|---------|------|
| **토큰 홀더** | 댓글 수수료로 패시브 인컴 | 상금 풀에 펀딩 |
| **플레이어** | 큰 상금 획득 기회 | 댓글로 경쟁 |
| **토큰 프로젝트** | 토큰 참여도 및 유틸리티 증가 | 토큰용 게임 생성 |
| **플랫폼** | 지속 가능한 2% 수익 | 게임 운영 |

### 이 경제가 지속되는 이유

1. **펀더가 이긴다** - 수수료 공유로 토큰에서 수익 창출
2. **플레이어가 이긴다** - 큰 상금을 획득할 기회
3. **토큰이 이긴다** - 실질적 유틸리티가 가치를 이끔
4. **모두가 이해관계를 가짐** - 정렬된 인센티브

---

## 왜 크롬 익스텐션인가?

### 원활한 통합, 최대 채택률

사용자가 발견하고 방문해야 하는 또 다른 독립형 dApp을 구축하는 대신, Squid Meme은 **MemeX에 직접 주입됩니다** — 밈 토큰 커뮤니티가 이미 존재하는 플랫폼.

| 접근 방식 | 사용자 여정 | 마찰 |
|----------|-----------|------|
| 독립형 dApp | 발견 → 방문 → 지갑 연결 → 토큰 찾기 → 플레이 | 높음 |
| **크롬 익스텐션** | MemeX 프로필 방문 → 게임이 이미 존재 → 플레이 | **최소** |

### 장점

| 장점 | 설명 |
|-----|------|
| **이동 불필요** | 토큰 프로필 페이지에 자연스럽게 게임 표시 |
| **기존 사용자** | MemeX의 기존 커뮤니티 활용 |
| **맥락적** | 토큰 프로필에 직접 연결된 게임 |
| **바이럴** | 일반 브라우징 중 자연스러운 발견 |
| **신뢰** | 익숙한 MemeX 도메인에 머무름 |

---

## 주요 기능

### 핵심 게이밍

| 기능 | 설명 |
|-----|------|
| **게임 생성** | 모든 MemeCore 토큰에 맞춤 기간과 펀딩으로 게임 시작 |
| **댓글 경쟁** | 토큰을 지불하고 댓글 작성; 각 댓글이 타이머 리셋 |
| **상금 수령** | 승자(마지막 댓글 작성자)가 전체 상금 풀 수령 |
| **상금 풀 펀딩** | 누구나 상금 풀에 추가하고 수수료 수익 획득 가능 |

### 소셜 기능

| 기능 | 설명 |
|-----|------|
| **온체인 댓글** | 모든 댓글이 블록체인에 기록 |
| **좋아요 시스템** | 좋아요로 댓글에 참여 |
| **사용자 프로필** | 통계, 승리, 게임 기록 추적 |
| **리더보드** | 획득 상금, 댓글, 활동 기준 순위 |

### 퀘스트 & 보상

| 기능 | 설명 |
|-----|------|
| **일일 출석** | 보상을 위한 연속 출석 유지 (5일, 20일 마일스톤) |
| **댓글 목표** | 활동 마일스톤 달성 시 보상 (20, 50 댓글) |
| **업적 시스템** | 플랫폼 전체의 성과 추적 |

### 대시보드 (사이드 패널)

| 기능 | 설명 |
|-----|------|
| **라이브 게임** | 모든 토큰의 진행 중인 게임 탐색 |
| **내 자산** | 토큰 보유량 및 가치 확인 |
| **프로필** | 개인 통계 및 게임 기록 |
| **퀘스트 트래커** | 퀘스트 진행 상황 모니터링 |

---

## 아키텍처

### 시스템 개요

![시스템 개요](./docs/architecture-overview.png)

### 기술 스택

| 레이어 | 기술 |
|-------|-----|
| **프론트엔드** | React 19, TypeScript, WXT, Wagmi, Viem, Jotai |
| **백엔드** | NestJS, TypeScript, Drizzle ORM, PostgreSQL |
| **컨트랙트** | Solidity 0.8.28, Hardhat 3, OpenZeppelin |
| **블록체인** | MemeCore (Formicarium Testnet) |
| **인프라** | Railway, Supabase |

### 레포지토리 구조

```
squid-meme/
├── frontend/     # 크롬 익스텐션 (React + WXT)
├── backend/      # API 서버 (NestJS)
├── contracts/    # 스마트 컨트랙트 (Solidity)
├── docs/         # 문서 & 이미지
└── README.md
```

---

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm
- PostgreSQL
- Chrome 브라우저

### 빠른 시작

```bash
# 레포지토리 클론
git clone https://github.com/your-org/squid-meme.git
cd squid-meme

# 모든 의존성 설치
npm install

# 백엔드 시작
cd backend && npm run start:dev

# 프론트엔드 익스텐션 시작 (새 터미널)
cd frontend && npm run dev

# Chrome에서 로드
# chrome://extensions/ → 개발자 모드 → 압축해제된 확장 프로그램 로드 → frontend/.output/chrome-mv3
```

### 환경 설정

각 README 참조:
- [백엔드 설정](./backend/README.md)
- [프론트엔드 설정](./frontend/README.md)
- [컨트랙트 설정](./contracts/README.md)

---

## 문서

| 문서 | 설명 |
|-----|------|
| [백엔드 README](./backend/README.md) | API, 데이터베이스 스키마, 배포 |
| [프론트엔드 README](./frontend/README.md) | 익스텐션 아키텍처, Web3 통합 |
| [컨트랙트 README](./contracts/README.md) | 스마트 컨트랙트 메커니즘, 보안 |

### 네트워크 정보

| 속성 | 값 |
|-----|-----|
| 네트워크 | Formicarium Testnet (MemeCore) |
| 체인 ID | 43521 |
| RPC | https://rpc.formicarium.memecore.net |
| 익스플로러 | https://formicarium.memecorescan.io |

---

<div align="center">

**Squid Meme** - *밈코인을 다시 재미있게*

</div>
