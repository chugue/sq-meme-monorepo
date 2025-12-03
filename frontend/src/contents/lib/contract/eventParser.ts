/**
 * 컨트랙트 이벤트 로그 파싱 유틸리티
 */

import { decodeEventLog, encodeEventTopics } from 'viem';
import type { Address } from 'viem';
import type { TransactionLog } from '../injectedApi';
import { injectedApi } from '../injectedApi';
import { commentGameABI } from './abis/commentGame';
import { commentGameV2ABI, COMMENT_GAME_V2_ADDRESS } from './abis/commentGameV2';
import { gameFactoryABI } from './abis/gameFactory';

/**
 * CommentAdded 이벤트 데이터
 */
export interface CommentAddedEvent {
    commentor: Address;
    message: string;
    newEndTime: bigint;
    prizePool: bigint;
    timestamp: bigint;
}

/**
 * GameCreated 이벤트 데이터
 */
export interface GameCreatedEvent {
    gameId: bigint;
    gameAddr: Address;
    gameTokenAddr: Address;
    tokenSymbol: string;
    tokenName: string;
    initiator: Address;
    gameTime: bigint;
    endTime: bigint;
    cost: bigint;
    prizePool: bigint;
    lastCommentor: Address;
    isClaimed: boolean;
}

/**
 * 트랜잭션 로그에서 CommentAdded 이벤트 파싱
 */
export function parseCommentAddedEvent(
    logs: TransactionLog[],
    gameAddress: string
): CommentAddedEvent | null {
    const normalizedGameAddress = gameAddress.toLowerCase();

    for (const log of logs) {
        if (log.address.toLowerCase() !== normalizedGameAddress) {
            continue;
        }

        try {
            const decoded = decodeEventLog({
                abi: commentGameABI,
                data: log.data as `0x${string}`,
                topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
            });

            if (decoded.eventName === 'CommentAdded') {
                const args = decoded.args as unknown as CommentAddedEvent;
                return args;
            }
        } catch {
            // 다른 이벤트일 수 있으므로 무시
            continue;
        }
    }

    return null;
}

/**
 * 트랜잭션 로그에서 GameCreated 이벤트 파싱
 */
export function parseGameCreatedEvent(
    logs: TransactionLog[],
    factoryAddress: string
): GameCreatedEvent | null {
    const normalizedFactoryAddress = factoryAddress.toLowerCase();

    for (const log of logs) {
        if (log.address.toLowerCase() !== normalizedFactoryAddress) {
            continue;
        }

        try {
            const decoded = decodeEventLog({
                abi: gameFactoryABI,
                data: log.data as `0x${string}`,
                topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
            });

            if (decoded.eventName === 'GameCreated') {
                const args = decoded.args as unknown as GameCreatedEvent;
                return args;
            }
        } catch {
            // 다른 이벤트일 수 있으므로 무시
            continue;
        }
    }

    return null;
}

/**
 * CommentAddedV2 이벤트 데이터 (V2 컨트랙트용)
 */
export interface CommentAddedV2Event {
    gameId: bigint;
    commentId: bigint;
    commentor: Address;
    message: string;
    newEndTime: bigint;
    timestamp: bigint;
    transactionHash: string;
}

/**
 * 블록체인에서 CommentAdded 이벤트 조회 (V2 컨트랙트)
 * @param gameId 게임 ID
 * @param fromBlock 시작 블록 (기본값: 게임 생성 블록 또는 최근 10000블록)
 * @returns CommentAddedV2Event 배열
 */
export async function getCommentsFromBlockchain(
    gameId: string,
    fromBlock?: string
): Promise<CommentAddedV2Event[]> {
    const contractAddress = COMMENT_GAME_V2_ADDRESS;

    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
        console.warn('CommentGameV2 컨트랙트 주소가 설정되지 않았습니다.');
        return [];
    }

    // CommentAdded 이벤트 topic 생성
    // event CommentAdded(uint256 indexed gameId, address indexed commentor, string message, uint256 newEndTime, uint256 timestamp)
    const topics = encodeEventTopics({
        abi: commentGameV2ABI,
        eventName: 'CommentAdded',
        args: {
            gameId: BigInt(gameId),
        },
    });

    // 기본값: 최근 블록부터 조회 (RPC 제한 고려)
    const startBlock = fromBlock || '0x0';

    const logs = await injectedApi.getLogs({
        address: contractAddress,
        topics: topics as (string | null)[],
        fromBlock: startBlock,
        toBlock: 'latest',
    });

    // 로그 파싱
    const comments: CommentAddedV2Event[] = [];

    for (const log of logs) {
        try {
            const decoded = decodeEventLog({
                abi: commentGameV2ABI,
                data: log.data as `0x${string}`,
                topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
            });

            if (decoded.eventName === 'CommentAdded') {
                const args = decoded.args as {
                    gameId: bigint;
                    commentId: bigint;
                    commentor: Address;
                    message: string;
                    newEndTime: bigint;
                    timestamp: bigint;
                };

                comments.push({
                    gameId: args.gameId,
                    commentId: args.commentId,
                    commentor: args.commentor,
                    message: args.message,
                    newEndTime: args.newEndTime,
                    timestamp: args.timestamp,
                    transactionHash: log.transactionHash,
                });
            }
        } catch {
            // 파싱 실패한 로그는 무시
            continue;
        }
    }

    return comments;
}
