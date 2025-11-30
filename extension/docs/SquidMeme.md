# 🦑 Squid Meme: The Liquidity Catalyst Protocol

MemeX 생태계를 위한 하이퍼-게이미피케이션 유동성 공급 솔루션

Technical Whitepaper & Product Specification v1.9 (Squid Meme Edition)

## 1. 핵심 요약 (Executive Summary)

Squid Meme은 MemeX 플랫폼의 본딩 커브시스템에 최적화된 탈중앙화 유동성 부스팅 프로토콜입니다. 기존의 정체된 밈 토큰 시장에 경쟁 심리(FOMO)를 극대화한 게임 메커니즘을 주입하여 단기간에 폭발적인 온체인 거래량(Volume)과 매수 압력(Buy Pressure)을 유발합니다. 이로써 토큰들이 MemeMax(CEX) 상장 요건을 달성하도록 돕고, 생태계 전반에 지속 가능한 유동성 엔진 역할을 수행합니다.

- **Identity:** MemeX 전용 **3rd-party 유틸리티 툴** (Chrome Extension 기반)
- **Concept:** **"Trading is a High-Stakes Game."** (트레이딩은 고위험 게임이다)
- **Core Value:** **Bonding Curve Graduation & Token Value Appreciation** (본딩 커브 졸업 및 토큰 가치 상승)
- **Business Model:** 플랫폼 수수료 (Protocol Fee) & 자체 토큰 이코노미

---

## 2. 제품 비전 및 솔루션 (Vision & Solution)

### 2.1 시장 문제 (Market Problem)
- **유동성 정체:** MemeX 발행 토큰 중 대다수(95% 이상)가 본딩 커브 100%를 달성하지 못하고 소멸됩니다.
- **수요 미전환:** 채팅/커뮤니티 활동이 실질적인 **온체인 매수 압력(Buy Pressure)**으로 직결되지 않습니다.
- **UX 파편화:** 외부 툴 이용 시 플랫폼 이탈로 인한 높은 사용자 이탈률(Churn Rate)이 발생합니다.

### 2.2 우리의 솔루션 (Our Solution)
- **Injectable UX:** 별도 이동 없이 MemeX 소셜 피드 위에 **직접 오버레이(Overlay)**되는 **'게임 인터페이스'**를 제공하여 UX 파편화를 해결합니다.
    - **✨ UI/애니메이션/에셋:** **MemeCore의 밈스러운(Meme-Core-Style)** 감성을 극대화한 UI, 몰입도 높은 애니메이션, 독창적인 에셋을 최우선으로 개발합니다.
- **Volume Generation (Pure Demand):** 거대한 상금을 차지하기 위해 유저들이 **자발적으로 토큰을 매수하여 게임에 참여**하도록 유도, 본딩 커브 상승을 자연스럽게 촉진합니다.
- **Anti-Bot Engineering:** 단순 타이머가 아닌 **가변형 시간 감쇠(Time Decay)** 알고리즘을 적용하여 봇의 스나이핑을 무력화하고 유저 간의 **심리전**을 유도합니다.

---

## 3. 핵심 게임 메커니즘 (Core Game Mechanics)

### 3.1 토큰 챌린지 (The Challenge)
- **생성:** 누구나 MemeX 토큰 주소(CA)를 등록하여 Challenge(토큰 챌린지)를 개설할 수 있습니다.
- **참여 (Strike):** 참여자는 '도전자(Player)'가 되어 해당 토큰을 지불하고 상대를 '타격(Strike)'합니다. 타격 성공 시 **Last Player(현재의 지배자)**가 갱신됩니다.
- **Dynamic Fee:** 챌린지의 열기가 고조될수록(후반부) 타격 비용이 증가하여 **Pot(총 상금)**의 규모를 기하급수적으로 키웁니다.

### 3.2 Smart Timer (시간 감쇠 알고리즘)
게임의 긴장감을 극대화하기 위해 참여 빈도에 따른 **로그 함수형 감쇠 로직**을 적용합니다.

$$T_{\text{add}} = \frac{T_{\text{base}}}{1 + \alpha \cdot \log(N_{\text{strikes}})}$$

- $T_{\text{add}}$: 추가되는 시간
- $T_{\text{base}}$: 기본 연장 시간 (예: 10분)
- $\alpha$: 감쇠 계수 (Decay Factor)
- $N_{\text{strikes}}$: 누적 타격 횟수

**효과:** 게임 초반에는 시간이 넉넉히 늘어나지만, 후반에는 타격 한 번에 1초, 0.5초씩만 늘어나 **'피 말리는 눈치 싸움'**을 유도합니다.

### 3.3 수익 및 분배 모델 (Revenue & Distribution)
- **Winner Pot (80%):** 최후의 생존자(The Chad) 독식 (**Extreme Incentive**)
- **Best Comment Pot (5%):** 관중 투표(Tip)를 가장 많이 받은 도전자 보상 (**Social Incentive**)
- **Next Round Seed (5%):** 다음 라운드 초기 상금으로 이월 (**Rollover**)
- **Protocol Revenue (10%):** 개발팀 운영비 및 감사 비용

### 3.4 게임 라이프사이클 (자동 순환 구조)
- **Round ID:** 각 토큰(Challenge)은 고유한 `roundId`를 가집니다.
- **Auto-Restart:** 전 라운드 우승자가 Claim()을 실행하는 순간, 스마트 컨트랙트는 상금 지급과 동시에 다음 라운드를 **자동으로 초기화(Initialize)**합니다.
- **Seed Funding (Rollover):** 전 라운드 상금의 **5%**가 초기 Pot으로 자동 예치되어, **'Cold Start'** 문제를 해결하고 게임의 **연속성(Continuity)**과 **관성(Momentum)**을 유지합니다.
    

---

## 4. 기술 아키텍처 (Technical Architecture)

### 4.1 핵심 상호작용 흐름 (Core Interaction Flow)

- **Injectable Extension:** MemeX 웹 화면에 UI를 주입하는 **Chrome Extension**이 핵심 클라이언트입니다.
- **자동 서명:** 초단타 경쟁을 위해 Strike 트랜잭션은 **팝업 없이 자동 서명**을 통해 블록체인에 전송됩니다.
- **실시간 동기화:** The Graph 인덱싱 지연을 대비하여, 타이머 및 Pot 정보는 **`viem/wagmi`의 `watchContractEvent`**를 사용하여 RPC 노드로부터 직접 실시간으로 수신합니다.
    
### 4.2 Tech Stack Overview

|**Layer**|**Technology**|**Detail**|
|---|---|---|
|**Blockchain**|MemeCore (EVM)|Solidity v0.8.20+, Hardhat|
|**Contract**|OpenZeppelin|Upgradeable Contracts (**UUPS Proxy**)|
|**Indexing**|The Graph|Decentralized Network (Subgraphs)|
|**Extension (Client)**|WXT + Vite|**React, TypeScript, Tailwind CSS**, Viem|
|**Dashboard (Web)**|Next.js 14|App Router, TanStack Query, Recharts|
|**Real-time Sync**|**viem/wagmi**|`watchContractEvent` (RPC Direct) & Fallback Polling|

### 4.3 스마트 컨트랙트 디자인 (Security First)
- **Proxy Pattern (UUPS):** 버그 발생 시 데이터 손실 없이 로직만 수정 가능한 **업그레이드 가능 구조** 채택.
- **Reentrancy Guard:** 모든 출금 함수에 재진입 공격 방지 적용.
- **Pausable:** 긴급 상황 발생 시 프로토콜을 일시 정지할 수 있는 Admin 권한 (향후 DAO 이관).

### 4.4 UX 최적화: 도전자 지갑 (Gladiator Wallet)
초저지연 게임 환경을 위해 자동 서명 기능을 갖춘 내부 지갑 시스템을 도입합니다.
- **A. Dual-Asset Requirement:** 트랜잭션에 필요한 두 가지 자산($M$: Gas Fee, Game Token)을 관리합니다.
- **B. Wallet Management Options:**
    - **Option 1: Create & Deposit (권장/기본):** 확장 프로그램 내부에 새로운 **'로컬 지갑'**을 생성하고 메인 지갑에서 소액을 입금합니다. **보안성**이 가장 높습니다.
    - **Option 2: Import Private Key (우선순위 최하):** 소액 전용 서브 지갑의 프라이빗 키를 입력하여 사용합니다. **강력한 경고 문구**와 사용자 동의를 요구합니다. **(현재 MVP에서는 우선순위 최하)**
- **C. Asset Dashboard:** **$M 잔액, 게임 토큰 잔액** 실시간 표시, **Arming (Deposit)**, **Withdraw Loot** (상금 및 잔액 메인 지갑 반환) 기능을 제공합니다.

### 4.5 백엔드 통합 (Backend for Social/UX - **우선순위 하**)
실시간 온체인 로직은 스마트 컨트랙트에서 처리하지만, UX 향상을 위해 별도 백엔드를 활용합니다.
- **댓글/메시지:** 도전자(Player)의 인게임 메시지 및 커뮤니티 댓글 처리.
- **이미지 처리:** 밈 코어 스타일의 **인게임 에셋(이미지)** 로딩 및 관리.
- **좋아요/Tip-to-Vote:** 관중(Spectator)의 **Tip-to-Vote** 현황 및 소셜 피드 내 좋아요(추후 도입) 처리.
- **Post 제어:** MemeX 피드 내 특정 Post 제어 기능 (**우선순위 최하**)

---

## 5. 결론
Squid Meme은 단순한 유틸리티 툴이 아닌, MemeX 생태계의 '유동성 촉매제(Liquidity Catalyst)'입니다. 우리는 사용자들이 가장 많이 머무르는 공간에 **가장 밈(Meme)스럽고 재미있는 경쟁 요소**를 주입하여 트랜잭션을 폭발적으로 생성합니다. 이는 MemeX 플랫폼의 가치 상승과 토큰 홀더들의 수익 증대로 이어지는 **Positive-Sum Ecosystem**을 완성할 것입니다.
