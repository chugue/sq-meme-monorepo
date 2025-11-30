# Injected Script 통신 가이드

## 개요

Content Script와 Injected Script 간의 통신을 통해 MetaMask와 같은 지갑에 접근할 수 있습니다.

## 통신 구조

```
Content Script (확장 프로그램 컨텍스트)
    ↓ window.postMessage
Injected Script (웹 페이지 컨텍스트)
    ↓ window.ethereum.request
MetaMask Provider
```

## 전체 아키텍처 및 흐름

### 시스템 구조 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│  Squid Meme 확장 프로그램 (Chrome Extension)                    │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Content Script (content.ts)                               │ │
│  │ - window (확장 프로그램 컨텍스트)                        │ │
│  │ - window.chrome ✅                                        │ │
│  │ - window.ethereum ❌ (접근 불가)                          │ │
│  │                                                           │ │
│  │ 1️⃣ injected.js 주입                                      │ │
│  │    document.body.insertBefore(script, ...)              │ │
│  │    ↓                                                      │ │
│  │ 2️⃣ React 컴포넌트 (CommentSection)                        │ │
│  │    사용자가 "댓글 작성" 버튼 클릭                        │ │
│  │    ↓                                                      │ │
│  │ 3️⃣ injectedApi.signMessage() 호출                       │ │
│  │    window.postMessage({                                  │ │
│  │      source: 'CONTENT_SCRIPT',                            │ │
│  │      method: 'ETH_REQUEST',                               │ │
│  │      payload: { method: 'personal_sign', ... }           │ │
│  │    }, '*')                                                │ │
│  │    ↓                                                      │ │
│  │ 4️⃣ 응답 대기 (window.addEventListener('message'))         │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                    ↕ window.postMessage
                    (웹페이지의 window 객체로 전달)
┌─────────────────────────────────────────────────────────────────┐
│  웹페이지 (app.memex.xyz)                                       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Injected Script (injected.js)                              │ │
│  │ - window (웹페이지 컨텍스트)                              │ │
│  │ - window.ethereum ✅ (MetaMask 접근 가능!)                │ │
│  │ - window.location                                          │ │
│  │                                                           │ │
│  │ 1️⃣ 메시지 수신                                            │ │
│  │    window.addEventListener('message', (event) => {       │ │
│  │      if (event.data.source === 'CONTENT_SCRIPT') {        │ │
│  │        // Content Script로부터 요청 받음                  │ │
│  │      }                                                     │ │
│  │    })                                                      │ │
│  │    ↓                                                       │ │
│  │ 2️⃣ MetaMask 호출                                          │ │
│  │    window.ethereum.request({                               │ │
│  │      method: 'personal_sign',                             │ │
│  │      params: [message, address]                            │ │
│  │    })                                                      │ │
│  │    ↓                                                       │ │
│  │ 3️⃣ 사용자가 MetaMask 팝업에서 서명 승인                  │ │
│  │    ↓                                                       │ │
│  │ 4️⃣ 서명 결과 반환                                         │ │
│  │    window.postMessage({                                   │ │
│  │      source: 'INJECTED_SCRIPT_RESPONSE',                   │ │
│  │      id: payload.id,                                      │ │
│  │      result: signature                                    │ │
│  │    }, '*')                                                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ MetaMask Extension                                         │ │
│  │ - window.ethereum 객체 제공                                │ │
│  │ - 사용자 지갑 관리                                         │ │
│  │ - 트랜잭션/서명 처리                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                    ↕ window.postMessage
                    (응답 전달)
┌─────────────────────────────────────────────────────────────────┐
│  Squid Meme 확장 프로그램 (Chrome Extension)                    │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Content Script (content.ts)                               │ │
│  │                                                           │ │
│  │ 5️⃣ 서명 결과 수신                                         │ │
│  │    messageListener에서 event.data.result 받음            │ │
│  │    ↓                                                      │ │
│  │ 6️⃣ 댓글 작성 API 호출                                     │ │
│  │    createComment({                                       │ │
│  │      player_address: address,                             │ │
│  │      content: comment,                                    │ │
│  │      signature: signature  ✅                             │ │
│  │    })                                                     │ │
│  │    ↓                                                      │ │
│  │ 7️⃣ 서버로 전송 (Background Script → API)                │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 상세 흐름 설명

#### 1단계: 스크립트 주입 (Extension → Webpage)
```
Content Script
  ↓ chrome.runtime.getURL('injected.js')
  ↓ document.createElement('script')
  ↓ script.src = 'chrome-extension://xxx/injected.js'
  ↓ document.body.insertBefore(script, ...)
웹페이지 DOM에 <script> 태그 주입
  ↓ 스크립트 실행
Injected Script (웹페이지 컨텍스트에서 실행)
```

#### 2단계: 요청 전송 (Extension → Webpage → MetaMask)
```
React 컴포넌트 (CommentSection)
  ↓ 사용자 클릭
  ↓ injectedApi.signMessage()
  ↓ window.postMessage({ source: 'CONTENT_SCRIPT', ... })
웹페이지 window 객체
  ↓ window.addEventListener('message')
Injected Script
  ↓ window.ethereum.request({ method: 'personal_sign', ... })
MetaMask 팝업
  ↓ 사용자 승인
  ↓ 서명 결과 반환
```

#### 3단계: 응답 수신 (MetaMask → Webpage → Extension)
```
MetaMask
  ↓ 서명 결과
Injected Script
  ↓ window.postMessage({ source: 'INJECTED_SCRIPT_RESPONSE', ... })
웹페이지 window 객체
  ↓ window.addEventListener('message')
Content Script
  ↓ 서명 결과 수신
  ↓ 댓글 작성 API 호출
```

### 핵심 포인트

1. **격리된 컨텍스트**: Content Script는 확장 프로그램의 격리된 컨텍스트에서 실행되므로 `window.ethereum`에 직접 접근할 수 없습니다.

2. **Injected Script의 역할**: 웹페이지 컨텍스트에서 실행되어 `window.ethereum`에 접근할 수 있는 브릿지 역할을 합니다.

3. **통신 메커니즘**: `window.postMessage`를 통해 서로 다른 컨텍스트 간에 메시지를 주고받습니다.

4. **보안 검증**: `event.source !== window`와 `event.data.source`를 통해 메시지 출처를 검증합니다.

5. **비동기 처리**: 모든 통신은 Promise 기반으로 비동기적으로 처리됩니다.

## 기본 사용법

### 1. 간단한 요청 예시

```typescript
import { injectedApi } from '@/contents/lib/injectedApi';

// 계정 연결 요청
const accounts = await injectedApi.requestAccounts();
console.log('연결된 계정:', accounts);

// 현재 체인 ID 조회
const chainId = await injectedApi.getChainId();
console.log('체인 ID:', chainId);
```

### 2. useWallet 훅 사용

```typescript
import { useWallet } from '@/contents/hooks/useWallet';

function MyComponent() {
    const { isConnected, address, connect, disconnect, isLoading } = useWallet();

    if (isLoading) {
        return <div>로딩 중...</div>;
    }

    if (!isConnected) {
        return <button onClick={connect}>지갑 연결</button>;
    }

    return (
        <div>
            <p>연결된 주소: {address}</p>
            <button onClick={disconnect}>연결 해제</button>
        </div>
    );
}
```

### 3. 직접 Ethereum 요청

```typescript
import { sendEthereumRequest } from '@/contents/lib/injectedApi';

// 커스텀 RPC 메서드 호출
const result = await sendEthereumRequest('eth_getBalance', [
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    'latest'
]);
console.log('잔액:', result);
```

### 4. 트랜잭션 전송

```typescript
import { injectedApi } from '@/contents/lib/injectedApi';

const txHash = await injectedApi.sendTransaction({
    from: '0x...',
    to: '0x...',
    value: '0x0', // Wei 단위 (hex)
    data: '0x...', // 컨트랙트 호출 데이터
});
console.log('트랜잭션 해시:', txHash);
```

### 5. 메시지 서명

```typescript
import { injectedApi } from '@/contents/lib/injectedApi';

const signature = await injectedApi.signMessage(
    'Hello, World!',
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
);
console.log('서명:', signature);
```

## CommentSection에 통합 예시

```typescript
import { useWallet } from '../hooks/useWallet';
import { useComments } from '../hooks/useComments';

export function CommentSection() {
    const { isConnected, address, connect } = useWallet();
    const { comments, createComment } = useComments();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isConnected) {
            await connect();
            return;
        }

        if (!address) {
            alert('지갑을 연결해주세요');
            return;
        }

        try {
            await createComment({
                player_address: address,
                content: newComment.trim(),
            });
        } catch (error) {
            console.error('댓글 작성 오류:', error);
        }
    };

    return (
        <div>
            {!isConnected && (
                <button onClick={connect}>지갑 연결</button>
            )}
            {isConnected && (
                <p>연결된 주소: {address}</p>
            )}
            {/* 댓글 폼 */}
        </div>
    );
}
```

## API 레퍼런스

### `injectedApi.requestAccounts()`
MetaMask 연결 요청
- **Returns**: `Promise<string[]>` - 연결된 계정 주소 배열

### `injectedApi.getAccounts()`
현재 연결된 계정 조회
- **Returns**: `Promise<string[]>` - 연결된 계정 주소 배열

### `injectedApi.getChainId()`
현재 체인 ID 조회
- **Returns**: `Promise<string>` - 체인 ID (hex)

### `injectedApi.sendTransaction(transaction)`
트랜잭션 전송
- **Parameters**: 
  - `transaction`: `{ from, to?, value?, data?, gas?, gasPrice? }`
- **Returns**: `Promise<string>` - 트랜잭션 해시

### `injectedApi.signMessage(message, address)`
메시지 서명
- **Parameters**:
  - `message`: `string` - 서명할 메시지
  - `address`: `string` - 서명할 주소
- **Returns**: `Promise<string>` - 서명 결과

### `injectedApi.sendEthereumRequest(method, params?)`
커스텀 Ethereum RPC 요청
- **Parameters**:
  - `method`: `string` - RPC 메서드명
  - `params`: `any[]` - 파라미터 배열
- **Returns**: `Promise<any>` - 요청 결과

## 에러 처리

모든 API는 Promise를 반환하므로 try-catch로 에러를 처리할 수 있습니다:

```typescript
try {
    const accounts = await injectedApi.requestAccounts();
} catch (error) {
    if (error.message.includes('User rejected')) {
        console.log('사용자가 연결을 거부했습니다');
    } else {
        console.error('연결 오류:', error);
    }
}
```

## 주의사항

1. **컨텍스트 차이**: Injected script는 웹 페이지 컨텍스트에서 실행되므로, 직접 `window.ethereum`에 접근할 수 있습니다.

2. **보안**: 모든 메시지는 `window.postMessage`를 통해 전송되므로, injected script에서 출처를 검증합니다.

3. **타임아웃**: 기본 타임아웃은 30초입니다. 필요시 `sendEthereumRequest` 함수를 수정할 수 있습니다.

4. **비동기 처리**: 모든 요청은 비동기이므로 `await` 또는 `.then()`을 사용해야 합니다.

