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
import {
  ActiveGameInfo,
  activeGameInfoAtom,
  endedGameInfoAtom,
  isGameEndedAtom,
} from "../atoms/commentAtoms";
import {
  CurrentPageInfo,
  currentPageInfoAtom,
  isPageInfoLoadingAtom,
  pageInfoErrorAtom,
} from "../atoms/currentPageInfoAtoms";
import { backgroundApi, GameInfo } from "../lib/backgroundApi";
import {
  COMMENT_GAME_V2_ADDRESS,
  commentGameV2ABI,
} from "../lib/contract/abis/commentGameV2";
import { createContractClient } from "../lib/contract/contractClient";
import { logger } from "../lib/injected/logger";

// 테스트용 MockERC20 주소 (MemeCore 테스트넷에 배포됨)
const MOCK_ERC20_ADDRESS = (import.meta.env.VITE_MOCK_ERC20_ADDRESS ||
  "0xfda7278df9b004e05dbaa367fc2246a4a46271c9") as Address;

const MESSAGE_SOURCE = {
  TOKEN_CONTRACT_CACHED: "TOKEN_CONTRACT_CACHED",
  SPA_NAVIGATION: "SPA_NAVIGATION",
  INJECTED_SCRIPT_READY: "INJECTED_SCRIPT_READY",
};

export function useTokenContract() {
  const [currentPageInfo, setCurrentPageInfo] = useAtom(currentPageInfoAtom);
  const [isLoading, setIsLoading] = useAtom(isPageInfoLoadingAtom);
  const [error, setError] = useAtom(pageInfoErrorAtom);
  const [, setActiveGameInfo] = useAtom(activeGameInfoAtom);
  const [, setIsGameEnded] = useAtom(isGameEndedAtom);
  const [, setEndedGameInfo] = useAtom(endedGameInfoAtom);

  // 중복 조회 방지
  const lastTokenAddressRef = useRef<string | null>(null);

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
    []
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
    [setIsGameEnded, setEndedGameInfo, setActiveGameInfo]
  );

  /**
   * 블록체인에서 gameId로 게임 정보 조회
   */
  const fetchGameById = useCallback(
    async (gameId: string): Promise<BlockchainGameInfo | null> => {
      try {
        logger.info("블록체인에서 게임 조회 (gameId)", { gameId });

        const result = await getV2Client().read<BlockchainGameInfo>({
          functionName: "getGameInfo",
          args: [BigInt(gameId)],
        });

        logger.info("게임 정보 조회 완료", {
          gameId,
          isEnded: result.data.isEnded,
        });

        return result.data;
      } catch (err) {
        logger.error("게임 정보 조회 실패", err);
        return null;
      }
    },
    [getV2Client]
  );

  /**
   * 블록체인에서 토큰 주소로 활성 게임 조회
   */
  const fetchActiveGameByToken = useCallback(
    async (tokenAddress: string): Promise<BlockchainGameInfo | null> => {
      try {
        logger.info("블록체인에서 활성 게임 조회 (tokenAddress)", {
          tokenAddress,
        });

        const v2Client = getV2Client();

        // getActiveGameId로 활성 게임 ID 조회
        const gameIdResult = await v2Client.read<bigint>({
          functionName: "getActiveGameId",
          args: [tokenAddress as Address],
        });

        const gameId = gameIdResult.data;
        if (!gameId || gameId === 0n) {
          logger.info("블록체인에 활성 게임 없음");
          return null;
        }

        // gameId로 게임 정보 조회
        return await fetchGameById(gameId.toString());
      } catch (err) {
        logger.error("활성 게임 조회 실패", err);
        return null;
      }
    },
    [getV2Client, fetchGameById]
  );

  /**
   * 토큰 주소로 게임 정보 조회
   * 1. 백엔드 API에서 gameId 조회
   * 2. 블록체인에서 최신 상태 확인 (isEnded 등)
   * 3. 백엔드에 없으면 블록체인에서 직접 조회
   */
  const fetchGameByToken = useCallback(
    async (
      tokenAddress: string,
      forceRefresh = false
    ): Promise<GameInfo | null> => {
      // 중복 조회 방지
      if (!forceRefresh && lastTokenAddressRef.current === tokenAddress) {
        logger.debug("이미 조회한 토큰 주소", { tokenAddress });
        return null;
      }

      lastTokenAddressRef.current = tokenAddress;
      setIsLoading(true);
      setError(null);

      try {
        const queryTokenAddress = MOCK_ERC20_ADDRESS;
        logger.info("토큰 주소로 게임 조회 시작", {
          tokenAddress,
          queryTokenAddress,
        });

        // 1. 백엔드 API에서 게임 조회
        const backendGame = await backgroundApi.getGameByToken(
          queryTokenAddress
        );

        if (backendGame) {
          logger.info("백엔드에서 게임 정보 조회 성공", {
            gameId: backendGame.gameId,
            tokenSymbol: backendGame.tokenSymbol,
          });

          // 2. 블록체인에서 최신 상태 확인
          const blockchainGame = await fetchGameById(backendGame.gameId);

          if (blockchainGame) {
            const gameInfo = toActiveGameInfo(blockchainGame);
            const isEnded = blockchainGame.isEnded;

            logger.info(isEnded ? "게임이 종료됨" : "게임이 진행 중", {
              gameId: backendGame.gameId,
            });

            setGameState(gameInfo, isEnded);
            return isEnded ? null : backendGame;
          }

          // 블록체인 조회 실패 시 백엔드 데이터 사용
          const gameInfo: ActiveGameInfo = {
            id: backendGame.gameId,
            initiator: backendGame.initiator,
            gameToken: backendGame.gameToken,
            cost: backendGame.cost,
            gameTime: backendGame.gameTime,
            tokenSymbol: backendGame.tokenSymbol || "",
            endTime: backendGame.endTime,
            lastCommentor: backendGame.lastCommentor,
            prizePool: backendGame.prizePool,
            isClaimed: backendGame.isClaimed,
            isEnded: backendGame.isEnded,
            totalFunding: backendGame.totalFunding || "0",
            funderCount: backendGame.funderCount || "0",
          };

          setGameState(gameInfo, backendGame.isEnded);
          return backendGame.isEnded ? null : backendGame;
        }

        // 3. 백엔드에 없으면 블록체인에서 직접 조회
        logger.info("백엔드에 게임 없음, 블록체인 조회 시도");
        const blockchainGame = await fetchActiveGameByToken(queryTokenAddress);

        if (blockchainGame) {
          const gameInfo = toActiveGameInfo(blockchainGame);
          const isEnded = blockchainGame.isEnded;

          logger.info(isEnded ? "게임이 종료됨" : "블록체인에서 게임 발견", {
            gameId: gameInfo.id,
          });

          setGameState(gameInfo, isEnded);

          // 진행 중인 게임은 백엔드에 등록
          if (!isEnded) {
            backgroundApi.registerGame(blockchainGame).catch((err) => {
              logger.error("백엔드 게임 등록 실패 (무시)", err);
            });
          }

          return null;
        }

        logger.info("게임 없음 (백엔드 및 블록체인 모두)", { tokenAddress });
        setGameState(null, false);
        return null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "게임 조회 실패";
        logger.error("게임 조회 실패", err);
        setError(errorMessage);
        setGameState(null, false);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      setIsLoading,
      setError,
      setGameState,
      fetchGameById,
      fetchActiveGameByToken,
      toActiveGameInfo,
    ]
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
    [setCurrentPageInfo, fetchGameByToken]
  );

  /**
   * window에서 초기 토큰 정보 확인
   */
  const checkInitialTokenInfo = useCallback(() => {
    try {
      const cachedTokens = (window as any).__SQUID_MEME_TOKEN_CONTRACTS__;
      const currentUrl = window.location.href;
      const profileMatch = currentUrl.match(/\/profile\/([^\/]+)\/([^\/]+)/);

      logger.info("초기 토큰 정보 확인 시작", {
        hasCachedTokens: !!cachedTokens,
        currentUrl,
        isProfilePage: !!profileMatch,
      });

      if (cachedTokens && typeof cachedTokens === "object" && profileMatch) {
        const [, username, userTag] = profileMatch;
        const cacheKey = `${username}#${userTag}`;

        const tokenInfo = cachedTokens[cacheKey];
        logger.info("캐시 확인", { cacheKey, hasTokenInfo: !!tokenInfo });

        if (tokenInfo) {
          logger.info("초기 토큰 정보 발견", tokenInfo);
          // 초기 로딩 시에는 ref 초기화하여 항상 새로 조회
          lastTokenAddressRef.current = null;
          handleTokenContractCached(tokenInfo);
        } else {
          logger.info(
            "캐시에 토큰 정보 없음, TOKEN_CONTRACT_CACHED 메시지 대기"
          );
        }
      }
    } catch (err) {
      logger.error("초기 토큰 정보 확인 실패", err);
    }
  }, [handleTokenContractCached]);

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
  }, [
    setCurrentPageInfo,
    setActiveGameInfo,
    setIsGameEnded,
    setEndedGameInfo,
    setError,
  ]);

  useEffect(() => {
    // 메시지 리스너 등록
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (!event.data || typeof event.data !== "object") return;

      // injected.js 준비 완료 + 캐시된 토큰 정보 수신
      if (event.data.source === MESSAGE_SOURCE.INJECTED_SCRIPT_READY) {
        const { cachedToken } = event.data;
        if (cachedToken?.contractAddress) {
          logger.info("injected.js 준비 완료 + 캐시된 토큰 정보", cachedToken);
          handleTokenContractCached(cachedToken);
        }
        return;
      }

      // SPA 네비게이션 감지 시 상태 초기화 + 캐시된 토큰 정보 처리
      if (event.data.source === MESSAGE_SOURCE.SPA_NAVIGATION) {
        resetState();
        // 캐시된 토큰 정보가 있으면 즉시 처리
        const { cachedToken } = event.data;
        if (cachedToken?.contractAddress) {
          logger.info("SPA 네비게이션 + 캐시된 토큰 정보", cachedToken);
          handleTokenContractCached(cachedToken);
        }
        // 없으면 TOKEN_CONTRACT_CACHED 메시지를 기다림
        return;
      }

      // 토큰 컨트랙트 캐시 메시지 처리 (이벤트 드리븐)
      if (event.data.source === MESSAGE_SOURCE.TOKEN_CONTRACT_CACHED) {
        const { data } = event.data;
        if (data?.contractAddress) {
          logger.info("토큰 컨트랙트 캐시 메시지 수신 (이벤트 드리븐)", data);
          handleTokenContractCached(data);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // 초기 토큰 정보 확인 (이미 캐시되어 있는 경우)
    checkInitialTokenInfo();

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [handleTokenContractCached, checkInitialTokenInfo, resetState]);

  return {
    currentPageInfo,
    isLoading,
    error,
    fetchGameByToken,
  };
}
