/**
 * 토큰 컨트랙트 감지 훅
 *
 * - injected.js에서 캐시한 토큰 컨트랙트 정보를 감지
 * - 백엔드 API를 통해 게임 주소 조회
 * - 백엔드에 없으면 블록체인에서 직접 조회
 */

import { useAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import type { Address } from "viem";
import type { BlockchainGameInfo } from "../../types/request.types";
import { ActiveGameInfo, activeGameInfoAtom, endedGameInfoAtom, isGameEndedAtom } from "../atoms/commentAtoms";
import { CurrentPageInfo, currentPageInfoAtom, isPageInfoLoadingAtom, pageInfoErrorAtom } from "../atoms/currentPageInfoAtoms";
import { backgroundApi, GameInfo } from "../lib/backgroundApi";
import { COMMENT_GAME_V2_ADDRESS, commentGameV2ABI } from "../lib/contract/abis/commentGameV2";
import { createContractClient } from "../lib/contract/contractClient";
import { logger } from "../lib/injected/logger";
import { isGameEndedByTime } from "../utils/gameTime";

// 테스트용 MockERC20 주소 (MemeCore 테스트넷에 배포됨)
const MOCK_ERC20_ADDRESS = (import.meta.env.VITE_MOCK_ERC20_ADDRESS || "0xfda7278df9b004e05dbaa367fc2246a4a46271c9") as Address;

const MOCK_TOKENS: Record<string, Address> = {
    codingcat: import.meta.env.VITE_MOCK_TOKEN_1 as Address,
    squidmeme: import.meta.env.VITE_MOCK_TOKEN_2 as Address,
    jrbr: import.meta.env.VITE_MOCK_TOKEN_3 as Address,
    jrbr7282: import.meta.env.VITE_MOCK_TOKEN_3 as Address,
    memex: import.meta.env.VITE_MOCK_TOKEN_4 as Address,
};

/**
 * URL에서 username 추출하여 MockToken 주소 반환
 * @param url - 현재 페이지 URL
 * @returns MockToken 주소 또는 기본 MOCK_ERC20_ADDRESS
 */
function getMockTokenAddressFromUrl(url: string): Address {
    const profileMatch = url.match(/\/profile\/([^\/]+)\/[^\/]+/);
    if (profileMatch) {
        const username = decodeURIComponent(profileMatch[1]);
        const mockTokenAddress = MOCK_TOKENS[username];
        console.log("[getMockTokenAddressFromUrl]", {
            url,
            username,
            mockTokenAddress,
            availableTokens: Object.keys(MOCK_TOKENS),
        });
        if (mockTokenAddress) {
            return mockTokenAddress;
        }
    }
    console.log("[getMockTokenAddressFromUrl] fallback to MOCK_ERC20_ADDRESS", {
        url,
        MOCK_ERC20_ADDRESS,
    });
    return MOCK_ERC20_ADDRESS;
}

const MESSAGE_SOURCE = {
    TOKEN_CONTRACT_CACHED: "TOKEN_CONTRACT_CACHED",
    SPA_NAVIGATION: "SPA_NAVIGATION",
    INJECTED_SCRIPT_READY: "INJECTED_SCRIPT_READY",
};

export function useTokenContract() {
    const [currentPageInfo, setCurrentPageInfo] = useAtom(currentPageInfoAtom);
    const [isLoading, setIsLoading] = useAtom(isPageInfoLoadingAtom);
    const [error, setError] = useAtom(pageInfoErrorAtom);
    const [activeGameInfo, setActiveGameInfo] = useAtom(activeGameInfoAtom);
    const [, setIsGameEnded] = useAtom(isGameEndedAtom);
    const [, setEndedGameInfo] = useAtom(endedGameInfoAtom);

    // 중복 조회 방지
    const lastTokenAddressRef = useRef<string | null>(null);
    // Profile 페이지 초기화 중복 방지
    const profileInitializedUrlRef = useRef<string | null>(null);

    // V2 컨트랙트 클라이언트 생성 헬퍼
    const getV2Client = useCallback(() => {
        return createContractClient({
            address: COMMENT_GAME_V2_ADDRESS as Address,
            abi: commentGameV2ABI,
        });
    }, []);

    // 블록체인 GameInfo → ActiveGameInfo 변환 헬퍼
    const toActiveGameInfo = useCallback(
        (gameInfo: BlockchainGameInfo): ActiveGameInfo => ({
            id: gameInfo.id.toString(),
            initiator: gameInfo.initiator,
            gameToken: gameInfo.gameToken,
            cost: gameInfo.cost.toString(),
            gameTime: gameInfo.gameTime.toString(),
            tokenSymbol: gameInfo.tokenSymbol,
            endTime: gameInfo.endTime.toString(),
            lastCommentor: gameInfo.lastCommentor,
            prizePool: gameInfo.prizePool.toString(),
            isClaimed: gameInfo.isClaimed,
            isEnded: gameInfo.isEnded,
            totalFunding: gameInfo.totalFunding.toString(),
            funderCount: gameInfo.funderCount.toString(),
        }),
        [],
    );

    // 게임 상태 설정 헬퍼
    const setGameState = useCallback(
        (gameInfo: ActiveGameInfo | null, isEnded: boolean) => {
            setIsGameEnded(isEnded);
            if (isEnded) {
                setEndedGameInfo(gameInfo);
                setActiveGameInfo(null);
            } else {
                setEndedGameInfo(null);
                setActiveGameInfo(gameInfo);
            }
        },
        [setIsGameEnded, setEndedGameInfo, setActiveGameInfo],
    );

    /**
     * 블록체인에서 활성 게임 ID 조회
     * @returns gameId (bigint) 또는 null
     */
    const fetchActiveGameId = useCallback(
        async (tokenAddress: string): Promise<bigint | null> => {
            try {
                const v2Client = getV2Client();
                logger.info("블록체인에서 활성 게임 ID 조회", { tokenAddress });

                const result = await v2Client.read<bigint>({
                    functionName: "getActiveGameId",
                    args: [tokenAddress as Address],
                });

                if (!result.data || result.data === 0n) {
                    logger.info("블록체인에 활성 게임 없음");
                    return null;
                }

                return result.data;
            } catch (err) {
                logger.error("블록체인 활성 게임 ID 조회 실패", err);
                return null;
            }
        },
        [getV2Client],
    );

    /**
     * 블록체인에서 게임 정보 조회 (gameId로)
     */
    const fetchGameInfoById = useCallback(
        async (gameId: bigint): Promise<BlockchainGameInfo | null> => {
            try {
                const v2Client = getV2Client();
                logger.info("블록체인에서 게임 정보 조회", {
                    gameId: gameId.toString(),
                });

                const result = await v2Client.read<BlockchainGameInfo>({
                    functionName: "getGameInfo",
                    args: [gameId],
                });

                logger.info("게임 정보 조회 완료", {
                    gameId: gameId.toString(),
                    isEnded: result.data.isEnded,
                });

                return result.data;
            } catch (err) {
                logger.error("블록체인 게임 정보 조회 실패", err);
                return null;
            }
        },
        [getV2Client],
    );

    /**
     * 토큰 주소로 게임 정보 조회 (최적화 버전)
     *
     * 흐름:
     * 1. 백엔드 API와 블록체인 RPC를 병렬로 시작 (await 없이)
     * 2. 백엔드 결과가 먼저 오면 즉시 UI 반영 (로딩 해제)
     * 3. 블록체인 결과는 백그라운드에서 처리하여 UI 업데이트
     */
    const fetchGameByToken = useCallback(
        async (tokenAddress: string, forceRefresh = false): Promise<GameInfo | null> => {
            // 중복 조회 방지 (단, activeGameInfo가 null이면 재조회 허용)
            if (!forceRefresh && lastTokenAddressRef.current === tokenAddress && activeGameInfo) {
                logger.debug("이미 조회한 토큰 주소 (게임 정보 있음)", {
                    tokenAddress,
                });
                return null;
            }

            lastTokenAddressRef.current = tokenAddress;
            setIsLoading(true);
            setError(null);

            // URL에서 username 추출하여 MockToken 주소 결정
            const queryTokenAddress = getMockTokenAddressFromUrl(window.location.href);
            logger.info("토큰 주소로 게임 조회 시작", {
                tokenAddress,
                queryTokenAddress,
                url: window.location.href,
            });

            let hasSetInitialState = false;

            // 백엔드 API 호출 (빠름 - 먼저 완료되면 즉시 UI 업데이트)
            const backendPromise = backgroundApi
                .getActiveGameByToken(queryTokenAddress)
                .then((result) => {
                    // gameId가 유효한 경우에만 처리 (null, undefined, 빈 문자열 제외)
                    if (result?.gameId) {
                        // endTime과 현재 시간을 비교하여 실제 종료 여부 계산
                        const isEnded = isGameEndedByTime(result.endTime);

                        logger.info("백엔드 활성 게임 발견, UI 즉시 반영", {
                            gameId: result.gameId,
                            endTime: result.endTime,
                            isEndedByTime: isEnded,
                            isEndedFromDB: result.isEnded,
                        });

                        const backendGameInfo: ActiveGameInfo = {
                            id: result.gameId,
                            initiator: result.initiator,
                            gameToken: result.gameToken,
                            cost: result.cost,
                            gameTime: result.gameTime,
                            tokenSymbol: result.tokenSymbol || "",
                            endTime: result.endTime,
                            lastCommentor: result.lastCommentor,
                            prizePool: result.prizePool,
                            isClaimed: result.isClaimed,
                            isEnded: isEnded, // DB 값 대신 시간 비교 결과 사용
                            totalFunding: result.totalFunding || "0",
                            funderCount: result.funderCount || "0",
                        };

                        setGameState(backendGameInfo, isEnded);
                        hasSetInitialState = true;
                        setIsLoading(false); // 백엔드 결과로 로딩 해제
                    } else if (result) {
                        logger.warn("백엔드 응답에 gameId 누락", { result });
                    }
                    return result;
                })
                .catch((err) => {
                    logger.error("백엔드 게임 조회 실패", err);
                    return null;
                });

            // 블록체인 조회 (느림 - 백그라운드에서 처리, 더 정확한 정보)
            const blockchainPromise = fetchActiveGameId(queryTokenAddress)
                .then(async (gameId) => {
                    if (!gameId) {
                        logger.info("블록체인에 활성 게임 없음");
                        // 백엔드에서 이미 유효한 게임 정보를 받았으면 블록체인 null 결과로 덮어쓰지 않음
                        // (Race condition 방지: 백엔드 응답이 더 신뢰할 수 있는 경우가 많음)
                        if (hasSetInitialState) {
                            logger.info("백엔드 데이터가 있으므로 블록체인 null 결과 무시");
                        }
                        return null;
                    }

                    // gameId로 상세 정보 조회
                    const blockchainGame = await fetchGameInfoById(gameId);
                    if (!blockchainGame) return null;

                    // endTime과 현재 시간을 비교하여 실제 종료 여부 계산
                    const isEnded = isGameEndedByTime(blockchainGame.endTime);

                    const gameInfo = toActiveGameInfo(blockchainGame);
                    // 시간 비교 결과로 isEnded 덮어쓰기
                    gameInfo.isEnded = isEnded;

                    const blockchainGameIdStr = blockchainGame.id.toString();

                    logger.info("블록체인 게임 정보로 UI 업데이트", {
                        blockchainGameId: blockchainGameIdStr,
                        endTime: blockchainGame.endTime.toString(),
                        isEndedByTime: isEnded,
                        isEndedFromContract: blockchainGame.isEnded,
                    });

                    // 블록체인 결과로 UI 업데이트 (시간 비교 결과 사용)
                    setGameState(gameInfo, isEnded);
                    hasSetInitialState = true;

                    return blockchainGame;
                })
                .catch((err) => {
                    logger.error("블록체인 게임 조회 실패", err);
                    return null;
                });

            try {
                // 둘 다 완료될 때까지 대기 (하지만 UI는 이미 업데이트됨)
                const [backendResult] = await Promise.all([backendPromise, blockchainPromise]);

                // 둘 다 게임이 없는 경우
                if (!hasSetInitialState) {
                    logger.info("게임 없음 (백엔드 및 블록체인 모두)", { tokenAddress });
                    setGameState(null, false);
                }

                return backendResult;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "게임 조회 실패";
                logger.error("게임 조회 실패", err);
                setError(errorMessage);
                if (!hasSetInitialState) {
                    setGameState(null, false);
                }
                return null;
            } finally {
                setIsLoading(false);
            }
        },
        [setIsLoading, setError, setGameState, fetchActiveGameId, fetchGameInfoById, toActiveGameInfo, activeGameInfo],
    );

    /**
     * 토큰 컨트랙트 정보 저장 및 게임 조회
     */
    const handleTokenContractCached = useCallback(
        async (data: CurrentPageInfo) => {
            logger.info("토큰 컨트랙트 정보 수신", { ...data });

            setCurrentPageInfo(data);

            // 토큰 주소로 게임 정보 조회
            await fetchGameByToken(data.contractAddress);
        },
        [setCurrentPageInfo, fetchGameByToken],
    );

    // NOTE: 이벤트 드리븐 방식으로 모든 케이스가 커버되므로 폴링 방식 비활성화
    // /**
    //  * window에서 초기 토큰 정보 확인
    //  */
    // const checkInitialTokenInfo = useCallback(() => {
    //   try {
    //     const cachedTokens = (window as any).__SQUID_MEME_TOKEN_CONTRACTS__;
    //     const currentUrl = window.location.href;
    //     const profileMatch = currentUrl.match(/\/profile\/([^\/]+)\/([^\/]+)/);

    //     logger.info("초기 토큰 정보 확인 시작", {
    //       hasCachedTokens: !!cachedTokens,
    //       currentUrl,
    //       isProfilePage: !!profileMatch,
    //     });

    //     if (cachedTokens && typeof cachedTokens === "object" && profileMatch) {
    //       const [, username, userTag] = profileMatch;
    //       const cacheKey = `${username}#${userTag}`;

    //       const tokenInfo = cachedTokens[cacheKey];
    //       logger.info("캐시 확인", { cacheKey, hasTokenInfo: !!tokenInfo });

    //       if (tokenInfo) {
    //         logger.info("초기 토큰 정보 발견", tokenInfo);
    //         // 초기 로딩 시에는 ref 초기화하여 항상 새로 조회
    //         lastTokenAddressRef.current = null;
    //         handleTokenContractCached(tokenInfo);
    //       } else {
    //         logger.info(
    //           "캐시에 토큰 정보 없음, TOKEN_CONTRACT_CACHED 메시지 대기"
    //         );
    //       }
    //     }
    //   } catch (err) {
    //     logger.error("초기 토큰 정보 확인 실패", err);
    //   }
    // }, [handleTokenContractCached]);

    /**
     * SPA 네비게이션 시 상태 초기화
     */
    const resetState = useCallback(() => {
        logger.info("SPA 네비게이션 감지 - 상태 초기화");
        setCurrentPageInfo(null);
        setActiveGameInfo(null);
        setIsGameEnded(null);
        setEndedGameInfo(null);
        setError(null);
        lastTokenAddressRef.current = null;
        profileInitializedUrlRef.current = null; // Profile 초기화 상태도 리셋
    }, [setCurrentPageInfo, setActiveGameInfo, setIsGameEnded, setEndedGameInfo, setError]);

    // MockToken username -> symbol 매핑 (소문자 키)
    const MOCK_TOKEN_SYMBOLS: Record<string, string> = {
        codingcat: "CC",
        squidmeme: "SQM",
        jrbr: "JRBR",
        memex: "M",
    };

    /**
     * Profile 페이지에서 URL 기반 MockToken 게임 조회 시작
     * 메시지 이벤트를 기다리지 않고 즉시 조회
     */
    const initProfilePageGameQuery = useCallback(() => {
        const url = window.location.href;

        // 이미 이 URL에서 초기화했으면 스킵 (무한 루프 방지)
        if (profileInitializedUrlRef.current === url) {
            logger.debug("이미 초기화된 Profile 페이지, 스킵", { url });
            return;
        }

        const profileMatch = url.match(/\/profile\/([^\/]+)\/([^\/]+)/);

        if (profileMatch) {
            const username = decodeURIComponent(profileMatch[1]);
            const userTag = decodeURIComponent(profileMatch[2]);
            const usernameLower = username.toLowerCase();
            const mockTokenAddress = MOCK_TOKENS[usernameLower];

            logger.info("Profile 페이지 감지, MockToken 게임 조회 시작", {
                url,
                username,
                userTag,
                mockTokenAddress,
                availableTokens: Object.keys(MOCK_TOKENS),
            });

            // URL 초기화 완료 표시
            profileInitializedUrlRef.current = url;

            if (mockTokenAddress) {
                // currentPageInfo 설정 (GameSetupModal에서 필요)
                const pageInfo: CurrentPageInfo = {
                    id: `mock-${username}`,
                    contractAddress: mockTokenAddress,
                    username,
                    userTag,
                    symbol: MOCK_TOKEN_SYMBOLS[usernameLower] || username.toUpperCase(),
                    tokenImageUrl: null,
                    timestamp: Date.now(),
                };
                setCurrentPageInfo(pageInfo);

                // MockToken 주소로 직접 게임 조회
                fetchGameByToken(mockTokenAddress, true);
            } else {
                // 매핑된 토큰이 없으면 게임 없음 상태로 설정
                logger.info("매핑된 MockToken 없음, 게임 없음 상태로 설정", { username });
                setGameState(null, false);
                setIsLoading(false);
            }
        }
    }, [fetchGameByToken, setGameState, setIsLoading, setCurrentPageInfo]);

    useEffect(() => {
        // 메시지 리스너 등록
        const handleMessage = (event: MessageEvent) => {
            if (event.source !== window) return;
            if (!event.data || typeof event.data !== "object") return;

            // injected.js 준비 완료 + 캐시된 토큰 정보 수신
            if (event.data.source === MESSAGE_SOURCE.INJECTED_SCRIPT_READY) {
                // Profile 페이지에서 MockToken 매핑이 있으면 항상 MockToken 사용 (실제 토큰 주소 무시)
                const url = window.location.href;
                const profileMatch = url.match(/\/profile\/([^\/]+)\/[^\/]+/);
                if (profileMatch) {
                    const username = decodeURIComponent(profileMatch[1]).toLowerCase();
                    if (MOCK_TOKENS[username]) {
                        logger.info("MockToken 매핑된 Profile 페이지, MockToken으로 덮어쓰기", { username });
                        // ref 초기화하여 항상 새로 조회
                        profileInitializedUrlRef.current = null;
                        initProfilePageGameQuery();
                        return;
                    }
                }

                const { cachedToken } = event.data;
                if (cachedToken?.contractAddress) {
                    logger.info("injected.js 준비 완료 + 캐시된 토큰 정보", cachedToken);
                    handleTokenContractCached(cachedToken);
                } else {
                    // 캐시된 토큰 정보가 없으면 Profile 페이지에서 URL 기반 조회 시도
                    profileInitializedUrlRef.current = null;
                    initProfilePageGameQuery();
                }
                return;
            }

            // SPA 네비게이션 감지 시 상태 초기화 + 캐시된 토큰 정보 처리
            if (event.data.source === MESSAGE_SOURCE.SPA_NAVIGATION) {
                resetState();
                // SPA 네비게이션 후 Profile 페이지인지 확인하고 조회 시도
                // 약간의 딜레이를 주어 URL이 업데이트된 후 확인
                setTimeout(() => {
                    initProfilePageGameQuery();
                }, 100);
                return;
            }

            // 토큰 컨트랙트 캐시 메시지 처리 (이벤트 드리븐)
            if (event.data.source === MESSAGE_SOURCE.TOKEN_CONTRACT_CACHED) {
                const { data } = event.data;
                if (data?.contractAddress) {
                    // Profile 페이지에서 MockToken 매핑이 있으면 무시 (덮어쓰기 방지)
                    const url = window.location.href;
                    const profileMatch = url.match(/\/profile\/([^\/]+)\/[^\/]+/);
                    if (profileMatch) {
                        const username = decodeURIComponent(profileMatch[1]).toLowerCase();
                        if (MOCK_TOKENS[username]) {
                            logger.info("MockToken 매핑된 Profile 페이지, TOKEN_CONTRACT_CACHED 무시", { username });
                            return;
                        }
                    }
                    logger.info("토큰 컨트랙트 캐시 메시지 수신 (이벤트 드리븐)", data);
                    handleTokenContractCached(data);
                }
            }
        };

        window.addEventListener("message", handleMessage);

        // 초기 로드는 INJECTED_SCRIPT_READY 메시지를 기다림
        // (injected.js가 준비되어야 RPC 호출 가능)

        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, [handleTokenContractCached, resetState, initProfilePageGameQuery]);

    return {
        activeGameInfo,
        currentPageInfo,
        isLoading,
        error,
        fetchGameByToken,
    };
}
