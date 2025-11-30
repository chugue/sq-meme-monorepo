/**
 * 토큰 컨트랙트 감지 훅
 *
 * - injected.js에서 캐시한 토큰 컨트랙트 정보를 감지
 * - 백엔드 API를 통해 게임 주소 조회
 * - 백엔드에 없으면 블록체인에서 직접 조회
 */

import { useAtom } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';
import type { Address } from 'viem';
import { currentChallengeIdAtom } from '../atoms/commentAtoms';
import { tokenContractAtom, isTokenContractLoadingAtom, tokenContractErrorAtom, TokenContractInfo } from '../atoms/tokenContractAtoms';
import { backgroundApi, GameInfo } from '../lib/backgroundApi';
import { GAME_FACTORY_ADDRESS, gameFactoryABI } from '../lib/contract/abis/gameFactory';
import { createContractClient } from '../lib/contract/contractClient';
import { logger } from '../lib/injected/logger';

// 테스트용 MockERC20 주소 (MemeCore 테스트넷에 배포됨)
const MOCK_ERC20_ADDRESS = (import.meta.env.VITE_MOCK_ERC20_ADDRESS || '0xfda7278df9b004e05dbaa367fc2246a4a46271c9') as Address;

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
     * 블록체인에서 직접 게임 정보 조회
     */
    const fetchGameFromBlockchain = useCallback(async (): Promise<string | null> => {
        try {
            logger.info('블록체인에서 게임 조회 시작', { tokenAddress: MOCK_ERC20_ADDRESS });

            const factoryClient = createContractClient({
                address: GAME_FACTORY_ADDRESS as Address,
                abi: gameFactoryABI,
            });

            // gameByToken으로 게임 정보 조회 (튜플 반환: [gameAddress, tokenSymbol, tokenName])
            const gameInfo = await factoryClient.read<readonly [Address, string, string]>({
                functionName: 'gameByToken',
                args: [MOCK_ERC20_ADDRESS],
            });

            const [gameAddr, tokenSymbol, tokenName] = gameInfo.data;

            // 게임이 없는 경우 (주소가 0x0)
            if (!gameAddr || gameAddr === '0x0000000000000000000000000000000000000000') {
                logger.info('블록체인에 게임 없음');
                return null;
            }

            logger.info('블록체인에서 게임 발견', {
                gameAddress: gameAddr,
                tokenSymbol,
                tokenName,
            });

            return gameAddr;
        } catch (err) {
            logger.error('블록체인 게임 조회 실패', err);
            return null;
        }
    }, []);

    /**
     * 토큰 주소로 게임 정보 조회
     * 1. 먼저 백엔드 API 조회
     * 2. 백엔드에 없으면 블록체인에서 직접 조회
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

            // 1. 백엔드 API에서 게임 조회
            const game = await backgroundApi.getGameByToken(tokenAddress);

            if (game) {
                logger.info('백엔드에서 게임 정보 조회 성공', {
                    gameAddress: game.gameAddress,
                    tokenSymbol: game.tokenSymbol,
                });

                // 게임 주소를 currentChallengeIdAtom에 저장
                setGameAddress(game.gameAddress);

                return game;
            }

            // 2. 백엔드에 없으면 블록체인에서 직접 조회
            logger.info('백엔드에 게임 없음, 블록체인 조회 시도');
            const blockchainGameAddress = await fetchGameFromBlockchain();

            if (blockchainGameAddress) {
                logger.info('블록체인에서 기존 게임 발견, 댓글 UI로 전환', {
                    gameAddress: blockchainGameAddress,
                });

                // 게임 주소를 설정하여 댓글 UI가 표시되도록 함
                setGameAddress(blockchainGameAddress);

                // 부분적인 GameInfo 반환 (백엔드에 없으므로 최소 정보만)
                return {
                    id: 0,
                    gameId: '0',
                    gameAddress: blockchainGameAddress,
                    gameToken: MOCK_ERC20_ADDRESS,
                    tokenSymbol: null,
                    tokenName: null,
                    initiator: '',
                    gameTime: '0',
                    endTime: '0',
                    cost: '0',
                    prizePool: '0',
                    isEnded: false,
                    lastCommentor: '',
                } as GameInfo;
            }

            logger.info('게임 없음 (백엔드 및 블록체인 모두)', { tokenAddress });
            setGameAddress(null);
            return null;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '게임 조회 실패';
            logger.error('게임 조회 실패', err);
            setError(errorMessage);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, setGameAddress, fetchGameFromBlockchain]);

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
