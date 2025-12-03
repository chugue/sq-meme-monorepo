# 저장소 구조 다이어그램

## 전체 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Components / Hooks                      │
│  (useMemexLogin, Dashboard, ProfilePage, etc.)                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ useAtomValue / useSetAtom
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Jotai Atoms Layer                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ sessionAtom (atomWithStorage)                            │  │
│  │  - Key: 'squid_session_state'                            │  │
│  │  - 자동 저장/불러오기 (getOnInit: true)                  │  │
│  │  - unwrap으로 Promise 처리                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ loginCheckCompletedAtom (atomWithStorage)                 │  │
│  │  - Key: 'squid_login_check_completed'                    │  │
│  │  - 자동 저장/불러오기                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 파생 Atoms (읽기 전용)                                    │  │
│  │  - isWalletConnectedAtom                                  │  │
│  │  - walletAddressAtom                                     │  │
│  │  - isMemexLoggedInAtom                                   │  │
│  │  - isLoadingAtom, isLoggingInAtom, etc.                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ createSessionStorage()
                            │ (AsyncStorage 인터페이스)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Storage Utility Layer                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ sessionStorage.ts                                         │  │
│  │  - getStorage<T>(key) → Promise<T | null>                 │  │
│  │  - setStorage(key, value) → Promise<void>                 │  │
│  │  - removeStorage(key) → Promise<void>                    │  │
│  │  - createSessionStorage<Value>() → AsyncStorage<Value>  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ localStorage.ts                                           │  │
│  │  - getStorage<T>(key) → Promise<T | null>                 │  │
│  │  - setStorage(key, value) → Promise<void>                 │  │
│  │  - removeStorage(key) → Promise<void>                    │  │
│  │  (민감하지 않은 데이터용)                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ backgroundApi.getStorage/setStorage/removeStorage
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Background API Layer                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ backgroundApi.ts                                          │  │
│  │  - getStorage<T>(key, area: 'session' | 'local')         │  │
│  │  - setStorage(key, value, area)                           │  │
│  │  - removeStorage(key, area)                               │  │
│  │  - sendToBackground<BackgroundMessage>()                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Chrome Runtime Message
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Background Script (messageHandler.ts)              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ GET_STORAGE / SET_STORAGE / REMOVE_STORAGE 메시지 처리    │  │
│  │  - chrome.storage.session.get/set/remove                  │  │
│  │  - chrome.storage.local.get/set/remove                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Chrome Storage API                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ chrome.storage.session                                    │  │
│  │  - 'squid_session_state' (SessionState)                  │  │
│  │  - 'squid_login_check_completed' (boolean)              │  │
│  │  - 'gtm_user_identifier' (MemexUserInfo)                 │  │
│  │  - 'squid_user' (User)                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ chrome.storage.local                                       │  │
│  │  - (민감하지 않은 설정, 캐시 등)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 데이터 흐름

### 1. 앱 시작 시 (초기화)

```
1. React 컴포넌트 마운트
   ↓
2. useMemexLogin 훅 실행
   ↓
3. sessionAtom, loginCheckCompletedAtom 사용
   ↓
4. atomWithStorage가 자동으로 저장소에서 불러오기
   ↓
5. createSessionStorage().getItem() 호출
   ↓
6. sessionStorage.getStorage() 호출
   ↓
7. backgroundApi.getStorage() 호출
   ↓
8. Background Script가 chrome.storage.session.get() 실행
   ↓
9. 저장된 데이터 반환 → atom 업데이트 → 컴포넌트 리렌더링
```

### 2. 상태 변경 시 (자동 저장)

```
1. 컴포넌트에서 setMemexLoggedInAtom() 호출
   ↓
2. sessionAtom 업데이트
   ↓
3. atomWithStorage가 자동으로 저장소에 저장
   ↓
4. createSessionStorage().setItem() 호출
   ↓
5. sessionStorage.setStorage() 호출
   ↓
6. backgroundApi.setStorage() 호출
   ↓
7. Background Script가 chrome.storage.session.set() 실행
   ↓
8. 저장 완료
```

### 3. 로그아웃 시 (초기화)

```
1. logout() 함수 호출
   ↓
2. resetSessionAtom() 실행
   ↓
3. sessionAtom을 initialSessionState로 초기화
   ↓
4. loginCheckCompletedAtom을 false로 초기화
   ↓
5. atomWithStorage가 자동으로 저장소에 반영
   ↓
6. (선택적) removeStorage()로 명시적 삭제
```

## 저장소 키 목록

### Session Storage (민감한 정보)
- `squid_session_state`: 전체 세션 상태 (SessionState)
- `squid_login_check_completed`: 로그인 체크 완료 여부 (boolean)
- `gtm_user_identifier`: MEMEX 로그인 정보 (MemexUserInfo)
- `squid_user`: 백엔드 유저 정보 (User)

### Local Storage (민감하지 않은 정보)
- (향후 확장 가능)

## 주요 특징

1. **자동 동기화**: `atomWithStorage`를 사용하여 atom 값 변경 시 자동으로 저장소에 저장
2. **초기화 시 자동 불러오기**: `getOnInit: true` 옵션으로 앱 시작 시 자동으로 저장소에서 불러옴
3. **Promise 처리**: `unwrap`을 사용하여 비동기 atom의 Promise를 자동으로 처리
4. **타입 안전성**: TypeScript로 모든 저장소 접근이 타입 안전하게 처리됨
5. **에러 처리**: 각 레이어에서 에러를 적절히 처리하고 로깅

## 파일 구조

```
frontend/src/
├── contents/lib/
│   ├── localStorage.ts          # Local Storage 유틸
│   ├── sessionStorage.ts       # Session Storage 유틸 + Jotai 어댑터
│   ├── backgroundApi.ts        # Background Script 통신
│   └── chromeStorage.ts        # 기존 호환성 유틸 (레거시)
│
└── sidepanel/
    ├── atoms/
    │   └── sessionAtoms.ts      # Jotai Atoms (atomWithStorage 사용)
    └── hooks/
        └── useMemexLogin.ts    # 로그인 상태 관리 훅
```

