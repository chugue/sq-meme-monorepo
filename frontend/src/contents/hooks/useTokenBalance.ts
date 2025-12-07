/**
 * 토큰 잔액 조회 훅
 *
 * - ERC20 토큰의 balanceOf 호출
 * - injectedApi를 통해 지갑에서 조회
 */

import { useCallback, useState } from 'react';
import type { Address } from 'viem';
import { memeCoreChain } from '../config/wagmi';
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
    checkBalance: (tokenAddress: Address, walletAddress: Address, siteSymbol?: string) => Promise<TokenInfo | null>;
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
        walletAddress: Address,
        siteSymbol?: string  // MemeX 사이트에서 가져온 심볼 (UI 표시용)
    ): Promise<TokenInfo | null> => {
        setIsLoading(true);
        setError(null);

        // 전달받은 tokenAddress를 그대로 사용
        const actualTokenAddress = tokenAddress;

        try {
            logger.info('토큰 잔액 조회 시작', {
                tokenAddress: actualTokenAddress,
                walletAddress,
                siteSymbol,
            });

            // MemeCore 네트워크로 전환 (컨트랙트가 MemeCore에 배포됨)
            try {
                await injectedApi.ensureNetwork(memeCoreChain.id);
                logger.info('MemeCore 네트워크 전환 완료');
            } catch (networkError) {
                // 네트워크 전환 실패 시 체인 추가 시도
                logger.warn('네트워크 전환 실패, 체인 추가 시도', { error: String(networkError) });
                try {
                    await injectedApi.addAndSwitchNetwork({
                        chainId: `0x${memeCoreChain.id.toString(16)}`,
                        chainName: memeCoreChain.name,
                        nativeCurrency: memeCoreChain.nativeCurrency,
                        rpcUrls: [...memeCoreChain.rpcUrls.default.http],
                        blockExplorerUrls: memeCoreChain.blockExplorers?.default
                            ? [memeCoreChain.blockExplorers.default.url]
                            : undefined,
                    });
                    logger.info('MemeCore 체인 추가 및 전환 완료');
                } catch (addError) {
                    logger.error('체인 추가 실패', { error: String(addError) });
                    throw new Error('MemeCore 네트워크로 전환할 수 없습니다. MetaMask에서 수동으로 전환해주세요.');
                }
            }

            // readContract를 통해 balanceOf, decimals 조회 (MockToken 사용)
            const [balanceResult, decimalsResult] = await Promise.all([
                injectedApi.readContract({
                    address: actualTokenAddress,
                    abi: ERC20_BALANCE_OF_ABI,
                    functionName: 'balanceOf',
                    args: [walletAddress],
                }),
                injectedApi.readContract({
                    address: actualTokenAddress,
                    abi: ERC20_BALANCE_OF_ABI,
                    functionName: 'decimals',
                    args: [],
                }),
            ]);

            const balance = balanceResult as bigint;
            const decimals = Number(decimalsResult);
            // 사이트에서 가져온 심볼 사용 (없으면 기본값)
            const symbol = siteSymbol || 'TOKEN';

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
            // 콘솔에만 출력 (UI에 렌더링하지 않음)
            console.warn('🦑 [useTokenBalance] 토큰 잔액 조회 오류:', errorMessage);
            logger.error('토큰 잔액 조회 오류', err);
            // 0x 디코딩 에러 등 기술적 에러는 UI에 표시하지 않음
            // setError(errorMessage);
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
