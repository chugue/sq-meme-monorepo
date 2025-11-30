/**
 * CommentGame 컨트랙트 상호작용 훅
 *
 * - addComment: 댓글 작성 (컨트랙트 트랜잭션)
 * - 게임 정보 조회 (prizePool, endTime, isEnded 등)
 */

import { useCallback, useMemo, useState } from 'react';
import type { Address } from 'viem';
import { commentGameABI } from '../lib/contract/abis/commentGame';
import { createContractClient } from '../lib/contract/contractClient';
import { logger } from '../lib/injected/logger';

export interface UseCommentContractReturn {
    // 댓글 작성
    addComment: (message: string) => Promise<string>;
    // 게임 정보 조회
    getGameInfo: () => Promise<GameInfo>;
    // 상태
    isSubmitting: boolean;
    error: string | null;
}

export interface GameInfo {
    prizePool: bigint;
    endTime: bigint;
    isEnded: boolean;
    lastCommentor: Address;
    cost: bigint;
    gameToken: Address;
}

/**
 * CommentGame 컨트랙트 훅
 * @param gameAddress CommentGame 컨트랙트 주소
 * @param userAddress 사용자 지갑 주소
 */
export function useCommentContract(
    gameAddress: Address | null,
    userAddress: Address | null
): UseCommentContractReturn {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 컨트랙트 클라이언트 생성
    const contractClient = useMemo(() => {
        if (!gameAddress) return null;

        return createContractClient({
            address: gameAddress,
            abi: commentGameABI,
        });
    }, [gameAddress]);

    /**
     * 댓글 작성 (컨트랙트 addComment 호출)
     * @param message 댓글 내용
     * @returns 트랜잭션 해시
     */
    const addComment = useCallback(
        async (message: string): Promise<string> => {
            if (!contractClient) {
                throw new Error('게임 주소가 설정되지 않았습니다.');
            }
            if (!userAddress) {
                throw new Error('지갑이 연결되지 않았습니다.');
            }
            if (!message.trim()) {
                throw new Error('댓글 내용을 입력해주세요.');
            }

            setIsSubmitting(true);
            setError(null);

            try {
                logger.info('댓글 작성 시작', {
                    gameAddress,
                    userAddress,
                    messageLength: message.length,
                });

                const result = await contractClient.write(
                    {
                        functionName: 'addComment',
                        args: [message],
                    },
                    userAddress
                );

                logger.info('댓글 작성 트랜잭션 전송 완료', {
                    hash: result.hash,
                });

                return result.hash;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : '댓글 작성 실패';
                logger.error('댓글 작성 실패', err);
                setError(errorMessage);
                throw err;
            } finally {
                setIsSubmitting(false);
            }
        },
        [contractClient, userAddress, gameAddress]
    );

    /**
     * 게임 정보 조회
     */
    const getGameInfo = useCallback(async (): Promise<GameInfo> => {
        if (!contractClient) {
            throw new Error('게임 주소가 설정되지 않았습니다.');
        }

        try {
            const [prizePool, endTime, isEnded, lastCommentor, cost, gameToken] = await Promise.all([
                contractClient.read<bigint>({ functionName: 'prizePool' }),
                contractClient.read<bigint>({ functionName: 'endTime' }),
                contractClient.read<boolean>({ functionName: 'isEnded' }),
                contractClient.read<Address>({ functionName: 'lastCommentor' }),
                contractClient.read<bigint>({ functionName: 'cost' }),
                contractClient.read<Address>({ functionName: 'gameToken' }),
            ]);

            return {
                prizePool: prizePool.data,
                endTime: endTime.data,
                isEnded: isEnded.data,
                lastCommentor: lastCommentor.data,
                cost: cost.data,
                gameToken: gameToken.data,
            };
        } catch (err) {
            logger.error('게임 정보 조회 실패', err);
            throw err;
        }
    }, [contractClient]);

    return {
        addComment,
        getGameInfo,
        isSubmitting,
        error,
    };
}
