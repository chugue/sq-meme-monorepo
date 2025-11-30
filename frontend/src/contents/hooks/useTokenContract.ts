/**
 * 토큰 컨트랙트 감지 훅
 *
 * - injected.js에서 캐시한 토큰 컨트랙트 정보를 감지
 * - 백엔드 API를 통해 게임 주소 조회
 */

import { useAtom } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';
import { currentChallengeIdAtom } from '../atoms/commentAtoms';
import { tokenContractAtom, isTokenContractLoadingAtom, tokenContractErrorAtom, TokenContractInfo } from '../atoms/tokenContractAtoms';
import { backgroundApi, GameInfo } from '../lib/backgroundApi';
import { logger } from '../lib/injected/logger';

const MESSAGE_SOURCE = {
    TOKEN_CONTRACT_CACHED: 'TOKEN_CONTRACT_CACHED',
};

export function useTokenContract() {
    const [tokenContract, setTokenContract] = useAtom(tokenContractAtom);
    const [isLoading, setIsLoading] = useAtom(isTokenContractLoadingAtom);
    const [error, setError] = useAtom(tokenContractErrorAtom);
    const [, setGameAddress] = useAtom(currentChallengeIdAtom);

    // 중복 조회 방지
    const lastTokenAddressRef = useRef<string | null>(null);

    /**
     * 토큰 주소로 게임 정보 조회
     */
    const fetchGameByToken = useCallback(async (tokenAddress: string): Promise<GameInfo | null> => {
        // 중복 조회 방지
        if (lastTokenAddressRef.current === tokenAddress) {
            logger.debug('이미 조회한 토큰 주소', { tokenAddress });
            return null;
        }

        lastTokenAddressRef.current = tokenAddress;
        setIsLoading(true);
        setError(null);

        try {
            logger.info('토큰 주소로 게임 조회 시작', { tokenAddress });

            const game = await backgroundApi.getGameByToken(tokenAddress);

            if (game) {
                logger.info('게임 정보 조회 성공', {
                    gameAddress: game.gameAddress,
                    tokenSymbol: game.tokenSymbol,
                });

                // 게임 주소를 currentChallengeIdAtom에 저장
                setGameAddress(game.gameAddress);

                return game;
            } else {
                logger.info('해당 토큰으로 생성된 게임 없음', { tokenAddress });
                setGameAddress(null);
                return null;
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '게임 조회 실패';
            logger.error('게임 조회 실패', err);
            setError(errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, setGameAddress]);

    /**
     * 토큰 컨트랙트 정보 저장 및 게임 조회
     */
    const handleTokenContractCached = useCallback(async (data: TokenContractInfo) => {
        logger.info('토큰 컨트랙트 정보 수신', { ...data });

        setTokenContract(data);

        // 토큰 주소로 게임 정보 조회
        await fetchGameByToken(data.contractAddress);
    }, [setTokenContract, fetchGameByToken]);

    /**
     * window에서 초기 토큰 정보 확인
     */
    const checkInitialTokenInfo = useCallback(() => {
        try {
            const cachedTokens = (window as any).__SQUID_MEME_TOKEN_CONTRACTS__;
            if (cachedTokens && typeof cachedTokens === 'object') {
                // 현재 URL에서 username/usertag 추출
                const currentUrl = window.location.href;
                const profileMatch = currentUrl.match(/\/profile\/([^\/]+)\/([^\/]+)/);

                if (profileMatch) {
                    const [, username, userTag] = profileMatch;
                    const cacheKey = `${username}#${userTag}`;

                    const tokenInfo = cachedTokens[cacheKey];
                    if (tokenInfo) {
                        logger.info('초기 토큰 정보 발견', tokenInfo);
                        handleTokenContractCached(tokenInfo);
                    }
                }
            }
        } catch (err) {
            logger.error('초기 토큰 정보 확인 실패', err);
        }
    }, [handleTokenContractCached]);

    useEffect(() => {
        // 메시지 리스너 등록
        const handleMessage = (event: MessageEvent) => {
            if (event.source !== window) return;
            if (!event.data || typeof event.data !== 'object') return;
            if (event.data.source !== MESSAGE_SOURCE.TOKEN_CONTRACT_CACHED) return;

            const { data } = event.data;
            if (data?.contractAddress) {
                handleTokenContractCached(data);
            }
        };

        window.addEventListener('message', handleMessage);

        // 초기 토큰 정보 확인 (약간의 딜레이 후)
        const timeoutId = setTimeout(() => {
            checkInitialTokenInfo();
        }, 500);

        return () => {
            window.removeEventListener('message', handleMessage);
            clearTimeout(timeoutId);
        };
    }, [handleTokenContractCached, checkInitialTokenInfo]);

    return {
        tokenContract,
        isLoading,
        error,
        fetchGameByToken,
    };
}
