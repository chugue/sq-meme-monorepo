/**
 * CommentGame 컨트랙트 ABI
 *
 * 소스: contracts/contracts/CommentGame.sol
 */

export const commentGameABI = [
    // 댓글 작성
    {
        inputs: [{ internalType: 'string', name: '_message', type: 'string' }],
        name: 'addComment',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    // 상금 수령
    {
        inputs: [],
        name: 'claimPrize',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    // 참가비 조회
    {
        inputs: [],
        name: 'cost',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 게임 토큰 주소 조회
    {
        inputs: [],
        name: 'gameToken',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 게임 시간 조회
    {
        inputs: [],
        name: 'gameTime',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 종료 시간 조회
    {
        inputs: [],
        name: 'endTime',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 상금풀 조회
    {
        inputs: [],
        name: 'prizePool',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 마지막 댓글 작성자 조회
    {
        inputs: [],
        name: 'lastCommentor',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 상금 수령 여부 조회
    {
        inputs: [],
        name: 'isClaimed',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 게임 ID 조회
    {
        inputs: [],
        name: 'id',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 게임 생성자 조회
    {
        inputs: [],
        name: 'initiator',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
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
    // CommentAdded 이벤트
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: 'address', name: 'commentor', type: 'address' },
            { indexed: false, internalType: 'string', name: 'message', type: 'string' },
            { indexed: false, internalType: 'uint256', name: 'newEndTime', type: 'uint256' },
            { indexed: false, internalType: 'uint256', name: 'prizePool', type: 'uint256' },
            { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        ],
        name: 'CommentAdded',
        type: 'event',
    },
] as const;
