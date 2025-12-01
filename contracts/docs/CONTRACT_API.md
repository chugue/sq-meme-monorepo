# CommentGameV2 컨트랙트 API 문서

이 문서는 `CommentGameV2` 컨트랙트의 구조, 함수, 그리고 프론트엔드에서의 활용 방법을 설명합니다.

---

## 목차

1. [컨트랙트 개요](#컨트랙트-개요)
2. [데이터 구조](#데이터-구조)
3. [상태 변수](#상태-변수)
4. [이벤트](#이벤트)
5. [State-Changing 함수](#state-changing-함수)
6. [View 함수](#view-함수)
7. [프론트엔드 활용 가이드](#프론트엔드-활용-가이드)
8. [리더보드 구현 가이드](#리더보드-구현-가이드)

---

## 컨트랙트 개요

`CommentGameV2`는 댓글 기반 게임 컨트랙트로, 다음과 같은 기능을 제공합니다:

- **게임 생성**: 토큰별로 게임을 생성하고 초기 펀딩 가능
- **펀딩**: 게임 진행 중 추가 펀딩 가능
- **댓글 작성**: 댓글 작성 시 토큰 지불 및 즉시 펀딩자들에게 분배
- **상금 수령**: 게임 종료 후 마지막 댓글 작성자가 상금 수령
- **다중 게임 관리**: 단일 컨트랙트에서 여러 게임을 맵핑으로 관리

### 주요 특징

- **단일 컨트랙트 구조**: Factory 패턴 대신 단일 컨트랙트에서 모든 게임 관리
- **즉시 분배**: 댓글 작성 시 수수료가 즉시 펀딩자들에게 분배됨
- **플랫폼 수수료**: 댓글 작성 비용의 2%가 플랫폼 수수료로 차감
- **시간 연장**: 댓글 작성 시마다 게임 시간이 연장됨

---

## 데이터 구조

### GameData (내부 구조체)

게임의 전체 데이터를 저장하는 구조체입니다. 직접 접근은 불가능하며, View 함수를 통해 조회해야 합니다.

```solidity
struct GameData {
    uint256 id;                    // 게임 ID
    address initiator;             // 게임 생성자
    address gameToken;             // 게임 토큰 주소
    uint256 cost;                  // 댓글 작성 비용
    uint256 gameTime;              // 게임 시간 (초)
    string tokenSymbol;            // 토큰 심볼
    uint256 endTime;               // 게임 종료 시간 (타임스탬프)
    address lastCommentor;         // 마지막 댓글 작성자 (우승자)
    uint256 prizePool;             // 현재 상금 풀
    bool isClaimed;                // 상금 수령 여부
    
    // 펀딩 관련
    mapping(address => uint256) fundings;  // 펀딩자별 펀딩 금액
    address[] funders;                    // 펀딩자 목록
    uint256 totalFunding;                 // 총 펀딩 금액
}
```

### GameInfo (조회용 구조체)

프론트엔드에서 게임 정보를 조회할 때 사용하는 구조체입니다.

```solidity
struct GameInfo {
    uint256 id;                    // 게임 ID
    address initiator;             // 게임 생성자
    address gameToken;             // 게임 토큰 주소
    uint256 cost;                  // 댓글 작성 비용
    uint256 gameTime;              // 게임 시간 (초)
    string tokenSymbol;            // 토큰 심볼
    uint256 endTime;               // 게임 종료 시간 (타임스탬프)
    address lastCommentor;         // 마지막 댓글 작성자 (우승자)
    uint256 prizePool;             // 현재 상금 풀
    bool isClaimed;                // 상금 수령 여부
    bool isEnded;                  // 게임 종료 여부 (계산된 값)
    uint256 totalFunding;          // 총 펀딩 금액
    uint256 funderCount;           // 펀딩자 수
}
```

---

## 상태 변수

### Public 변수

| 변수명 | 타입 | 설명 |
|--------|------|------|
| `PLATFORM_FEE` | `uint256` (constant) | 플랫폼 수수료 비율 (2) |
| `feeCollector` | `address` | 플랫폼 수수료 수령 주소 |
| `gameIdCounter` | `uint256` | 게임 ID 카운터 |
| `games` | `mapping(uint256 => GameData)` | 게임 ID → 게임 데이터 |
| `activeGameByToken` | `mapping(address => uint256)` | 토큰 주소 → 활성 게임 ID |
| `allGameIds` | `uint256[]` | 모든 게임 ID 목록 |

---

## 이벤트

### GameCreated

게임이 생성될 때 발생하는 이벤트입니다.

```solidity
event GameCreated(
    uint256 indexed gameId,
    address indexed initiator,
    address indexed gameToken,
    uint256 initialFunding,
    uint256 endTime
);
```

**활용**: 프론트엔드에서 새 게임 생성 시 실시간 업데이트

### CommentAdded

댓글이 추가될 때 발생하는 이벤트입니다.

```solidity
event CommentAdded(
    uint256 indexed gameId,
    address indexed commentor,
    string message,
    uint256 newEndTime,
    uint256 timestamp
);
```

**활용**: 
- 댓글 목록 실시간 업데이트
- 게임 종료 시간 변경 알림
- 댓글 수 카운팅

### PrizePoolFunded

상금 풀에 펀딩이 추가될 때 발생하는 이벤트입니다.

```solidity
event PrizePoolFunded(
    uint256 indexed gameId,
    address indexed funder,
    uint256 amount,
    uint256 totalFunding
);
```

**활용**: 상금 풀 실시간 업데이트

### CommentFeeDistributed

댓글 작성 비용이 펀딩자에게 분배될 때 발생하는 이벤트입니다.

```solidity
event CommentFeeDistributed(
    uint256 indexed gameId,
    address indexed funder,
    uint256 amount
);
```

**활용**: 펀딩자 수익 추적

### PrizeClaimed

우승자가 상금을 수령할 때 발생하는 이벤트입니다.

```solidity
event PrizeClaimed(
    uint256 indexed gameId,
    address indexed winner,
    uint256 prizeAmount,
    uint256 timestamp
);
```

**활용**: 게임 종료 및 상금 수령 완료 알림

---

## State-Changing 함수

### createGame

게임을 생성하고 초기 펀딩을 받습니다.

```solidity
function createGame(
    address _gameToken,
    uint256 _time,
    uint256 _cost,
    uint256 _initialFunding
) external nonReentrant returns (uint256)
```

**파라미터**:
- `_gameToken`: 게임에 사용할 ERC20 토큰 주소
- `_time`: 게임 시간 (초)
- `_cost`: 댓글 작성 비용 (토큰 단위)
- `_initialFunding`: 초기 펀딩 금액 (0 가능)

**반환값**: 생성된 게임 ID

**요구사항**:
- 같은 토큰에 활성 게임이 없어야 함
- 토큰 승인 (`approve`)이 필요함 (초기 펀딩이 있는 경우)

**가스 비용**: 중간 (게임 생성 + 토큰 전송)

---

### fundPrizePool

상금 풀에 추가 펀딩을 합니다.

```solidity
function fundPrizePool(uint256 _gameId, uint256 _amount) external nonReentrant
```

**파라미터**:
- `_gameId`: 게임 ID
- `_amount`: 펀딩할 금액

**요구사항**:
- 게임이 존재해야 함
- 게임이 종료되지 않아야 함
- `_amount > 0`
- 토큰 승인 (`approve`)이 필요함

**가스 비용**: 낮음 (토큰 전송만)

---

### addComment

게임에 댓글을 등록하고 참가비를 지불합니다.

```solidity
function addComment(uint256 _gameId, string memory _message) external nonReentrant
```

**파라미터**:
- `_gameId`: 게임 ID
- `_message`: 댓글 내용

**동작**:
1. 참가비 (`game.cost`) 지불
2. 플랫폼 수수료 2% 차감 후 fee collector에게 전송
3. 나머지 98%를 펀딩 비율에 따라 펀딩자들에게 즉시 분배
4. `lastCommentor` 업데이트
5. `endTime`을 현재 시간 + `gameTime`으로 연장

**요구사항**:
- 게임이 존재해야 함
- 게임이 종료되지 않아야 함
- 펀딩자가 있어야 함
- 토큰 승인 (`approve`)이 필요함
- 토큰 잔액이 충분해야 함

**가스 비용**: 높음 (토큰 전송 + 루프를 통한 분배)

---

### claimPrize

게임 종료 후 우승자가 펀딩된 상금 풀을 수령합니다.

```solidity
function claimPrize(uint256 _gameId) external nonReentrant
```

**파라미터**:
- `_gameId`: 게임 ID

**요구사항**:
- 게임이 존재해야 함
- 게임이 종료되어야 함 (`block.timestamp >= endTime`)
- 호출자가 마지막 댓글 작성자여야 함
- 상금이 아직 수령되지 않아야 함 (`!isClaimed`)
- 상금 풀이 0보다 커야 함

**가스 비용**: 낮음 (토큰 전송만)

---

### setFeeCollector

fee collector 주소를 변경합니다. (Owner만 호출 가능)

```solidity
function setFeeCollector(address _newCollector) external onlyOwner
```

**파라미터**:
- `_newCollector`: 새로운 fee collector 주소

**요구사항**:
- 호출자가 컨트랙트 소유자여야 함

---

## View 함수

### isEnded

게임 종료 여부를 확인합니다.

```solidity
function isEnded(uint256 _gameId) external view returns (bool)
```

**파라미터**:
- `_gameId`: 게임 ID

**반환값**: 게임이 종료되었으면 `true`, 아니면 `false`

**활용**:
- 게임 상태 표시
- 상금 수령 버튼 활성화/비활성화
- 게임 목록 필터링

---

### getFunders

특정 게임의 펀딩자 목록을 반환합니다.

```solidity
function getFunders(uint256 _gameId) external view returns (address[] memory)
```

**파라미터**:
- `_gameId`: 게임 ID

**반환값**: 펀딩자 주소 배열

**활용**:
- 펀딩자 목록 표시
- 펀딩 비율 계산 (추가 조회 필요)

**참고**: 각 펀딩자의 펀딩 금액을 확인하려면 `games[_gameId].fundings[address]`를 직접 조회해야 합니다. (public mapping)

---

### getGameInfo

특정 게임의 전체 정보를 반환합니다.

```solidity
function getGameInfo(uint256 _gameId) external view returns (GameInfo memory)
```

**파라미터**:
- `_gameId`: 게임 ID

**반환값**: `GameInfo` 구조체

**활용**:
- 게임 상세 페이지
- 게임 카드 표시
- 게임 상태 확인

**예시 사용**:
```typescript
const gameInfo = await contract.read.getGameInfo([gameId]);
console.log(`게임 ID: ${gameInfo.id}`);
console.log(`토큰: ${gameInfo.tokenSymbol}`);
console.log(`상금 풀: ${gameInfo.prizePool}`);
console.log(`종료 여부: ${gameInfo.isEnded}`);
console.log(`우승자: ${gameInfo.lastCommentor}`);
```

---

### getActiveGameId

토큰 주소로 활성 게임 ID를 조회합니다.

```solidity
function getActiveGameId(address _token) external view returns (uint256)
```

**파라미터**:
- `_token`: 토큰 주소

**반환값**: 활성 게임 ID (없으면 `0`)

**활용**:
- 특정 토큰의 현재 진행 중인 게임 찾기
- 새 게임 생성 전 활성 게임 확인

**예시 사용**:
```typescript
const activeGameId = await contract.read.getActiveGameId([tokenAddress]);
if (activeGameId === 0n) {
    // 활성 게임 없음, 새 게임 생성 가능
} else {
    // 활성 게임 있음, 해당 게임 정보 조회
    const gameInfo = await contract.read.getGameInfo([activeGameId]);
}
```

---

### getAllGameIds

모든 게임 ID 목록을 반환합니다.

```solidity
function getAllGameIds() external view returns (uint256[] memory)
```

**반환값**: 모든 게임 ID 배열

**활용**:
- 전체 게임 목록 가져오기
- 리더보드 데이터 수집

**주의**: 게임이 많을 경우 가스 비용이 높을 수 있습니다. 이벤트를 활용한 인덱싱을 권장합니다.

---

### getAllGames

모든 게임의 정보를 반환합니다.

```solidity
function getAllGames() external view returns (GameInfo[] memory)
```

**반환값**: 모든 게임 정보 배열 (`GameInfo[]`)

**활용**:
- 전체 게임 목록 표시
- 리더보드 데이터 수집
- 통계 데이터 수집

**주의**: 
- 게임이 많을 경우 가스 비용이 매우 높을 수 있습니다.
- 프론트엔드에서 필터링 및 정렬을 수행해야 합니다.

**예시 사용**:
```typescript
const allGames = await contract.read.getAllGames();

// 진행 중인 게임만 필터링
const activeGames = allGames.filter(game => !game.isEnded);

// 상금 풀 순으로 정렬
const sortedByPrize = allGames.sort((a, b) => 
    Number(b.prizePool - a.prizePool)
);
```

---

## 프론트엔드 활용 가이드

### 게임 종료 확인

게임이 종료되었는지 확인하는 방법:

```typescript
// 방법 1: isEnded 함수 사용
const ended = await contract.read.isEnded([gameId]);

// 방법 2: getGameInfo 사용
const gameInfo = await contract.read.getGameInfo([gameId]);
const ended = gameInfo.isEnded; // 또는 block.timestamp >= gameInfo.endTime
```

### 우승자 클레임 방법

우승자가 상금을 수령하는 방법:

```typescript
// 1. 게임 정보 조회
const gameInfo = await contract.read.getGameInfo([gameId]);

// 2. 게임 종료 확인
if (!gameInfo.isEnded) {
    throw new Error("게임이 아직 종료되지 않았습니다.");
}

// 3. 우승자 확인
const userAddress = await walletClient.getAddresses()[0];
if (gameInfo.lastCommentor.toLowerCase() !== userAddress.toLowerCase()) {
    throw new Error("우승자가 아닙니다.");
}

// 4. 이미 수령했는지 확인
if (gameInfo.isClaimed) {
    throw new Error("이미 상금을 수령했습니다.");
}

// 5. 상금 풀 확인
if (gameInfo.prizePool === 0n) {
    throw new Error("수령할 상금이 없습니다.");
}

// 6. 클레임 실행
const hash = await contract.write.claimPrize([gameId]);
await publicClient.waitForTransactionReceipt({ hash });
```

### 댓글 작성 방법

```typescript
// 1. 게임 정보 조회
const gameInfo = await contract.read.getGameInfo([gameId]);

// 2. 게임 종료 확인
if (gameInfo.isEnded) {
    throw new Error("게임이 이미 종료되었습니다.");
}

// 3. 토큰 승인 확인 및 승인
const tokenContract = await getContract({
    address: gameInfo.gameToken,
    abi: erc20Abi,
    client: walletClient
});

const allowance = await tokenContract.read.allowance([
    userAddress,
    gameContractAddress
]);

if (allowance < gameInfo.cost) {
    // 승인 필요
    const approveHash = await tokenContract.write.approve([
        gameContractAddress,
        gameInfo.cost
    ]);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
}

// 4. 댓글 작성
const hash = await contract.write.addComment([gameId, message]);
await publicClient.waitForTransactionReceipt({ hash });
```

### 펀딩 방법

```typescript
// 1. 게임 정보 조회
const gameInfo = await contract.read.getGameInfo([gameId]);

// 2. 게임 종료 확인
if (gameInfo.isEnded) {
    throw new Error("게임이 이미 종료되었습니다.");
}

// 3. 토큰 승인
const tokenContract = await getContract({
    address: gameInfo.gameToken,
    abi: erc20Abi,
    client: walletClient
});

const approveHash = await tokenContract.write.approve([
    gameContractAddress,
    amount
]);
await publicClient.waitForTransactionReceipt({ hash: approveHash });

// 4. 펀딩
const hash = await contract.write.fundPrizePool([gameId, amount]);
await publicClient.waitForTransactionReceipt({ hash });
```

---

## 리더보드 구현 가이드

### 1. 진행 중인 게임 상금 풀 랭킹

**목적**: 현재 진행 중인 게임들을 상금 풀 크기 순으로 정렬

**구현 방법**:

```typescript
// 모든 게임 정보 가져오기
const allGames = await contract.read.getAllGames();

// 진행 중인 게임만 필터링
const activeGames = allGames.filter(game => !game.isEnded);

// 상금 풀 순으로 정렬 (내림차순)
const rankedByPrize = activeGames.sort((a, b) => {
    if (b.prizePool > a.prizePool) return 1;
    if (b.prizePool < a.prizePool) return -1;
    return 0;
});

// 상위 N개만 선택
const topGames = rankedByPrize.slice(0, 10);
```

**데이터 구조**:
```typescript
interface PrizeRanking {
    rank: number;
    gameId: bigint;
    tokenSymbol: string;
    prizePool: bigint;
    endTime: bigint;
    funderCount: bigint;
}
```

**최적화 팁**:
- 이벤트 리스너로 실시간 업데이트
- 캐싱 활용 (예: 30초마다 갱신)
- 페이지네이션 적용

---

### 2. 댓글 많이 단 게임 랭킹

**목적**: 댓글이 많이 작성된 게임 순위

**구현 방법**:

댓글 수는 컨트랙트에 직접 저장되지 않으므로, 이벤트를 활용해야 합니다.

**방법 1: 이벤트 기반 (권장)**

```typescript
// CommentAdded 이벤트 필터링
const commentCounts: Record<string, number> = {};

// 모든 CommentAdded 이벤트 조회
const events = await publicClient.getLogs({
    address: gameContractAddress,
    event: parseAbiEvent([
        "event CommentAdded(uint256 indexed gameId, address indexed commentor, string message, uint256 newEndTime, uint256 timestamp)"
    ]),
    fromBlock: 0n, // 또는 컨트랙트 배포 블록
});

// 게임별 댓글 수 카운팅
events.forEach(event => {
    const gameId = event.args.gameId.toString();
    commentCounts[gameId] = (commentCounts[gameId] || 0) + 1;
});

// 모든 게임 정보 가져오기
const allGames = await contract.read.getAllGames();

// 댓글 수 추가
const gamesWithComments = allGames.map(game => ({
    ...game,
    commentCount: commentCounts[game.id.toString()] || 0
}));

// 댓글 수 순으로 정렬
const rankedByComments = gamesWithComments.sort((a, b) => 
    b.commentCount - a.commentCount
);
```

**방법 2: 백엔드 인덱싱 (더 효율적)**

백엔드에서 `CommentAdded` 이벤트를 리스닝하여 데이터베이스에 댓글 수를 저장하고, API로 제공하는 방법이 더 효율적입니다.

```typescript
// 백엔드 API 호출
const response = await fetch('/api/games/ranked-by-comments');
const rankedGames = await response.json();
```

**데이터 구조**:
```typescript
interface CommentRanking {
    rank: number;
    gameId: bigint;
    tokenSymbol: string;
    commentCount: number;
    prizePool: bigint;
    isEnded: boolean;
}
```

---

### 3. 역대 상금 풀 순위 게임

**목적**: 종료된 게임 중 상금 풀이 가장 컸던 게임 순위

**구현 방법**:

```typescript
// 모든 게임 정보 가져오기
const allGames = await contract.read.getAllGames();

// 종료된 게임만 필터링
const endedGames = allGames.filter(game => game.isEnded);

// totalFunding 순으로 정렬 (역대 최대 펀딩 금액)
const rankedByTotalFunding = endedGames.sort((a, b) => {
    if (b.totalFunding > a.totalFunding) return 1;
    if (b.totalFunding < a.totalFunding) return -1;
    return 0;
});

// 상위 N개만 선택
const topGames = rankedByTotalFunding.slice(0, 10);
```

**참고**: 
- `prizePool`은 클레임 후 0이 되므로, `totalFunding`을 사용하는 것이 더 정확합니다.
- 클레임 전 `prizePool`을 추적하려면 이벤트를 활용해야 합니다.

**데이터 구조**:
```typescript
interface HistoricalRanking {
    rank: number;
    gameId: bigint;
    tokenSymbol: string;
    totalFunding: bigint;
    prizePool: bigint; // 클레임 전 값 (이벤트에서 추적)
    winner: string;
    isClaimed: boolean;
    endTime: bigint;
}
```

---

### 4. 종합 리더보드 예시

여러 기준을 조합한 리더보드:

```typescript
interface LeaderboardEntry {
    gameId: bigint;
    tokenSymbol: string;
    prizePool: bigint;
    totalFunding: bigint;
    commentCount: number;
    funderCount: bigint;
    isEnded: boolean;
    endTime: bigint;
    winner?: string;
}

async function getComprehensiveLeaderboard() {
    // 1. 모든 게임 정보 가져오기
    const allGames = await contract.read.getAllGames();
    
    // 2. 댓글 수 가져오기 (이벤트 또는 백엔드 API)
    const commentCounts = await getCommentCounts(); // 이벤트 기반 또는 API
    
    // 3. 데이터 조합
    const leaderboard: LeaderboardEntry[] = allGames.map(game => ({
        gameId: game.id,
        tokenSymbol: game.tokenSymbol,
        prizePool: game.prizePool,
        totalFunding: game.totalFunding,
        commentCount: commentCounts[game.id.toString()] || 0,
        funderCount: game.funderCount,
        isEnded: game.isEnded,
        endTime: game.endTime,
        winner: game.isEnded ? game.lastCommentor : undefined
    }));
    
    // 4. 다양한 정렬 옵션
    return {
        byPrizePool: [...leaderboard].sort((a, b) => 
            Number(b.prizePool - a.prizePool)
        ),
        byComments: [...leaderboard].sort((a, b) => 
            b.commentCount - a.commentCount
        ),
        byTotalFunding: [...leaderboard].sort((a, b) => 
            Number(b.totalFunding - a.totalFunding)
        ),
        activeOnly: leaderboard.filter(g => !g.isEnded),
        endedOnly: leaderboard.filter(g => g.isEnded)
    };
}
```

---

## 최적화 팁

### 1. 이벤트 리스너 활용

실시간 업데이트를 위해 이벤트 리스너를 사용하세요:

```typescript
// CommentAdded 이벤트 리스닝
const unwatch = publicClient.watchContractEvent({
    address: gameContractAddress,
    abi: gameContractAbi,
    eventName: 'CommentAdded',
    onLogs: (logs) => {
        // 댓글 수 업데이트
        updateCommentCount(logs[0].args.gameId);
        // 게임 정보 갱신
        refreshGameInfo(logs[0].args.gameId);
    }
});
```

### 2. 캐싱 전략

- 게임 정보는 자주 변경되지 않으므로 캐싱 활용
- TTL: 30초 ~ 1분
- 이벤트 발생 시 즉시 갱신

### 3. 페이지네이션

게임이 많을 경우 페이지네이션 적용:

```typescript
function getGamesPaginated(
    games: GameInfo[],
    page: number,
    pageSize: number
) {
    const start = page * pageSize;
    const end = start + pageSize;
    return games.slice(start, end);
}
```

### 4. 백엔드 인덱싱

대규모 데이터 처리는 백엔드에서 수행:

- 이벤트 리스닝 및 DB 저장
- 댓글 수, 통계 데이터 사전 계산
- API로 제공

---

## 가스 비용 고려사항

### View 함수 가스 비용

| 함수 | 가스 비용 | 비고 |
|------|----------|------|
| `isEnded` | 매우 낮음 | 단일 조회 |
| `getGameInfo` | 낮음 | 구조체 반환 |
| `getAllGameIds` | 중간 | 배열 반환 |
| `getAllGames` | 높음 | 모든 게임 정보 반환 |

### 최적화 권장사항

1. **필요한 데이터만 조회**: `getAllGames()` 대신 필요한 게임만 개별 조회
2. **이벤트 활용**: 댓글 수 등은 이벤트로 추적
3. **백엔드 캐싱**: 자주 조회하는 데이터는 백엔드에서 캐싱

---

## 보안 고려사항

### 1. 입력 검증

프론트엔드에서도 입력 검증을 수행하세요:

```typescript
// 게임 ID 검증
if (gameId <= 0) {
    throw new Error("유효하지 않은 게임 ID입니다.");
}

// 금액 검증
if (amount <= 0) {
    throw new Error("금액은 0보다 커야 합니다.");
}
```

### 2. 트랜잭션 확인

트랜잭션 전에 상태를 확인하세요:

```typescript
// 댓글 작성 전 확인
const gameInfo = await contract.read.getGameInfo([gameId]);
if (gameInfo.isEnded) {
    throw new Error("게임이 이미 종료되었습니다.");
}
```

### 3. 에러 처리

모든 컨트랙트 호출에 에러 처리를 추가하세요:

```typescript
try {
    const hash = await contract.write.addComment([gameId, message]);
    await publicClient.waitForTransactionReceipt({ hash });
} catch (error: any) {
    if (error.message.includes("Game already ended")) {
        // 게임 종료 에러 처리
    } else if (error.message.includes("ERC20")) {
        // 토큰 관련 에러 처리
    }
}
```

---

## 결론

`CommentGameV2` 컨트랙트는 다양한 View 함수를 제공하여 프론트엔드에서 리더보드와 게임 정보를 효율적으로 조회할 수 있습니다. 

**주요 활용 포인트**:
- `getAllGames()`: 전체 게임 정보 조회
- `isEnded()`: 게임 종료 여부 확인
- `getGameInfo()`: 개별 게임 상세 정보
- 이벤트 리스너: 실시간 업데이트
- 백엔드 인덱싱: 대규모 데이터 처리

리더보드 구현 시 이벤트 기반 데이터 수집과 백엔드 캐싱을 활용하면 더 효율적인 시스템을 구축할 수 있습니다.

