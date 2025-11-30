# 🦑 Squid Meme 개발 계획서

**버전:** v1.0  
**작성일:** 2025-01-27  
**기반 문서:** SquidMeme.md v1.9

---

## 목차
1. [개발 환경 설정](#1-개발-환경-설정)
2. [기술 스택 및 아키텍처](#2-기술-스택-및-아키텍처)
3. [전역 상태 관리 (Jotai)](#3-전역-상태-관리-jotai)
4. [핵심 기능 구현 계획](#4-핵심-기능-구현-계획)
5. [UI/UX 구현 계획](#5-uiux-구현-계획)
6. [데이터베이스 설계](#6-데이터베이스-설계)
7. [API 설계](#7-api-설계)
8. [개발 단계별 로드맵](#8-개발-단계별-로드맵)
9. [파일 구조](#9-파일-구조)

---

## 1. 개발 환경 설정

### 1.1 빌드 도구 통합

#### Vite 적용
- **현재 상태:** WXT 프레임워크 사용 중 (내부적으로 Vite 사용 가능)
- **목표:** WXT와 Vite를 완전히 통합하여 최적화된 개발 환경 구성
- **구현 방안:**
  - `wxt.config.ts`에서 Vite 설정 커스터마이징
  - HMR(Hot Module Replacement) 최적화
  - 빌드 성능 향상을 위한 Vite 플러그인 활용

#### 필수 패키지 설치
```json
{
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "@tanstack/react-query": "^5.x",
    "jotai": "^2.x",
    "wagmi": "^2.x",
    "viem": "^2.x",
    "@wagmi/core": "^2.x",
    "@wagmi/connectors": "^2.x",
    "@supabase/supabase-js": "^2.x"
  },
  "devDependencies": {
    "@tanstack/react-query-devtools": "^5.x",
    "jotai-devtools": "^2.x",
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x"
  }
}
```

---

## 2. 기술 스택 및 아키텍처

### 2.1 기술 스택

| **계층** | **기술** | **버전** | **용도** |
|---------|---------|---------|---------|
| **Framework** | WXT + React | Latest | Chrome Extension 개발 |
| **Build Tool** | Vite | Latest | 빌드 및 HMR |
| **State Management** | Jotai | ^2.x | 전역 상태 관리 (클라이언트) |
| **Server State** | TanStack Query (React Query) | ^5.x | 서버 상태 관리 |
| **Blockchain** | Wagmi + Viem | ^2.x | 블록체인 상호작용 |
| **Database** | Supabase | Latest | 댓글 및 소셜 데이터 |
| **Styling** | Tailwind CSS | ^3.x | 스타일링 |
| **Type Safety** | TypeScript | ^5.x | 타입 안정성 |

### 2.2 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────┐
│           MemeX 웹사이트 (app.memex.xyz)        │
│  ┌──────────────────────────────────────────┐   │
│  │  Content Script (UI + Blockchain)        │   │
│  │  - URL/DOM 감지 & React Root 마운트        │   │
│  │  - Wagmi & Viem v2 (MemeCore)             │   │
│  │  - 외부 지갑 연동 (Injected/WalletConnect) │  │
│  │  - 지갑·트랜잭션 처리                     │   │
│  │  - runtime.onMessage 핸들러 (API 요청만)    │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                      ↕️
┌─────────────────────────────────────────────────┐
│         Chrome Runtime Messaging Bus            │
│  - Content → Background: Supabase/API, Storage 요청 │
│  - Background → Content: 상태 갱신 알림             │
│  - 단일 메시지 프로토콜 (`scope`, `action`)          │
└─────────────────────────────────────────────────┘
                      ↕️
┌─────────────────────────────────────────────────┐
│        Chrome Extension Background              │
│  ┌──────────────────────────────────────────┐   │
│  │  - Supabase REST Proxy                   │   │
│  │  - chrome.storage 접근 (지갑/설정 메타)       │   │
│  │  - API 응답 캐싱 & 브로드캐스트            │   │
│  │  - 메시지 라우터 (Blockchain 제외)           │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                      ↕️
┌─────────────────────────────────────────────────┐
│              Supabase (Backend)                 │
│  - PostgreSQL (댓글, 메시지, 에셋)              │
│  - REST API (Supabase Client)                   │
│  - Real-time Subscriptions                      │
└─────────────────────────────────────────────────┘
                      ↕️
┌─────────────────────────────────────────────────┐
│          MemeCore Blockchain (EVM)              │
│  - Wagmi/Viem v2를 통한 트랜잭션                │
│  - 토큰 트랜잭션                                │
└─────────────────────────────────────────────────┘
```

### 2.3 메시징 플로우 개요

- **Content Script 핸들러:** API/Storage 관련 메시지만 처리하며, 블록체인/지갑 동작은 Wagmi/Viem 훅과 외부 지갑을 통해 Content 내부에서 직접 수행한다.
- **Background 라우터:** Content에서 넘어온 `scope`(`API`, `SETTINGS`, `NOTIFY`)와 `action`을 기준으로 Supabase 호출, chrome.storage 접근, 브로드캐스트를 수행한다. 블록체인 관련 scope는 허용하지 않는다.
- **요청-응답 규약:** `{ scope, action, payload }` 형태의 메시지를 Promise 기반으로 주고받으며, `error` 필드가 존재하면 Content 쪽에서 React Query `throw`로 처리한다.
- **메시지 타입 중앙화:** `src/messaging/messageTypes.ts`에서 `Scope`, `Action`, `MessageEnvelope` 및 `ActionHandlers`를 정의해 Content/Background가 동일한 타입을 import한다. 모든 신규 액션은 이 파일에 추가하고 주석에 담당 모듈을 기재해 추적성을 확보한다.

### 2.4 에러 & 알림 정책

- Background는 모든 실패 케이스를 `sendResponse({ error, scope: 'NOTIFY' })`와 `console.warn('[squid-meme:bg]', error)` 두 경로로 기록한다.
- Content는 `NOTIFY` scope 수신 시 `notificationsAtom`에 메시지를 push하고, 사용자에게 토스트로 안내한다.
- 재시도 가능 오류와 치명적 오류를 구분하기 위해 `errorCode`를 선택적으로 포함하며, UX 정책은 `src/messaging/messageTypes.ts`에 Enum으로 정의한다.

---

## 3. 전역 상태 관리 (Jotai)

### 3.1 Jotai 개요

Jotai는 원자(Atom) 기반의 경량 상태 관리 라이브러리로, React Query와 함께 사용하여 서버 상태와 클라이언트 상태를 명확히 분리합니다.

- **React Query:** 서버 상태 (API 호출, 캐싱, 동기화, `isPending` 중심 흐름)
- **Jotai:** 클라이언트 상태 (UI 상태, 로컬 상태, 전역 설정)

### 3.2 전역 상태 설계

#### 3.2.1 프로필 관련 상태

**파일:** `src/atoms/profileAtoms.ts`

```typescript
import { atom } from 'jotai';

interface ProfileInfo {
  username: string;
  usernameTag: string;
  symbol?: string;
  fullMetadata?: string;
}

// 현재 프로필 정보
export const profileAtom = atom<ProfileInfo | null>(null);

// 프로필 로딩 상태
export const isProfileLoadingAtom = atom<boolean>(false);

// 방(Challenge) 존재 여부
export const hasRoomAtom = atom<boolean>(false);
```

#### 3.2.2 지갑 관련 상태

**파일:** `src/atoms/walletAtoms.ts`

```typescript
import { atom } from 'jotai';

// Gladiator Wallet 주소
export const gladiatorWalletAddressAtom = atom<string | null>(null);

// 지갑 잔액
interface WalletBalance {
  mcoin: string;
  gameToken: string;
}

export const walletBalanceAtom = atom<WalletBalance>({
  mcoin: '0',
  gameToken: '0',
});

// 지갑 연결 상태
export const isWalletConnectedAtom = atom<boolean>(false);

// 메인 지갑 주소 (Wagmi 연결된 지갑)
export const mainWalletAddressAtom = atom<string | null>(null);
```

#### 3.2.3 게임/챌린지 관련 상태

**파일:** `src/atoms/gameAtoms.ts`

```typescript
import { atom } from 'jotai';

interface ChallengeInfo {
  challengeId: string;
  tokenAddress: string;
  pot: string;
  lastPlayer: string;
  timeRemaining: number;
}

// 현재 챌린지 정보
export const currentChallengeAtom = atom<ChallengeInfo | null>(null);

// 게임 타이머 활성화 상태
export const isTimerActiveAtom = atom<boolean>(false);

// 게임 오버레이 표시 여부
export const isOverlayVisibleAtom = atom<boolean>(false);
```

#### 3.2.4 UI 상태

**파일:** `src/atoms/uiAtoms.ts`

```typescript
import { atom } from 'jotai';

// 충전 패널 열림/닫힘
export const isDepositPanelOpenAtom = atom<boolean>(false);

// 지갑 대시보드 열림/닫힘
export const isWalletDashboardOpenAtom = atom<boolean>(false);

// 알림 메시지
interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const notificationsAtom = atom<Notification[]>([]);

// 다크 모드 (향후 확장)
export const isDarkModeAtom = atom<boolean>(false);
```

### 3.3 파생 상태 (Derived Atoms)

**파일:** `src/atoms/derivedAtoms.ts`

```typescript
import { atom } from 'jotai';
import { profileAtom, hasRoomAtom } from './profileAtoms';
import { gladiatorWalletAddressAtom, walletBalanceAtom } from './walletAtoms';

// 프로필과 방 정보를 결합한 파생 상태
export const canShowOverlayAtom = atom((get) => {
  const profile = get(profileAtom);
  const hasRoom = get(hasRoomAtom);
  return profile !== null && hasRoom;
});

// 지갑이 준비되었는지 확인
export const isWalletReadyAtom = atom((get) => {
  const address = get(gladiatorWalletAddressAtom);
  const balance = get(walletBalanceAtom);
  return address !== null && (balance.mcoin !== '0' || balance.gameToken !== '0');
});

// 충전이 필요한지 확인
export const needsDepositAtom = atom((get) => {
  const balance = get(walletBalanceAtom);
  return balance.mcoin === '0' && balance.gameToken === '0';
});
```

### 3.4 비동기 Atoms

**파일:** `src/atoms/asyncAtoms.ts`

```typescript
import { atom } from 'jotai';
import { profileAtom } from './profileAtoms';

// Background API Proxy를 통한 방 정보 로드
export const roomInfoAtom = atom(async (get) => {
  const profile = get(profileAtom);
  if (!profile) return null;

  const response = await chrome.runtime.sendMessage({
    scope: 'API',
    action: 'FETCH_ROOM',
    payload: {
      username: profile.username,
      usernameTag: profile.usernameTag,
    },
  });

  if (response?.error) {
    console.error('방 정보 조회 실패:', response.error);
    return null;
  }

  return response?.data ?? null;
});
```

### 3.5 Provider 설정

**파일:** `src/components/JotaiProvider.tsx`

```typescript
import { Provider as JotaiProvider } from 'jotai';
import { DevTools } from 'jotai-devtools';

interface Props {
  children: React.ReactNode;
}

export function SquidMemeJotaiProvider({ children }: Props) {
  return (
    <JotaiProvider>
      {process.env.NODE_ENV === 'development' && <DevTools />}
      {children}
    </JotaiProvider>
  );
}
```

### 3.6 Hook을 통한 Atom 사용

**파일:** `src/hooks/useProfileState.ts`

```typescript
import { useAtom } from 'jotai';
import { profileAtom, isProfileLoadingAtom, hasRoomAtom } from '../atoms/profileAtoms';

export function useProfileState() {
  const [profile, setProfile] = useAtom(profileAtom);
  const [isLoading, setIsLoading] = useAtom(isProfileLoadingAtom);
  const [hasRoom, setHasRoom] = useAtom(hasRoomAtom);

  return {
    profile,
    isLoading,
    hasRoom,
    setProfile,
    setIsLoading,
    setHasRoom,
  };
}
```

**파일:** `src/hooks/useWalletState.ts`

```typescript
import { useAtom, useAtomValue } from 'jotai';
import { 
  gladiatorWalletAddressAtom, 
  walletBalanceAtom,
  isWalletReadyAtom,
  needsDepositAtom
} from '../atoms/walletAtoms';

export function useWalletState() {
  const [walletAddress, setWalletAddress] = useAtom(gladiatorWalletAddressAtom);
  const [balance, setBalance] = useAtom(walletBalanceAtom);
  const isWalletReady = useAtomValue(isWalletReadyAtom);
  const needsDeposit = useAtomValue(needsDepositAtom);

  return {
    walletAddress,
    balance,
    isWalletReady,
    needsDeposit,
    setWalletAddress,
    setBalance,
  };
}
```

### 3.7 메시지 기반 Storage 동기화

**파일:** `src/atoms/storageAtoms.ts`

```typescript
import { atom } from 'jotai';

interface Settings {
  darkMode: boolean;
  autoDeposit: boolean;
  notificationEnabled: boolean;
}

// Background에서 chrome.storage를 다루고, Content는 메시지로만 접근
export const settingsAtom = atom<Settings>(
  {
    darkMode: false,
    autoDeposit: false,
    notificationEnabled: true,
  },
  async (_get, set, next) => {
    await chrome.runtime.sendMessage({
      scope: 'SETTINGS',
      action: 'UPDATE',
      payload: next,
    });
    set(settingsAtom, next);
  }
);
```

> **원칙:** Content Script에서는 chrome.storage API를 직접 호출하지 않는다. 모든 지속성 관련 작업은 Background가 처리하고, Content는 메시지 인터페이스만 사용한다. 특히 지갑 키/시드는 어떤 저장소에도 기록하지 않는다.

#### 3.7.1 설정 데이터 플로우

1. 사용자가 UI에서 설정을 변경하면 `settingsAtom`의 write 함수가 `scope: 'SETTINGS', action: 'UPDATE'` 메시지를 Background로 전송한다.
2. Background `src/messaging/handlers/settingsHandler.ts`는 chrome.storage에 값을 반영한 뒤, 최신 스냅샷을 `scope: 'SETTINGS_PUSH'` 메시지로 Content에 브로드캐스트한다.
3. Content `initContentMessagingBridge()`가 이를 수신해 `applySettingsUpdate`를 호출하고, Jotai Store를 갱신한다.
4. 필요 시 Background는 동일한 `SETTINGS_PUSH`를 popup/sidepanel에도 전달해 여러 UI가 항상 동일한 상태를 보도록 한다.

### 3.8 사용 예시

**컴포넌트에서 사용:**

```typescript
import { useAtom } from 'jotai';
import { profileAtom } from '../atoms/profileAtoms';
import { useWalletState } from '../hooks/useWalletState';

export function MyComponent() {
  const [profile, setProfile] = useAtom(profileAtom);
  const { walletAddress, balance, isWalletReady } = useWalletState();

  // 상태 사용 및 업데이트
  return (
    <div>
      {profile && <p>{profile.username}</p>}
      {walletAddress && <p>Wallet: {walletAddress}</p>}
      {isWalletReady && <p>Ready to play!</p>}
    </div>
  );
}
```

---

## 4. 핵심 기능 구현 계획

### 3.1 URL 파싱 및 프로필 감지

#### 목표
- MemeX 프로필 페이지 (`/profile/$username/$usernameTag`) 감지
- 해당 유저의 "방(Challenge)" 유무 판단
- 조건에 맞을 때만 Content UI 표시

#### 구현 세부사항

**파일:** `src/utils/urlParser.ts`

```typescript
interface ProfileParams {
  username: string;
  usernameTag: string;
  isValid: boolean;
}

export function parseProfileUrl(url: string): ProfileParams | null {
  // https://app.memex.xyz/profile/jrbr7282/11Fc20
  const profilePattern = /\/profile\/([^\/]+)\/([^\/]+)$/;
  const match = url.match(profilePattern);
  
  if (match) {
    return {
      username: match[1],
      usernameTag: match[2],
      isValid: true
    };
  }
  return null;
}

export function isProfilePage(): boolean {
  return window.location.pathname.startsWith('/profile/');
}
```

**파일:** `src/hooks/useProfileDetection.ts` (커스텀 훅)

```typescript
import { useEffect, useState } from 'react';
import { parseProfileUrl } from '../utils/urlParser';

export function useProfileDetection() {
  const [profile, setProfile] = useState<ProfileParams | null>(null);
  const [hasRoom, setHasRoom] = useState<boolean>(false);

  useEffect(() => {
    const checkProfile = async () => {
      const params = parseProfileUrl(window.location.href);
      setProfile(params);
      
      if (params) {
        const response = await chrome.runtime.sendMessage({
          scope: 'API',
          action: 'FETCH_ROOM',
          payload: {
            username: params.username,
            usernameTag: params.usernameTag,
          },
        });
        setHasRoom(Boolean(response?.data));
      } else {
        setHasRoom(false);
      }
    };

    checkProfile();
    
    // SPA 라우팅 감지를 위한 이벤트 리스너
    window.addEventListener('popstate', checkProfile);
    const observer = new MutationObserver(checkProfile);
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      window.removeEventListener('popstate', checkProfile);
      observer.disconnect();
    };
  }, []);

  return { profile, hasRoom };
}
```

---

### 3.2 DOM 파싱 및 정보 추출

#### 목표
- MemeX 페이지의 HTML 구조에서 사용자 정보 추출
- 심볼, 유저네임태그, 프로필 메타데이터 파싱

#### 구현 세부사항

**파일:** `src/utils/domParser.ts`

```typescript
interface MemeXProfile {
  symbol: string;        // <em class="Profile_symbol__TEC9N">JRBR</em>
  usernameTag: string;   // <span class="Profile_usernameTag__03ya4">#11Fc20</span>
  fullMetadata: string;  // <div class="ProfileMetadata_container__6cBC1">@jrbr7282<span>#11Fc20</span></div>
}

export function extractProfileInfo(): MemeXProfile | null {
  // 심볼 추출
  const symbolEl = document.querySelector('em.Profile_symbol__TEC9N');
  const symbol = symbolEl?.textContent?.trim() || '';

  // 유저네임태그 추출
  const tagEl = document.querySelector('span.Profile_usernameTag__03ya4');
  const usernameTag = tagEl?.textContent?.trim() || '';

  // 전체 메타데이터 추출
  const metadataEl = document.querySelector('div.ProfileMetadata_container__6cBC1');
  const fullMetadata = metadataEl?.textContent?.trim() || '';

  if (symbol && usernameTag) {
    return { symbol, usernameTag, fullMetadata };
  }
  
  return null;
}
```

**파일:** `src/hooks/useMemeXProfile.ts` (커스텀 훅)

```typescript
import { useEffect, useState } from 'react';
import { extractProfileInfo } from '../utils/domParser';

export function useMemeXProfile() {
  const [profile, setProfile] = useState<MemeXProfile | null>(null);

  useEffect(() => {
    const extractProfile = () => {
      const info = extractProfileInfo();
      if (info) {
        setProfile(info);
      }
    };

    // 초기 추출
    extractProfile();

    // DOM 변경 감지
    const observer = new MutationObserver(extractProfile);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return profile;
}
```

---

### 3.3 지갑 생성 및 관리 (Gladiator Wallet)

#### 목표
- Content Script 내부에서 Wagmi 커넥터(Injected, WalletConnect 등)를 통해 외부 지갑 연결
- Background와는 지갑 상태 메타만 공유하고, 체인 상호작용은 Content에서 직접 처리
- 메인 지갑에서 소액 입금 (Arming)
- $M 코인과 게임 토큰 관리

#### 구현 세부사항

**파일:** `src/config/wallet.ts`

```typescript
export const walletConfig = {
  chain: {
    id: Number(process.env.VITE_MEMECORE_CHAIN_ID),
    rpcUrl: process.env.VITE_MEMECORE_RPC_URL!,
  },
  vaultAddress: process.env.VITE_GLADIATOR_VAULT as `0x${string}`,
  tokens: {
    mcoin: process.env.VITE_M_COIN_ADDRESS as `0x${string}`,
    game: process.env.VITE_GAME_TOKEN_ADDRESS as `0x${string}`,
  },
} as const;
```

**파일:** `src/hooks/useGladiatorWallet.ts` (커스텀 훅)

```typescript
import { useCallback, useMemo } from 'react';
import { useAccount, useBalance, useWalletClient } from 'wagmi';
import { parseEther } from 'viem';
import { walletConfig } from '../config/wallet';
import { erc20Abi } from '../abi/erc20';

export function useGladiatorWallet() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const { data: mcoinBalance, refetch: refetchMCoin } = useBalance({
    address,
    token: walletConfig.tokens.mcoin,
    query: { enabled: Boolean(address) },
  });

  const { data: gameTokenBalance, refetch: refetchGameToken } = useBalance({
    address,
    token: walletConfig.tokens.game,
    query: { enabled: Boolean(address) },
  });

  const deposit = useCallback(
    async (amount: string, token: keyof typeof walletConfig.tokens) => {
      if (!walletClient || !address) throw new Error('지갑이 연결되지 않았습니다.');

      await walletClient.writeContract({
        address: walletConfig.tokens[token],
        abi: erc20Abi,
        functionName: 'transfer',
        args: [walletConfig.vaultAddress, parseEther(amount)],
      });

      await Promise.all([refetchMCoin(), refetchGameToken()]);
    },
    [walletClient, address, refetchMCoin, refetchGameToken]
  );

  return {
    address,
    isConnected,
    balance: useMemo(
      () => ({
        mcoin: mcoinBalance?.formatted ?? '0',
        gameToken: gameTokenBalance?.formatted ?? '0',
      }),
      [mcoinBalance?.formatted, gameTokenBalance?.formatted]
    ),
    deposit,
  };
}
```

> **중요:** 컨텐츠 스크립트는 Wagmi 커넥터(Injected, WalletConnect 등)를 통해 외부 지갑과 직접 상호작용하며, 어떤 메시지나 스토리지에도 개인키를 저장하거나 전달하지 않는다.

---

### 3.4 충전 기능 (Arming)

#### 목표
- Content 화면에서 금액 입력
- 연결된 메인 지갑에서 $M 코인과 게임 토큰 충전
- 트랜잭션 확인 및 상태 업데이트

#### 구현 세부사항

**파일:** `src/components/DepositPanel.tsx`

```typescript
import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useGladiatorWallet } from '../hooks/useGladiatorWallet';

export function DepositPanel() {
  const { address: connectedAddress } = useAccount();
  const { address: gladiatorAddress, deposit } = useGladiatorWallet();
  const [mcoinAmount, setMcoinAmount] = useState('');
  const [gameTokenAmount, setGameTokenAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDeposit = async () => {
    if (!mcoinAmount && !gameTokenAmount) return;
    
    setIsLoading(true);
    try {
      // $M 코인 충전
      if (mcoinAmount) {
        await deposit(mcoinAmount, 'M');
      }
      
      // 게임 토큰 충전
      if (gameTokenAmount) {
        await deposit(gameTokenAmount, 'game');
      }
    } catch (error) {
      console.error('충전 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="deposit-panel">
      <h3>Arming (충전)</h3>
      <div>
        <label>$M 코인</label>
        <input
          type="number"
          value={mcoinAmount}
          onChange={(e) => setMcoinAmount(e.target.value)}
          placeholder="0.0"
        />
      </div>
      <div>
        <label>게임 토큰</label>
        <input
          type="number"
          value={gameTokenAmount}
          onChange={(e) => setGameTokenAmount(e.target.value)}
          placeholder="0.0"
        />
      </div>
      <button onClick={handleDeposit} disabled={isLoading}>
        {isLoading ? '충전 중...' : '충전하기'}
      </button>
    </div>
  );
}
```

---

### 3.5 댓글 시스템 (Supabase 통합)

#### 목표
- 댓글 작성 및 조회 기능
- 실시간 댓글 업데이트
- REST API 방식으로 구현

#### 구현 세부사항

**파일:** `src/lib/supabase.ts` (Background 전용)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  global: { headers: { 'x-my-custom-header': 'squid-meme' } },
});
```

**파일:** `entrypoints/background.ts` (API 라우터)

```typescript
import { supabase } from '../src/lib/supabase';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.scope !== 'API') return false;

  (async () => {
    try {
      if (message.action === 'COMMENTS_LIST') {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('challenge_id', message.payload.challengeId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        sendResponse({ data });
      }

      if (message.action === 'COMMENTS_CREATE') {
        const { data, error } = await supabase
          .from('comments')
          .insert(message.payload)
          .select()
          .single();
        if (error) throw error;
        sendResponse({ data });
      }
    } catch (err) {
      sendResponse({ error: err instanceof Error ? err.message : String(err) });
    }
  })();

  return true; // async 응답 유지
});
```

**파일:** `src/hooks/useComments.ts` (커스텀 훅)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Comment {
  id: string;
  challenge_id: string;
  player_address: string;
  content: string;
  created_at: string;
}

export function useComments(challengeId: string) {
  const queryClient = useQueryClient();

  // 댓글 조회
  const { data: comments, isPending } = useQuery({
    queryKey: ['comments', challengeId],
    queryFn: async () => {
      const response = await chrome.runtime.sendMessage({
        scope: 'API',
        action: 'COMMENTS_LIST',
        payload: { challengeId },
      });

      if (response?.error) {
        throw new Error(response.error);
      }
      return response?.data as Comment[];
    },
  });

  // 댓글 작성
  const createComment = useMutation({
    mutationFn: async ({ content, playerAddress }: { content: string; playerAddress: string }) => {
      const response = await chrome.runtime.sendMessage({
        scope: 'API',
        action: 'COMMENTS_CREATE',
        payload: {
          challenge_id: challengeId,
          player_address: playerAddress,
          content,
        },
      });

      if (response?.error) {
        throw new Error(response.error);
      }
      return response?.data as Comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', challengeId] });
    },
  });

  return {
    comments: comments || [],
    isPending,
    createComment: createComment.mutate,
  };
}
```

**파일:** `src/components/CommentSection.tsx`

```typescript
import { useState } from 'react';
import { useComments } from '../hooks/useComments';
import { useGladiatorWallet } from '../hooks/useGladiatorWallet';

export function CommentSection({ challengeId }: { challengeId: string }) {
  const { comments, isPending, createComment } = useComments(challengeId);
  const { address } = useGladiatorWallet();
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !address) return;

    createComment({
      content: newComment,
      playerAddress: address,
    });
    setNewComment('');
  };

  return (
    <div className="comment-section">
      <h3>댓글</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="댓글을 입력하세요..."
        />
        <button type="submit">댓글 작성</button>
      </form>
      
      <div className="comments-list">
        {isPending ? (
          <p>로딩 중...</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <p>{comment.content}</p>
              <span>{comment.player_address.slice(0, 6)}...{comment.player_address.slice(-4)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## 5. UI/UX 구현 계획

### 4.1 Content Script 마운트 포인트

**파일:** `src/entrypoints/content.ts`

```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '../config/wagmi';
import { SquidMemeJotaiProvider } from '../components/JotaiProvider';
import { SquidMemeOverlay } from '../components/SquidMemeOverlay';
import { useProfileDetection } from '../hooks/useProfileDetection';

const queryClient = new QueryClient();
import { initContentMessagingBridge } from '../messaging/contentBridge';

function App() {
  const { profile, hasRoom } = useProfileDetection();

  if (!profile || !hasRoom) {
    return null; // 방이 없으면 UI 표시 안 함
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <SquidMemeJotaiProvider>
          <SquidMemeOverlay profile={profile} />
        </SquidMemeJotaiProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default defineContentScript({
  matches: ['https://app.memex.xyz/*'],
  main() {
    const container = document.createElement('div');
    container.id = 'squid-meme-root';
    document.body.appendChild(container);

    const root = createRoot(container);
    root.render(<App />);

    initContentMessagingBridge();
  },
});
```

> Content 메시징 로직은 `src/messaging/contentBridge.ts`에서 분리 관리한다. 핸들러 초기화를 `initContentMessagingBridge()`로 묶어 `content.ts`에서는 단순히 부트스트랩만 담당한다.

### 4.2 Content 메시징 브리지

**파일:** `src/messaging/contentBridge.ts`

```typescript
import { applySettingsUpdate } from './handlers/settingsHandler';

export function initContentMessagingBridge() {
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (sender.id !== chrome.runtime.id) return false;
    if (message.scope !== 'SETTINGS_PUSH') return false;

    applySettingsUpdate(message.payload);
    return false;
  });
}
```

**파일:** `src/messaging/handlers/settingsHandler.ts`

```typescript
import { settingsAtom } from '../../atoms/storageAtoms';
import { jotaiStore } from '../../state/store';

export function applySettingsUpdate(payload: SettingsPayload) {
  jotaiStore.set(settingsAtom, payload);
}
```

### 4.2 메인 오버레이 컴포넌트

**파일:** `src/components/SquidMemeOverlay.tsx`

```typescript
import { DepositPanel } from './DepositPanel';
import { CommentSection } from './CommentSection';
import { WalletDashboard } from './WalletDashboard';

interface Props {
  profile: {
    username: string;
    usernameTag: string;
  };
}

export function SquidMemeOverlay({ profile }: Props) {
  return (
    <div className="squid-meme-overlay">
      <WalletDashboard />
      <DepositPanel />
      <CommentSection challengeId={`${profile.username}-${profile.usernameTag}`} />
    </div>
  );
}
```

---

## 6. 데이터베이스 설계

### 5.1 Supabase 테이블 구조

#### `challenges` 테이블
```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) NOT NULL,
  username_tag VARCHAR(255) NOT NULL,
  token_address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(username, username_tag)
);

CREATE INDEX idx_challenges_username ON challenges(username, username_tag);
```

#### `comments` 테이블
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  player_address VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_challenge_id ON comments(challenge_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
```

#### `players` 테이블 (향후 확장용)
```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 7. API 설계

### 6.1 REST API 엔드포인트 (Supabase)

#### 댓글 관련

**GET /rest/v1/comments?challenge_id=eq.{challengeId}**
- 댓글 목록 조회

**POST /rest/v1/comments**
- 댓글 작성
- Body: `{ challenge_id, player_address, content }`

**DELETE /rest/v1/comments?id=eq.{commentId}**
- 댓글 삭제

#### 방(Challenge) 관련

**GET /rest/v1/challenges?username=eq.{username}&username_tag=eq.{tag}**
- 특정 유저의 방 존재 여부 확인

**POST /rest/v1/challenges**
- 새 방 생성
- Body: `{ username, username_tag, token_address }`

---

## 8. 개발 단계별 로드맵

### Phase 1: 기반 설정 (1주)
- [x] WXT + React 프로젝트 초기화
- [ ] Vite 통합 및 최적화
- [ ] Wagmi + Viem 설정 (MemeCore Chain)
- [ ] React Query 설정
- [ ] Jotai 전역 상태 관리 설정
- [ ] Jotai Provider 및 DevTools 설정
- [ ] Tailwind CSS 설정
- [ ] TypeScript 경로 별칭 설정

### Phase 2: URL 파싱 및 DOM 감지 (3일)
- [ ] URL 파싱 유틸리티 구현
- [ ] DOM 파싱 유틸리티 구현 (심볼, 유저네임태그 추출)
- [ ] 프로필 감지 커스텀 훅 구현
- [ ] SPA 라우팅 변경 감지

### Phase 3: 지갑 시스템 (5일)
- [ ] Gladiator Wallet 생성 로직
- [ ] Background Storage Proxy + 메시징 연동
- [ ] 지갑 관련 Atoms 생성 (Jotai)
- [ ] 지갑 잔액 조회
- [ ] 지갑 관리 커스텀 훅
- [ ] useWalletState 훅 구현 (Jotai 기반)

### Phase 4: 충전 기능 (5일)
- [ ] DepositPanel UI 컴포넌트
- [ ] Wagmi를 통한 트랜잭션 전송
- [ ] 트랜잭션 상태 관리 (로딩, 성공, 실패)
- [ ] 지갑 연결 상태 확인

### Phase 5: 댓글 시스템 (5일)
- [ ] Supabase 프로젝트 생성 및 테이블 설계
- [ ] Supabase 클라이언트 설정
- [ ] 댓글 조회/작성 API 연동
- [ ] CommentSection 컴포넌트
- [ ] 실시간 댓글 업데이트 (옵션)

### Phase 6: UI 통합 및 스타일링 (3일)
- [ ] SquidMemeOverlay 메인 컴포넌트
- [ ] Tailwind CSS 스타일링 (MemeCore 감성)
- [ ] 반응형 디자인
- [ ] 애니메이션 효과

### Phase 7: 테스트 및 최적화 (3일)
- [ ] 메시징 계약 테스트: Mock Background로 Content 훅/핸들러 검증
- [ ] 지갑 통합 테스트: Testnet + Injected Wallet로 입금/알림 플로우 점검
- [ ] Supabase 스텁 기반 React Query 검증 (캐시 무결성 확인)
- [ ] 성능·에러 로깅 점검 및 사용자 피드백 반영

---

## 9. 파일 구조

```
squid_meme/
├── docs/
│   ├── SquidMeme.md
│   └── DevelopmentPlan.md (이 문서)
├── entrypoints/
│   ├── background.ts
│   ├── content.ts                    # Content Script 진입점
│   └── popup/
│       └── App.tsx
├── src/
│   ├── atoms/
│   │   ├── profileAtoms.ts           # 프로필 관련 Atoms
│   │   ├── walletAtoms.ts            # 지갑 관련 Atoms
│   │   ├── gameAtoms.ts              # 게임/챌린지 관련 Atoms
│   │   ├── uiAtoms.ts                # UI 상태 Atoms
│   │   ├── derivedAtoms.ts           # 파생 상태 Atoms
│   │   ├── asyncAtoms.ts             # 비동기 Atoms
│   │   └── storageAtoms.ts           # 메시지 기반 Storage 브리지
│   ├── components/
│   │   ├── JotaiProvider.tsx         # Jotai Provider (DevTools 포함)
│   │   ├── SquidMemeOverlay.tsx      # 메인 오버레이
│   │   ├── DepositPanel.tsx          # 충전 패널
│   │   ├── CommentSection.tsx        # 댓글 섹션
│   │   └── WalletDashboard.tsx       # 지갑 대시보드
│   ├── hooks/
│   │   ├── useProfileDetection.ts    # 프로필 감지
│   │   ├── useMemeXProfile.ts        # MemeX 프로필 파싱
│   │   ├── useGladiatorWallet.ts     # 지갑 관리
│   │   ├── useComments.ts            # 댓글 관리
│   │   ├── useProfileState.ts        # 프로필 상태 훅 (Jotai)
│   │   └── useWalletState.ts         # 지갑 상태 훅 (Jotai)
│   ├── utils/
│   │   ├── urlParser.ts              # URL 파싱
│   │   └── domParser.ts              # DOM 파싱
│   ├── lib/
│   │   ├── supabase.ts               # (Background) Supabase 클라이언트
│   │   └── wagmi.ts                  # Wagmi 설정
│   ├── messaging/
│   │   ├── contentBridge.ts          # runtime.onMessage 핸들러
│   │   └── messageTypes.ts           # 메시지 타입/화이트리스트 정의
│   ├── config/
│   │   ├── wagmi.ts                  # Wagmi Config (Chain, Connectors)
│   │   └── wallet.ts                 # 체인·토큰·금고 주소 캡슐화
│   └── types/
│       └── index.ts                  # TypeScript 타입 정의
├── public/
│   └── icon/
├── wxt.config.ts
├── vite.config.ts                    # Vite 설정 (신규)
├── tailwind.config.js                # Tailwind 설정 (신규)
├── tsconfig.json
└── package.json
```

---

## 9. 환경 변수 설정

### `.env.local` 파일 (신규 생성)

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# MemeCore Chain
VITE_MEMECORE_RPC_URL=https://rpc.memecore.xyz
VITE_MEMECORE_CHAIN_ID=1234

# 토큰 주소 (향후 사용)
VITE_M_COIN_ADDRESS=0x...
```

---

## 10. 다음 단계

1. **즉시 시작:**
   - Vite 통합 및 패키지 설치
   - Wagmi 설정 (MemeCore Chain)
   - React Query 설정

2. **MVP 우선순위:**
   - URL 파싱 및 프로필 감지
   - 댓글 시스템 (Supabase)
   - 기본 UI 마운트

3. **향후 확장:**
   - 게임 메커니즘 구현
   - 스마트 컨트랙트 연동
   - 실시간 타이머 및 상금 표시

---

**작성 완료일:** 2025-01-27  
**다음 업데이트 예정:** 기능 구현 진행에 따라 업데이트

**다음 업데이트 예정:** 기능 구현 진행에 따라 업데이트
