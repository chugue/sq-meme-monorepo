/**
 * GameFactory 컨트랙트 상호작용 훅
 *
 * - createGame: 새 게임 생성
 */

import { useCallback, useMemo, useState } from 'react';
import type { Address } from 'viem';
import { gameFactoryABI, GAME_FACTORY_ADDRESS } from '../lib/contract/abis/gameFactory';
import { createContractClient } from '../lib/contract/contractClient';
import { useWallet } from './useWallet';
import { logger } from '../lib/injected/logger';

// 기본 게임 설정
const DEFAULT_GAME_TIME = 60; // 60초
const DEFAULT_GAME_COST = BigInt('1000000000000000000'); // 1 토큰 (18 decimals)

export interface UseGameFactoryReturn {
    createGame: (tokenAddress: Address, time?: number, cost?: bigint) => Promise<string>;
    getGameByToken: (tokenAddress: Address) => Promise<Address | null>;
    isCreating: boolean;
    error: string | null;
}

/**
 * GameFactory 컨트랙트 훅
 */
export function useGameFactory(): UseGameFactoryReturn {
    const { address: userAddress } = useWallet();
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // GameFactory 컨트랙트 클라이언트
    const factoryClient = useMemo(() => {
        return createContractClient({
            address: GAME_FACTORY_ADDRESS as Address,
            abi: gameFactoryABI,
        });
    }, []);

    /**
     * 새 게임 생성
     * @param tokenAddress 게임 토큰 주소
     * @param time 게임 시간 (초, 기본값: 60)
     * @param cost 참가비 (기본값: 1 토큰)
     * @returns 트랜잭션 해시
     */
    const createGame = useCallback(
        async (
            tokenAddress: Address,
            time: number = DEFAULT_GAME_TIME,
            cost: bigint = DEFAULT_GAME_COST
        ): Promise<string> => {
            if (!userAddress) {
                throw new Error('지갑이 연결되지 않았습니다.');
            }

            setIsCreating(true);
            setError(null);

            try {
                logger.info('게임 생성 시작', {
                    tokenAddress,
                    time,
                    cost: cost.toString(),
                    creator: userAddress,
                });

                const result = await factoryClient.write(
                    {
                        functionName: 'createGame',
                        args: [tokenAddress, BigInt(time), cost],
                    },
                    userAddress as Address
                );

                logger.info('게임 생성 트랜잭션 전송 완료', {
                    hash: result.hash,
                });

                return result.hash;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : '게임 생성 실패';
                logger.error('게임 생성 실패', err);
                setError(errorMessage);
                throw err;
            } finally {
                setIsCreating(false);
            }
        },
        [factoryClient, userAddress]
    );

    /**
     * 토큰 주소로 게임 주소 조회
     * @param tokenAddress 토큰 주소
     * @returns 게임 주소 (없으면 null)
     */
    const getGameByToken = useCallback(
        async (tokenAddress: Address): Promise<Address | null> => {
            try {
                const result = await factoryClient.read<Address>({
                    functionName: 'gamesByToken',
                    args: [tokenAddress],
                });

                // 0x0 주소면 게임 없음
                if (result.data === '0x0000000000000000000000000000000000000000') {
                    return null;
                }

                return result.data;
            } catch (err) {
                logger.error('게임 조회 실패', err);
                return null;
            }
        },
        [factoryClient]
    );

    return {
        createGame,
        getGameByToken,
        isCreating,
        error,
    };
}
