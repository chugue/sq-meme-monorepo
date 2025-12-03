/**
 * CommentGameV2 컨트랙트 ABI
 *
 * 단일 컨트랙트에서 모든 게임을 관리하는 V2 버전
 * 소스: contracts/contracts/CommentGameV2.sol
 */

// GameInfo 구조체 타입
export interface GameInfo {
    id: bigint;
    initiator: `0x${string}`;
    gameToken: `0x${string}`;
    cost: bigint;
    gameTime: bigint;
    tokenSymbol: string;
    endTime: bigint;
    lastCommentor: `0x${string}`;
    prizePool: bigint;
    isClaimed: boolean;
    isEnded: boolean;
    totalFunding: bigint;
    funderCount: bigint;
}

export const commentGameV2ABI = [
    // ============ State-Changing 함수 ============

    // 게임 생성
    {
        inputs: [
            { internalType: 'address', name: '_gameToken', type: 'address' },
            { internalType: 'uint256', name: '_time', type: 'uint256' },
            { internalType: 'uint256', name: '_cost', type: 'uint256' },
            { internalType: 'uint256', name: '_initialFunding', type: 'uint256' },
        ],
        name: 'createGame',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    // 상금 풀 펀딩
    {
        inputs: [
            { internalType: 'uint256', name: '_gameId', type: 'uint256' },
            { internalType: 'uint256', name: '_amount', type: 'uint256' },
        ],
        name: 'fundPrizePool',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    // 댓글 작성
    {
        inputs: [
            { internalType: 'uint256', name: '_gameId', type: 'uint256' },
            { internalType: 'string', name: '_message', type: 'string' },
        ],
        name: 'addComment',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    // 상금 수령
    {
        inputs: [{ internalType: 'uint256', name: '_gameId', type: 'uint256' }],
        name: 'claimPrize',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    // fee collector 변경 (Owner only)
    {
        inputs: [{ internalType: 'address', name: '_newCollector', type: 'address' }],
        name: 'setFeeCollector',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },

    // ============ View 함수 ============

    // 게임 종료 여부 확인
    {
        inputs: [{ internalType: 'uint256', name: '_gameId', type: 'uint256' }],
        name: 'isEnded',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 펀딩자 목록 조회
    {
        inputs: [{ internalType: 'uint256', name: '_gameId', type: 'uint256' }],
        name: 'getFunders',
        outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 게임 정보 조회
    {
        inputs: [{ internalType: 'uint256', name: '_gameId', type: 'uint256' }],
        name: 'getGameInfo',
        outputs: [
            {
                components: [
                    { internalType: 'uint256', name: 'id', type: 'uint256' },
                    { internalType: 'address', name: 'initiator', type: 'address' },
                    { internalType: 'address', name: 'gameToken', type: 'address' },
                    { internalType: 'uint256', name: 'cost', type: 'uint256' },
                    { internalType: 'uint256', name: 'gameTime', type: 'uint256' },
                    { internalType: 'string', name: 'tokenSymbol', type: 'string' },
                    { internalType: 'uint256', name: 'endTime', type: 'uint256' },
                    { internalType: 'address', name: 'lastCommentor', type: 'address' },
                    { internalType: 'uint256', name: 'prizePool', type: 'uint256' },
                    { internalType: 'bool', name: 'isClaimed', type: 'bool' },
                    { internalType: 'bool', name: 'isEnded', type: 'bool' },
                    { internalType: 'uint256', name: 'totalFunding', type: 'uint256' },
                    { internalType: 'uint256', name: 'funderCount', type: 'uint256' },
                ],
                internalType: 'struct CommentGameV2.GameInfo',
                name: '',
                type: 'tuple',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    // 토큰 주소로 활성 게임 ID 조회
    {
        inputs: [{ internalType: 'address', name: '_token', type: 'address' }],
        name: 'getActiveGameId',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 모든 게임 ID 목록 조회
    {
        inputs: [],
        name: 'getAllGameIds',
        outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 모든 게임 정보 조회
    {
        inputs: [],
        name: 'getAllGames',
        outputs: [
            {
                components: [
                    { internalType: 'uint256', name: 'id', type: 'uint256' },
                    { internalType: 'address', name: 'initiator', type: 'address' },
                    { internalType: 'address', name: 'gameToken', type: 'address' },
                    { internalType: 'uint256', name: 'cost', type: 'uint256' },
                    { internalType: 'uint256', name: 'gameTime', type: 'uint256' },
                    { internalType: 'string', name: 'tokenSymbol', type: 'string' },
                    { internalType: 'uint256', name: 'endTime', type: 'uint256' },
                    { internalType: 'address', name: 'lastCommentor', type: 'address' },
                    { internalType: 'uint256', name: 'prizePool', type: 'uint256' },
                    { internalType: 'bool', name: 'isClaimed', type: 'bool' },
                    { internalType: 'bool', name: 'isEnded', type: 'bool' },
                    { internalType: 'uint256', name: 'totalFunding', type: 'uint256' },
                    { internalType: 'uint256', name: 'funderCount', type: 'uint256' },
                ],
                internalType: 'struct CommentGameV2.GameInfo[]',
                name: '',
                type: 'tuple[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    // 플랫폼 수수료 조회
    {
        inputs: [],
        name: 'PLATFORM_FEE',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 수수료 수집자 주소 조회
    {
        inputs: [],
        name: 'feeCollector',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 게임 ID 카운터 조회
    {
        inputs: [],
        name: 'gameIdCounter',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },

    // ============ 이벤트 ============

    // 게임 생성 이벤트
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: 'uint256', name: 'gameId', type: 'uint256' },
            { indexed: true, internalType: 'address', name: 'initiator', type: 'address' },
            { indexed: true, internalType: 'address', name: 'gameToken', type: 'address' },
            { indexed: false, internalType: 'uint256', name: 'initialFunding', type: 'uint256' },
            { indexed: false, internalType: 'uint256', name: 'endTime', type: 'uint256' },
        ],
        name: 'GameCreated',
        type: 'event',
    },
    // 댓글 추가 이벤트
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: 'uint256', name: 'gameId', type: 'uint256' },
            { indexed: true, internalType: 'uint256', name: 'commentId', type: 'uint256' },
            { indexed: true, internalType: 'address', name: 'commentor', type: 'address' },
            { indexed: false, internalType: 'string', name: 'message', type: 'string' },
            { indexed: false, internalType: 'uint256', name: 'newEndTime', type: 'uint256' },
            { indexed: false, internalType: 'uint256', name: 'prizePool', type: 'uint256' },
            { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        ],
        name: 'CommentAdded',
        type: 'event',
    },
    // 게임별 댓글 ID 카운터 조회
    {
        inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        name: 'commentIdCounter',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 상금 풀 펀딩 이벤트
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: 'uint256', name: 'gameId', type: 'uint256' },
            { indexed: true, internalType: 'address', name: 'funder', type: 'address' },
            { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
            { indexed: false, internalType: 'uint256', name: 'totalFunding', type: 'uint256' },
        ],
        name: 'PrizePoolFunded',
        type: 'event',
    },
    // 댓글 수수료 분배 이벤트
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: 'uint256', name: 'gameId', type: 'uint256' },
            { indexed: true, internalType: 'address', name: 'funder', type: 'address' },
            { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'CommentFeeDistributed',
        type: 'event',
    },
    // 상금 수령 이벤트
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: 'uint256', name: 'gameId', type: 'uint256' },
            { indexed: true, internalType: 'address', name: 'winner', type: 'address' },
            { indexed: false, internalType: 'uint256', name: 'prizeAmount', type: 'uint256' },
            { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        ],
        name: 'PrizeClaimed',
        type: 'event',
    },
] as const;

// CommentGameV2 컨트랙트 주소 (환경변수 사용)
export const COMMENT_GAME_V2_ADDRESS = import.meta.env.VITE_COMMENT_GAME_V2_ADDRESS || '0x0000000000000000000000000000000000000000';
