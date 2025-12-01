/**
 * 컨트랙트 이벤트 로그 파싱 유틸리티
 */

import { decodeEventLog } from 'viem';
import type { Address } from 'viem';
import type { TransactionLog } from '../injectedApi';
import { commentGameABI } from './abis/commentGame';
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
