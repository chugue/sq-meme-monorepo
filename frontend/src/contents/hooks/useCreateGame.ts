/**
 * 게임 생성 전체 플로우 훅
 *
 * 1. approve - 토큰을 GameFactory에 승인
 * 2. createGame - GameFactory에서 게임 생성
 * 3. firstComment - 첫 댓글 작성 (토큰 승인 후 addComment 호출)
 */

import { useCallback, useState } from 'react';
import type { Address } from 'viem';
import { backgroundApi, type CreateCommentRequest, type CreateGameRequest } from '../lib/backgroundApi';
import { GAME_FACTORY_ADDRESS, gameFactoryABI } from '../lib/contract/abis/gameFactory';
import { createContractClient } from '../lib/contract/contractClient';
import { parseCommentAddedEvent, parseGameCreatedEvent } from '../lib/contract/eventParser';
import { injectedApi, sendEthereumRequest } from '../lib/injectedApi';
import { logger } from '../lib/injected/logger';
import { useWallet } from './useWallet';

// 블록 타임스탬프 응답 타입
interface BlockResponse {
    timestamp: string;
}

/**
 * 최신 블록의 타임스탬프를 가져옵니다.
 * 클라이언트 시간 대신 블록체인 시간을 사용하여 정확한 비교가 가능합니다.
 */
async function getBlockTimestamp(): Promise<bigint> {
    try {
        const block = await sendEthereumRequest<BlockResponse>('eth_getBlockByNumber', ['latest', false]);
        // timestamp는 hex 문자열 (예: "0x6756a1b0")
        return BigInt(block.timestamp);
    } catch (err) {
        logger.warn('블록 타임스탬프 조회 실패, 클라이언트 시간 사용', { error: String(err) });
        // 실패 시 클라이언트 시간 폴백
        return BigInt(Math.floor(Date.now() / 1000));
    }
}

// 테스트용 MockERC20 주소 (MemeCore 테스트넷에 배포됨)
const MOCK_ERC20_ADDRESS = (import.meta.env.VITE_MOCK_ERC20_ADDRESS || '0xfda7278df9b004e05dbaa367fc2246a4a46271c9') as Address;

// CommentGame ABI (게임 상태 확인 및 댓글 작성용)
// 참고: 컨트랙트에 isEnded 함수 없음, endTime과 블록 타임스탬프로 종료 여부 판단
const COMMENT_GAME_ABI = [
    {
        inputs: [],
        name: 'endTime',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'cost',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: '_message', type: 'string' }],
        name: 'addComment',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const;

// ERC20 ABI (approve, allowance, balanceOf 필요)
const ERC20_ABI = [
    {
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export type CreateGameStep = 'idle' | 'checking' | 'approve' | 'create' | 'firstComment' | 'complete' | 'error';

export interface GameSettings {
    tokenAddress: Address;
    cost: bigint;      // 댓글 비용 (wei 단위)
    time: number;      // 타이머 (초)
    firstComment: string;  // 첫 댓글 내용 (필수)
}

export interface ExistingGameInfo {
    gameAddress: Address;
    tokenSymbol: string;
    tokenName: string;
    isEnded: boolean;
}

export interface UseCreateGameReturn {
    step: CreateGameStep;
    status: string;
    error: string | null;
    txHash: string | null;
    gameAddress: string | null;
    existingGame: ExistingGameInfo | null;
    createGame: (settings: GameSettings) => Promise<string | null>;
    checkExistingGame: (tokenAddress: Address) => Promise<ExistingGameInfo | null>;
    reset: () => void;
}

/**
 * 게임 생성 전체 플로우 훅
 */
export function useCreateGame(): UseCreateGameReturn {
    const { address: userAddress, ensureNetwork } = useWallet();
    const [step, setStep] = useState<CreateGameStep>('idle');
    const [status, setStatus] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [gameAddress, setGameAddress] = useState<string | null>(null);
    const [existingGame, setExistingGame] = useState<ExistingGameInfo | null>(null);

    /**
     * 상태 초기화
     */
    const reset = useCallback(() => {
        setStep('idle');
        setStatus('');
        setError(null);
        setTxHash(null);
        setGameAddress(null);
        setExistingGame(null);
    }, []);

    /**
     * 기존 게임 확인
     * @param tokenAddress 토큰 주소 (MemeX 사이트에서 가져온 주소, 실제로는 MockERC20 사용)
     */
    const checkExistingGame = useCallback(async (tokenAddress: Address): Promise<ExistingGameInfo | null> => {
        try {
            setStep('checking');
            setStatus('기존 게임 확인 중...');

            // MemeX 사이트의 토큰은 다른 네트워크에 있으므로 MockToken 사용
            const actualTokenAddress = MOCK_ERC20_ADDRESS;

            logger.info('기존 게임 확인', {
                originalTokenAddress: tokenAddress,
                actualTokenAddress
            });

            const factoryClient = createContractClient({
                address: GAME_FACTORY_ADDRESS as Address,
                abi: gameFactoryABI,
            });

            // gameByToken으로 게임 정보 조회 (튜플 반환: [gameAddress, tokenSymbol, tokenName])
            const gameInfo = await factoryClient.read<readonly [Address, string, string]>({
                functionName: 'gameByToken',
                args: [actualTokenAddress],
            });

            const [gameAddr, tokenSymbol, tokenName] = gameInfo.data;

            // 게임이 없는 경우 (주소가 0x0)
            if (!gameAddr || gameAddr === '0x0000000000000000000000000000000000000000') {
                logger.info('기존 게임 없음');
                setExistingGame(null);
                setStep('idle');
                setStatus('');
                return null;
            }

            // 게임이 있으면 종료 여부 확인 (blockTimestamp >= endTime)
            const gameClient = createContractClient({
                address: gameAddr,
                abi: COMMENT_GAME_ABI,
            });

            const [endTimeResult, currentTime] = await Promise.all([
                gameClient.read<bigint>({ functionName: 'endTime' }),
                getBlockTimestamp(), // 블록체인 시간 사용
            ]);

            const endTime = endTimeResult.data;
            const isGameEnded = currentTime >= endTime;

            const existingGameInfo: ExistingGameInfo = {
                gameAddress: gameAddr,
                tokenSymbol,
                tokenName,
                isEnded: isGameEnded,
            };

            logger.info('기존 게임 발견', {
                gameAddress: gameAddr,
                tokenSymbol,
                tokenName,
                isEnded: isGameEnded,
                endTime: endTime.toString(),
            });

            setExistingGame(existingGameInfo);
            setStep('idle');
            setStatus('');
            return existingGameInfo;
        } catch (err) {
            logger.error('기존 게임 확인 실패', err);
            setStep('idle');
            setStatus('');
            return null;
        }
    }, []);

    /**
     * 게임 생성 전체 플로우 실행
     */
    const createGame = useCallback(async (settings: GameSettings): Promise<string | null> => {
        if (!userAddress) {
            setError('지갑이 연결되지 않았습니다.');
            setStep('error');
            return null;
        }

        try {
            // 네트워크 확인
            await ensureNetwork();

            // MemeX 사이트의 토큰은 다른 네트워크에 있으므로 MockToken 사용
            const actualTokenAddress = MOCK_ERC20_ADDRESS;

            logger.info('게임 생성 플로우 시작', {
                originalTokenAddress: settings.tokenAddress,
                actualTokenAddress,
                cost: settings.cost.toString(),
                time: settings.time,
                creator: userAddress,
            });

            // ============================================
            // Step 1: Approve - 토큰 승인 (잔액 기반)
            // ============================================
            setStep('approve');
            setStatus('토큰 승인 중... (1/2)');

            // 사용자의 토큰 잔액 조회
            const userBalance = await injectedApi.readContract({
                address: actualTokenAddress,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [userAddress as Address],
            }) as bigint;

            logger.info('사용자 토큰 잔액', { balance: userBalance.toString() });

            // 현재 allowance 확인
            const currentAllowance = await injectedApi.readContract({
                address: actualTokenAddress,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [userAddress as Address, GAME_FACTORY_ADDRESS as Address],
            }) as bigint;

            logger.info('현재 allowance', { currentAllowance: currentAllowance.toString() });

            // allowance가 부족하면 잔액만큼 approve 실행
            if (currentAllowance < settings.cost) {
                logger.info('Approve 필요 (잔액 기반)', {
                    currentAllowance: currentAllowance.toString(),
                    requiredCost: settings.cost.toString(),
                    approveAmount: userBalance.toString(),
                });

                const approveResult = await injectedApi.writeContract({
                    address: actualTokenAddress,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [GAME_FACTORY_ADDRESS as Address, userBalance],
                });

                logger.info('Approve 트랜잭션 전송됨', { hash: approveResult });
                setStatus('토큰 승인 확인 대기 중...');

                // 트랜잭션 완료 대기 (간단히 3초 대기)
                await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
                logger.info('이미 충분한 allowance 있음');
            }

            // ============================================
            // Step 2: Create Game - 게임 생성
            // ============================================
            setStep('create');
            setStatus('게임 생성 중... (2/2)');

            const factoryClient = createContractClient({
                address: GAME_FACTORY_ADDRESS as Address,
                abi: gameFactoryABI,
            });

            const result = await factoryClient.write(
                {
                    functionName: 'createGame',
                    args: [actualTokenAddress, BigInt(settings.time), settings.cost],
                },
                userAddress as Address
            );

            logger.info('게임 생성 트랜잭션 전송됨', { hash: result.hash });
            setTxHash(result.hash);
            setStatus('트랜잭션 확인 대기 중...');

            // 트랜잭션 확정 대기
            const createGameReceipt = await injectedApi.waitForTransaction(result.hash);

            logger.info('게임 생성 트랜잭션 확정됨', {
                hash: result.hash,
                blockNumber: createGameReceipt.blockNumber,
                logsCount: createGameReceipt.logs.length,
            });

            // GameCreated 이벤트 파싱
            const gameCreatedEvent = parseGameCreatedEvent(
                createGameReceipt.logs,
                GAME_FACTORY_ADDRESS
            );

            let createdGameAddress: string | null = null;

            if (gameCreatedEvent) {
                createdGameAddress = gameCreatedEvent.gameAddr;
                setGameAddress(createdGameAddress);

                logger.info('GameCreated 이벤트 파싱 완료', {
                    gameId: gameCreatedEvent.gameId.toString(),
                    gameAddr: gameCreatedEvent.gameAddr,
                    tokenSymbol: gameCreatedEvent.tokenSymbol,
                });

                // 백엔드 API 호출 - 게임 데이터 저장
                const gameApiRequest: CreateGameRequest = {
                    txHash: result.hash,
                    gameId: gameCreatedEvent.gameId.toString(),
                    gameAddr: gameCreatedEvent.gameAddr,
                    gameTokenAddr: gameCreatedEvent.gameTokenAddr,
                    tokenSymbol: gameCreatedEvent.tokenSymbol,
                    tokenName: gameCreatedEvent.tokenName,
                    initiator: gameCreatedEvent.initiator,
                    gameTime: gameCreatedEvent.gameTime.toString(),
                    endTime: gameCreatedEvent.endTime.toString(),
                    cost: gameCreatedEvent.cost.toString(),
                    prizePool: gameCreatedEvent.prizePool.toString(),
                    lastCommentor: gameCreatedEvent.lastCommentor,
                    isClaimed: gameCreatedEvent.isClaimed,
                };

                try {
                    const savedGame = await backgroundApi.saveGame(gameApiRequest);
                    logger.info('백엔드에 게임 저장 완료', {
                        gameAddress: savedGame?.gameAddress,
                    });
                } catch (apiError) {
                    logger.warn('백엔드 게임 저장 실패', {
                        error: apiError,
                    });
                }
            } else {
                // 이벤트 파싱 실패 시 gameByToken으로 조회
                logger.warn('GameCreated 이벤트를 찾을 수 없음, gameByToken으로 조회');

                try {
                    const gameInfo = await factoryClient.read<readonly [Address, string, string]>({
                        functionName: 'gameByToken',
                        args: [actualTokenAddress],
                    });

                    const [retrievedGameAddress] = gameInfo.data;

                    if (retrievedGameAddress && retrievedGameAddress !== '0x0000000000000000000000000000000000000000') {
                        createdGameAddress = retrievedGameAddress;
                        setGameAddress(retrievedGameAddress);
                        logger.info('게임 주소 조회 완료', { gameAddress: retrievedGameAddress });
                    } else {
                        logger.warn('게임 주소가 0x0 - 게임 생성 실패 가능성', { data: gameInfo.data });
                    }
                } catch (err) {
                    logger.error('게임 주소 조회 실패', err);
                }
            }

            // ============================================
            // Step 3: First Comment - 첫 댓글 작성 (필수)
            // ============================================
            if (!createdGameAddress) {
                throw new Error('게임 주소를 조회할 수 없습니다.');
            }

            setStep('firstComment');
            setStatus('첫 댓글 작성 중... (3/3)');

            // 게임 컨트랙트에 토큰 approve 필요 (잔액 기반)
            // 최신 잔액 조회 (GameFactory에서 토큰이 차감되었을 수 있음)
            const currentBalance = await injectedApi.readContract({
                address: actualTokenAddress,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [userAddress as Address],
            }) as bigint;

            const gameAllowance = await injectedApi.readContract({
                address: actualTokenAddress,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [userAddress as Address, createdGameAddress as Address],
            }) as bigint;

            logger.info('게임에 대한 allowance', {
                gameAllowance: gameAllowance.toString(),
                currentBalance: currentBalance.toString(),
            });

            if (gameAllowance < settings.cost) {
                logger.info('게임에 Approve 필요 (잔액 기반)', {
                    approveAmount: currentBalance.toString(),
                });

                const gameApproveResult = await injectedApi.writeContract({
                    address: actualTokenAddress,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [createdGameAddress as Address, currentBalance],
                });

                logger.info('게임 Approve 트랜잭션 전송됨', { hash: gameApproveResult });
                setStatus('게임 토큰 승인 대기 중...');

                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // addComment 호출
            const gameClient = createContractClient({
                address: createdGameAddress as Address,
                abi: COMMENT_GAME_ABI,
            });

            const commentResult = await gameClient.write(
                {
                    functionName: 'addComment',
                    args: [settings.firstComment],
                },
                userAddress as Address
            );

            logger.info('첫 댓글 트랜잭션 전송됨', { hash: commentResult.hash });
            setStatus('첫 댓글 확인 대기 중...');

            // 트랜잭션 확정 대기
            const commentReceipt = await injectedApi.waitForTransaction(commentResult.hash);

            logger.info('첫 댓글 트랜잭션 확정됨', {
                hash: commentResult.hash,
                blockNumber: commentReceipt.blockNumber,
                logsCount: commentReceipt.logs.length,
            });

            // CommentAdded 이벤트 파싱
            const commentEvent = parseCommentAddedEvent(commentReceipt.logs, createdGameAddress);

            if (commentEvent) {
                logger.info('CommentAdded 이벤트 파싱 완료', {
                    commentor: commentEvent.commentor,
                    newEndTime: commentEvent.newEndTime.toString(),
                    prizePool: commentEvent.prizePool.toString(),
                });

                // 백엔드 API 호출 - 댓글 데이터 저장
                const commentApiRequest: CreateCommentRequest = {
                    txHash: commentResult.hash,
                    gameAddress: createdGameAddress,
                    commentor: commentEvent.commentor,
                    message: commentEvent.message,
                    newEndTime: commentEvent.newEndTime.toString(),
                    prizePool: commentEvent.prizePool.toString(),
                    timestamp: commentEvent.timestamp.toString(),
                };

                try {
                    const savedComment = await backgroundApi.saveComment(commentApiRequest);
                    logger.info('백엔드에 첫 댓글 저장 완료', {
                        commentId: savedComment?.id,
                    });
                } catch (apiError) {
                    logger.warn('백엔드 첫 댓글 저장 실패', {
                        error: apiError,
                    });
                }
            } else {
                logger.warn('CommentAdded 이벤트를 찾을 수 없음', {
                    hash: commentResult.hash,
                });
            }

            logger.info('첫 댓글 작성 완료');

            // ============================================
            // Complete
            // ============================================
            setStep('complete');
            setStatus('게임 생성 완료!');

            logger.info('게임 생성 플로우 완료', {
                txHash: result.hash,
                gameAddress: createdGameAddress,
            });

            // 게임 주소를 반환 (ConfirmStep에서 직접 사용하기 위해)
            return createdGameAddress;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '게임 생성 실패';
            logger.error('게임 생성 플로우 오류', err);
            setError(errorMessage);
            setStep('error');
            return null;
        }
    }, [userAddress, ensureNetwork, gameAddress]);

    return {
        step,
        status,
        error,
        txHash,
        gameAddress,
        existingGame,
        createGame,
        checkExistingGame,
        reset,
    };
}
