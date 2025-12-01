/**
 * CommentGame 컨트랙트 상호작용 훅
 *
 * - addComment: 댓글 작성 (컨트랙트 트랜잭션)
 * - 게임 정보 조회 (prizePool, endTime, isClaimed 등)
 * - ERC20 approve/allowance 관리
 *
 * 참고: 컨트랙트에 isEnded 함수 없음, blockTimestamp >= endTime으로 게임 종료 판단
 */

import { useCallback, useMemo, useState } from 'react';
import type { Address } from 'viem';
import { backendApi, type CreateCommentRequest } from '../lib/api/backendApi';
import { commentGameABI } from '../lib/contract/abis/commentGame';
import { erc20ABI } from '../lib/contract/abis/erc20';
import { createContractClient } from '../lib/contract/contractClient';
import { parseCommentAddedEvent } from '../lib/contract/eventParser';
import { logger } from '../lib/injected/logger';
import { injectedApi } from '../lib/injectedApi';

export interface UseCommentContractReturn {
    // 댓글 작성
    addComment: (message: string) => Promise<string>;
    // 게임 정보 조회
    getGameInfo: () => Promise<GameInfo>;
    // ERC20 관련
    checkAllowance: () => Promise<bigint>;
    getTokenBalance: () => Promise<bigint>;
    approveToken: (amount?: bigint) => Promise<string>;
    ensureAllowance: (requiredAmount: bigint) => Promise<void>;
    // 상태
    isSubmitting: boolean;
    isApproving: boolean;
    error: string | null;
}

export interface GameInfo {
    prizePool: bigint;
    endTime: bigint;
    isClaimed: boolean;
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
    const [isApproving, setIsApproving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gameToken, setGameToken] = useState<Address | null>(null);

    // CommentGame 컨트랙트 클라이언트 생성
    const contractClient = useMemo(() => {
        if (!gameAddress) return null;

        return createContractClient({
            address: gameAddress,
            abi: commentGameABI,
        });
    }, [gameAddress]);

    // ERC20 토큰 컨트랙트 클라이언트 생성
    const tokenClient = useMemo(() => {
        if (!gameToken) return null;

        return createContractClient({
            address: gameToken,
            abi: erc20ABI,
        });
    }, [gameToken]);

    /**
     * 댓글 작성 (컨트랙트 addComment 호출)
     * - 트랜잭션 전송 → 확정 대기 → 이벤트 파싱 → 백엔드 API 호출
     * @param message 댓글 내용
     * @returns 트랜잭션 해시
     */
    const addComment = useCallback(
        async (message: string): Promise<string> => {
            if (!contractClient || !gameAddress) {
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

                // 1. 트랜잭션 전송
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

                // 2. 트랜잭션 확정 대기
                const receipt = await injectedApi.waitForTransaction(result.hash);

                logger.info('댓글 트랜잭션 확정됨', {
                    hash: result.hash,
                    blockNumber: receipt.blockNumber,
                    logsCount: receipt.logs.length,
                });

                // 3. CommentAdded 이벤트 파싱
                const eventData = parseCommentAddedEvent(receipt.logs, gameAddress);

                if (!eventData) {
                    logger.warn('CommentAdded 이벤트를 찾을 수 없음', {
                        hash: result.hash,
                    });
                    // 이벤트가 없어도 트랜잭션은 성공했으므로 해시 반환
                    return result.hash;
                }

                logger.info('CommentAdded 이벤트 파싱 완료', {
                    commentor: eventData.commentor,
                    newEndTime: eventData.newEndTime.toString(),
                    prizePool: eventData.prizePool.toString(),
                });

                // 4. 백엔드 API 호출
                const apiRequest: CreateCommentRequest = {
                    txHash: result.hash,
                    gameAddress: gameAddress,
                    commentor: eventData.commentor,
                    message: eventData.message,
                    newEndTime: eventData.newEndTime.toString(),
                    prizePool: eventData.prizePool.toString(),
                    timestamp: eventData.timestamp.toString(),
                };

                const apiResponse = await backendApi.saveComment(apiRequest);

                if (apiResponse.success) {
                    logger.info('백엔드에 댓글 저장 완료', {
                        commentId: apiResponse.data?.id,
                    });
                } else {
                    // 백엔드 저장 실패해도 트랜잭션은 성공했으므로 경고만 출력
                    logger.warn('백엔드 댓글 저장 실패', {
                        error: apiResponse.errorMessage,
                    });
                }

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
            const [prizePool, endTime, isClaimed, lastCommentor, cost, gameTokenResult] = await Promise.all([
                contractClient.read<bigint>({ functionName: 'prizePool' }),
                contractClient.read<bigint>({ functionName: 'endTime' }),
                contractClient.read<boolean>({ functionName: 'isClaimed' }),
                contractClient.read<Address>({ functionName: 'lastCommentor' }),
                contractClient.read<bigint>({ functionName: 'cost' }),
                contractClient.read<Address>({ functionName: 'gameToken' }),
            ]);

            // 토큰 주소 저장 (ERC20 클라이언트 생성용)
            setGameToken(gameTokenResult.data);

            return {
                prizePool: prizePool.data,
                endTime: endTime.data,
                isClaimed: isClaimed.data,
                lastCommentor: lastCommentor.data,
                cost: cost.data,
                gameToken: gameTokenResult.data,
            };
        } catch (err) {
            logger.error('게임 정보 조회 실패', err);
            throw err;
        }
    }, [contractClient]);

    /**
     * ERC20 allowance 조회
     * @returns 현재 allowance 양
     */
    const checkAllowance = useCallback(async (): Promise<bigint> => {
        if (!tokenClient) {
            throw new Error('토큰 정보가 없습니다. 먼저 getGameInfo를 호출하세요.');
        }
        if (!userAddress || !gameAddress) {
            throw new Error('지갑 또는 게임 주소가 설정되지 않았습니다.');
        }

        try {
            const result = await tokenClient.read<bigint>({
                functionName: 'allowance',
                args: [userAddress, gameAddress],
            });
            return result.data;
        } catch (err) {
            logger.error('Allowance 조회 실패', err);
            throw err;
        }
    }, [tokenClient, userAddress, gameAddress]);

    /**
     * 사용자의 토큰 잔액 조회
     * @returns 토큰 잔액
     */
    const getTokenBalance = useCallback(async (): Promise<bigint> => {
        if (!tokenClient) {
            throw new Error('토큰 정보가 없습니다. 먼저 getGameInfo를 호출하세요.');
        }
        if (!userAddress) {
            throw new Error('지갑이 연결되지 않았습니다.');
        }

        try {
            const result = await tokenClient.read<bigint>({
                functionName: 'balanceOf',
                args: [userAddress],
            });
            return result.data;
        } catch (err) {
            logger.error('토큰 잔액 조회 실패', err);
            throw err;
        }
    }, [tokenClient, userAddress]);

    /**
     * ERC20 approve 실행 (잔액 기반)
     * @param amount approve할 금액 (미지정 시 잔액 전체 또는 cost*10 중 작은 값)
     * @returns 트랜잭션 해시
     */
    const approveToken = useCallback(
        async (amount?: bigint): Promise<string> => {
            if (!tokenClient) {
                throw new Error('토큰 정보가 없습니다. 먼저 getGameInfo를 호출하세요.');
            }
            if (!userAddress || !gameAddress) {
                throw new Error('지갑 또는 게임 주소가 설정되지 않았습니다.');
            }

            setIsApproving(true);
            setError(null);

            try {
                // amount가 지정되지 않으면 잔액 기반으로 계산
                let approveAmount = amount;
                if (!approveAmount) {
                    const balance = await getTokenBalance();
                    approveAmount = balance;
                    logger.info('잔액 기반 approve 금액 계산', {
                        balance: balance.toString(),
                        approveAmount: approveAmount.toString(),
                    });
                }

                logger.info('토큰 approve 시작', {
                    gameAddress,
                    userAddress,
                    amount: approveAmount.toString(),
                });

                const result = await tokenClient.write(
                    {
                        functionName: 'approve',
                        args: [gameAddress, approveAmount],
                    },
                    userAddress
                );

                logger.info('토큰 approve 트랜잭션 전송 완료', {
                    hash: result.hash,
                });

                return result.hash;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : '토큰 승인 실패';
                logger.error('토큰 approve 실패', err);
                setError(errorMessage);
                throw err;
            } finally {
                setIsApproving(false);
            }
        },
        [tokenClient, userAddress, gameAddress, getTokenBalance]
    );

    /**
     * 필요한 allowance가 있는지 확인하고, 부족하면 approve 실행
     * @param requiredAmount 필요한 금액
     */
    const ensureAllowance = useCallback(
        async (requiredAmount: bigint): Promise<void> => {
            const currentAllowance = await checkAllowance();

            if (currentAllowance < requiredAmount) {
                logger.info('Allowance 부족, approve 실행', {
                    currentAllowance: currentAllowance.toString(),
                    requiredAmount: requiredAmount.toString(),
                });
                await approveToken();
            }
        },
        [checkAllowance, approveToken]
    );

    return {
        addComment,
        getGameInfo,
        checkAllowance,
        getTokenBalance,
        approveToken,
        ensureAllowance,
        isSubmitting,
        isApproving,
        error,
    };
}
