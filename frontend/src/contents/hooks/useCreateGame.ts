/**
 * 게임 생성 전체 플로우 훅
 *
 * 1. approve - 토큰을 GameFactory에 승인
 * 2. createGame - GameFactory에서 게임 생성
 *
 * 참고: 첫 댓글은 게임 생성 시 자동으로 initiator가 lastCommentor가 됨
 */

import { useCallback, useState } from 'react';
import type { Address } from 'viem';
import { GAME_FACTORY_ADDRESS, gameFactoryABI } from '../lib/contract/abis/gameFactory';
import { createContractClient } from '../lib/contract/contractClient';
import { injectedApi } from '../lib/injectedApi';
import { logger } from '../lib/injected/logger';
import { useWallet } from './useWallet';

// ERC20 ABI (approve만 필요)
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
] as const;

export type CreateGameStep = 'idle' | 'approve' | 'create' | 'complete' | 'error';

export interface GameSettings {
    tokenAddress: Address;
    cost: bigint;      // 댓글 비용 (wei 단위)
    time: number;      // 타이머 (초)
}

export interface UseCreateGameReturn {
    step: CreateGameStep;
    status: string;
    error: string | null;
    txHash: string | null;
    gameAddress: string | null;
    createGame: (settings: GameSettings) => Promise<string | null>;
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

    /**
     * 상태 초기화
     */
    const reset = useCallback(() => {
        setStep('idle');
        setStatus('');
        setError(null);
        setTxHash(null);
        setGameAddress(null);
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

            logger.info('게임 생성 플로우 시작', {
                tokenAddress: settings.tokenAddress,
                cost: settings.cost.toString(),
                time: settings.time,
                creator: userAddress,
            });

            // ============================================
            // Step 1: Approve - 토큰 승인
            // ============================================
            setStep('approve');
            setStatus('토큰 승인 중... (1/2)');

            // 현재 allowance 확인
            const currentAllowance = await injectedApi.readContract({
                address: settings.tokenAddress,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [userAddress as Address, GAME_FACTORY_ADDRESS as Address],
            }) as bigint;

            logger.info('현재 allowance', { currentAllowance: currentAllowance.toString() });

            // allowance가 부족하면 approve 실행
            if (currentAllowance < settings.cost) {
                logger.info('Approve 필요', {
                    currentAllowance: currentAllowance.toString(),
                    requiredCost: settings.cost.toString(),
                });

                const approveResult = await injectedApi.writeContract({
                    address: settings.tokenAddress,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [GAME_FACTORY_ADDRESS as Address, settings.cost],
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
                    args: [settings.tokenAddress, BigInt(settings.time), settings.cost],
                },
                userAddress as Address
            );

            logger.info('게임 생성 트랜잭션 전송됨', { hash: result.hash });
            setTxHash(result.hash);
            setStatus('트랜잭션 확인 대기 중...');

            // 트랜잭션 완료 대기 (간단히 5초 대기)
            await new Promise(resolve => setTimeout(resolve, 5000));

            // TODO: 이벤트에서 게임 주소 추출 (지금은 임시로 처리)
            // GameCreated 이벤트를 파싱해서 gameAddress를 얻어야 함
            // 일단은 백엔드 API나 gameByToken으로 조회하는 방식으로 대체

            // gameByToken으로 게임 주소 조회
            try {
                const gameInfo = await factoryClient.read<{ gameAddress: Address }>({
                    functionName: 'gameByToken',
                    args: [settings.tokenAddress],
                });

                if (gameInfo.data && gameInfo.data.gameAddress !== '0x0000000000000000000000000000000000000000') {
                    setGameAddress(gameInfo.data.gameAddress);
                    logger.info('게임 주소 조회 완료', { gameAddress: gameInfo.data.gameAddress });
                }
            } catch (err) {
                logger.warn('게임 주소 조회 실패', err);
            }

            // ============================================
            // Complete
            // ============================================
            setStep('complete');
            setStatus('게임 생성 완료!');

            logger.info('게임 생성 플로우 완료', {
                txHash: result.hash,
                gameAddress: gameAddress,
            });

            return result.hash;
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
        createGame,
        reset,
    };
}
