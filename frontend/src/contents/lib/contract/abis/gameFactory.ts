/**
 * GameFactory 컨트랙트 ABI
 *
 * 소스: contracts/contracts/GameFactory.sol
 */

export const gameFactoryABI = [
    // 게임 생성
    {
        inputs: [
            { internalType: 'address', name: '_gameToken', type: 'address' },
            { internalType: 'uint256', name: '_time', type: 'uint256' },
            { internalType: 'uint256', name: '_cost', type: 'uint256' },
        ],
        name: 'createGame',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    // 배포된 게임 목록
    {
        inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        name: 'deployedGames',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 게임 카운트
    {
        inputs: [],
        name: 'gameCount',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    // 토큰별 게임 조회 (반환: GameInfo 구조체)
    {
        inputs: [{ internalType: 'address', name: '', type: 'address' }],
        name: 'gameByToken',
        outputs: [
            { internalType: 'address', name: 'gameAddress', type: 'address' },
            { internalType: 'string', name: 'tokenSymbol', type: 'string' },
            { internalType: 'string', name: 'tokenName', type: 'string' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    // GameCreated 이벤트
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: 'uint256', name: 'gameId', type: 'uint256' },
            { indexed: true, internalType: 'address', name: 'gameAddr', type: 'address' },
            { indexed: true, internalType: 'address', name: 'gameTokenAddr', type: 'address' },
            { indexed: false, internalType: 'string', name: 'tokenSymbol', type: 'string' },
            { indexed: false, internalType: 'string', name: 'tokenName', type: 'string' },
            { indexed: false, internalType: 'address', name: 'initiator', type: 'address' },
            { indexed: false, internalType: 'uint256', name: 'gameTime', type: 'uint256' },
            { indexed: false, internalType: 'uint256', name: 'endTime', type: 'uint256' },
            { indexed: false, internalType: 'uint256', name: 'cost', type: 'uint256' },
            { indexed: false, internalType: 'uint256', name: 'prizePool', type: 'uint256' },
            { indexed: false, internalType: 'address', name: 'lastCommentor', type: 'address' },
            { indexed: false, internalType: 'bool', name: 'isEnded', type: 'bool' },
        ],
        name: 'GameCreated',
        type: 'event',
    },
] as const;

// GameFactory 컨트랙트 주소 (환경변수 사용)
export const GAME_FACTORY_ADDRESS = import.meta.env.VITE_GAME_FACTORY_ADDRESS || '0xe5115025d3e7f171372aade2214188b4ba5f6da9';
