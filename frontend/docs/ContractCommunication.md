# 컨트랙트 통신 가이드

## 개요

컨트랙트와 통신하기 위한 타입 안전한 인터페이스를 제공합니다. viem을 기반으로 구현되어 있으며, injected script를 통해 MetaMask와 통신합니다.

## 구조

```
src/contents/lib/contract/
├── types.ts              # 타입 정의
├── contractClient.ts     # 컨트랙트 클라이언트
├── contractRegistry.ts   # 컨트랙트 레지스트리
├── abis/
│   └── example.ts        # 예시 ABI
└── index.ts              # 모듈 export
```

## 기본 사용법

### 1. ABI 정의

```typescript
// src/contents/lib/contract/abis/myContract.ts
import type { Abi } from 'viem';

export const myContractABI: Abi = [
    {
        type: 'function',
        name: 'getValue',
        inputs: [{ name: 'id', type: 'uint256' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'setValue',
        inputs: [
            { name: 'id', type: 'uint256' },
            { name: 'value', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
] as const;

export const MY_CONTRACT_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as const;
```

### 2. 컨트랙트 클라이언트 생성

```typescript
import { createContractClient } from '@/contents/lib/contract';
import { myContractABI, MY_CONTRACT_ADDRESS } from '@/contents/lib/contract/abis/myContract';

const client = createContractClient({
    address: MY_CONTRACT_ADDRESS,
    abi: myContractABI,
});
```

### 3. 컨트랙트 읽기 (view/pure 함수)

```typescript
// 단순 읽기
const result = await client.read({
    functionName: 'getValue',
    args: [123],
});

console.log('Value:', result.data); // 타입 안전
```

### 4. 컨트랙트 쓰기 (상태 변경 함수)

```typescript
// 트랜잭션 전송
const tx = await client.write(
    {
        functionName: 'setValue',
        args: [123, 456],
        value: 0n, // optional: 전송할 ETH 양 (Wei)
    },
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' // from address
);

console.log('Transaction hash:', tx.hash);
```

## React 훅 사용

### useContractRead

```typescript
import { useContractRead } from '@/contents/hooks/useContract';
import { createContractClient } from '@/contents/lib/contract';
import { myContractABI, MY_CONTRACT_ADDRESS } from '@/contents/lib/contract/abis/myContract';

function MyComponent() {
    const client = useMemo(
        () => createContractClient({
            address: MY_CONTRACT_ADDRESS,
            abi: myContractABI,
        }),
        []
    );

    const { data, isLoading, error, refetch } = useContractRead(
        client,
        {
            functionName: 'getValue',
            args: [123],
        }
    );

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <p>Value: {data}</p>
            <button onClick={refetch}>Refresh</button>
        </div>
    );
}
```

### useContractWrite

```typescript
import { useContractWrite } from '@/contents/hooks/useContract';
import { useWallet } from '@/contents/hooks/useWallet';

function MyComponent() {
    const { address } = useWallet();
    const client = useMemo(
        () => createContractClient({
            address: MY_CONTRACT_ADDRESS,
            abi: myContractABI,
        }),
        []
    );

    const { write, isLoading, error, hash } = useContractWrite(client, address);

    const handleSetValue = async () => {
        try {
            const txHash = await write({
                functionName: 'setValue',
                args: [123, 456],
            });
            console.log('Transaction sent:', txHash);
        } catch (error) {
            console.error('Transaction failed:', error);
        }
    };

    return (
        <div>
            <button onClick={handleSetValue} disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Set Value'}
            </button>
            {hash && <p>Tx Hash: {hash}</p>}
            {error && <p>Error: {error}</p>}
        </div>
    );
}
```

## 컨트랙트 레지스트리 사용

여러 컨트랙트를 중앙에서 관리할 수 있습니다:

```typescript
import { contractRegistry } from '@/contents/lib/contract';
import { myContractABI, MY_CONTRACT_ADDRESS } from '@/contents/lib/contract/abis/myContract';
import { anotherContractABI, ANOTHER_CONTRACT_ADDRESS } from '@/contents/lib/contract/abis/anotherContract';

// 컨트랙트 등록
contractRegistry.register('MyContract', {
    address: MY_CONTRACT_ADDRESS,
    abi: myContractABI,
});

contractRegistry.register('AnotherContract', {
    address: ANOTHER_CONTRACT_ADDRESS,
    abi: anotherContractABI,
});

// 사용
const myContract = contractRegistry.get('MyContract');
const result = await myContract?.read({
    functionName: 'getValue',
    args: [123],
});
```

## 실제 사용 예시 (댓글 시스템)

```typescript
// src/contents/lib/contract/abis/commentContract.ts
import type { Abi } from 'viem';

export const commentContractABI: Abi = [
    {
        type: 'function',
        name: 'createComment',
        inputs: [
            { name: 'challengeId', type: 'string' },
            { name: 'content', type: 'string' },
            { name: 'signature', type: 'bytes' },
        ],
        outputs: [{ name: 'commentId', type: 'uint256' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'getComments',
        inputs: [{ name: 'challengeId', type: 'string' }],
        outputs: [
            {
                name: '',
                type: 'tuple[]',
                components: [
                    { name: 'id', type: 'uint256' },
                    { name: 'author', type: 'address' },
                    { name: 'content', type: 'string' },
                    { name: 'createdAt', type: 'uint256' },
                ],
            },
        ],
        stateMutability: 'view',
    },
] as const;

export const COMMENT_CONTRACT_ADDRESS = '0x...' as const;
```

```typescript
// CommentSection.tsx에서 사용
import { useContractWrite } from '@/contents/hooks/useContract';
import { createContractClient } from '@/contents/lib/contract';
import { commentContractABI, COMMENT_CONTRACT_ADDRESS } from '@/contents/lib/contract/abis/commentContract';

function CommentSection() {
    const { address } = useWallet();
    const client = useMemo(
        () => createContractClient({
            address: COMMENT_CONTRACT_ADDRESS,
            abi: commentContractABI,
        }),
        []
    );

    const { write, isLoading } = useContractWrite(client, address);

    const handleSubmit = async () => {
        const signature = await signMessage(...);
        
        const txHash = await write({
            functionName: 'createComment',
            args: [
                challengeId,
                content,
                signature,
            ],
        });
    };
}
```

## 에러 처리

```typescript
try {
    const result = await client.read({
        functionName: 'getValue',
        args: [123],
    });
} catch (error) {
    if (error instanceof InjectedScriptErrorClass) {
        if (error.code === ERROR_CODES.USER_REJECTED) {
            console.log('사용자가 거부했습니다');
        } else if (error.code === ERROR_CODES.TIMEOUT) {
            console.log('요청 타임아웃');
        }
    }
}
```

## 타입 안정성

viem의 타입 시스템을 활용하여 컴파일 타임에 타입 체크가 가능합니다:

```typescript
// ABI에서 자동으로 타입 추론
const result = await client.read({
    functionName: 'getValue', // 자동완성 지원
    args: [123], // 타입 체크
});

// result.data는 자동으로 올바른 타입으로 추론됨
```

## 주의사항

1. **네트워크 전환**: 쓰기 작업 전에 올바른 네트워크로 전환되어 있는지 확인하세요.
2. **가스 추정**: 복잡한 트랜잭션은 가스 추정을 고려하세요.
3. **에러 처리**: 모든 컨트랙트 호출은 try-catch로 감싸세요.
4. **타입 안정성**: ABI를 정확히 정의하여 타입 안정성을 보장하세요.

