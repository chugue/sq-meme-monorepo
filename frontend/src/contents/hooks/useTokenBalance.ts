/**
 * 토큰 잔액 조회 훅
 *
 * - ERC20 토큰의 balanceOf 호출
 * - injectedApi를 통해 지갑에서 조회
 */

import { useCallback, useState } from 'react';
import type { Address } from 'viem';
import { injectedApi } from '../lib/injectedApi';
import { logger } from '../lib/injected/logger';

// ERC20 balanceOf ABI
const ERC20_BALANCE_OF_ABI = [
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'decimals',
        outputs: [{ name: '', type: 'uint8' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'symbol',
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

interface TokenInfo {
    balance: bigint;
    balanceFormatted: string;
    decimals: number;
    symbol: string;
}

interface UseTokenBalanceReturn {
    tokenInfo: TokenInfo | null;
    isLoading: boolean;
    error: string | null;
    checkBalance: (tokenAddress: Address, walletAddress: Address) => Promise<TokenInfo | null>;
    hasBalance: boolean;
}

/**
 * 토큰 잔액 조회 훅
 */
export function useTokenBalance(): UseTokenBalanceReturn {
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * 토큰 잔액 조회
     */
    const checkBalance = useCallback(async (
        tokenAddress: Address,
        walletAddress: Address
    ): Promise<TokenInfo | null> => {
        setIsLoading(true);
        setError(null);

        try {
            logger.info('토큰 잔액 조회 시작', { tokenAddress, walletAddress });

            // readContract를 통해 balanceOf, decimals, symbol 조회
            const [balanceResult, decimalsResult, symbolResult] = await Promise.all([
                injectedApi.readContract({
                    address: tokenAddress,
                    abi: ERC20_BALANCE_OF_ABI,
                    functionName: 'balanceOf',
                    args: [walletAddress],
                }),
                injectedApi.readContract({
                    address: tokenAddress,
                    abi: ERC20_BALANCE_OF_ABI,
                    functionName: 'decimals',
                    args: [],
                }),
                injectedApi.readContract({
                    address: tokenAddress,
                    abi: ERC20_BALANCE_OF_ABI,
                    functionName: 'symbol',
                    args: [],
                }).catch(() => 'TOKEN'), // symbol이 없는 경우 기본값
            ]);

            const balance = balanceResult as bigint;
            const decimals = Number(decimalsResult);
            const symbol = symbolResult as string;

            // 포맷된 잔액 계산
            const balanceFormatted = formatBalance(balance, decimals);

            const info: TokenInfo = {
                balance,
                balanceFormatted,
                decimals,
                symbol,
            };

            logger.info('토큰 잔액 조회 완료', {
                balance: balance.toString(),
                balanceFormatted,
                decimals,
                symbol,
            });

            setTokenInfo(info);
            setIsLoading(false);
            return info;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '잔액 조회 실패';
            logger.error('토큰 잔액 조회 오류', err);
            setError(errorMessage);
            setIsLoading(false);
            return null;
        }
    }, []);

    return {
        tokenInfo,
        isLoading,
        error,
        checkBalance,
        hasBalance: tokenInfo ? tokenInfo.balance > 0n : false,
    };
}

/**
 * 잔액 포맷팅 (decimals 적용)
 */
function formatBalance(balance: bigint, decimals: number): string {
    if (balance === 0n) return '0';

    const divisor = 10n ** BigInt(decimals);
    const integerPart = balance / divisor;
    const fractionalPart = balance % divisor;

    if (fractionalPart === 0n) {
        return integerPart.toLocaleString();
    }

    // 소수점 이하 최대 4자리까지 표시
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.slice(0, 4).replace(/0+$/, '');

    if (trimmedFractional === '') {
        return integerPart.toLocaleString();
    }

    return `${integerPart.toLocaleString()}.${trimmedFractional}`;
}
