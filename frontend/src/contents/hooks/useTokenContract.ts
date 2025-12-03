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
   * 블록체인에서 게임 정보 조회 (gameId 또는 tokenAddress)
   * - gameId가 있으면: getGameInfo(gameId) 1회 호출
   * - gameId가 없으면: getActiveGameId(tokenAddress) + getGameInfo(gameId) 2회 호출
   */
  const fetchGameFromBlockchain = useCallback(
    async (params: { gameId?: string; tokenAddress?: string }): Promise<BlockchainGameInfo | null> => {
      try {
        const v2Client = getV2Client();
        let gameId = params.gameId ? BigInt(params.gameId) : null;

        // gameId가 없으면 tokenAddress로 조회
        if (!gameId && params.tokenAddress) {
          logger.info("블록체인에서 활성 게임 ID 조회", { tokenAddress: params.tokenAddress });

          const gameIdResult = await v2Client.read<bigint>({
            functionName: "getActiveGameId",
            args: [params.tokenAddress as Address],
          });

          gameId = gameIdResult.data;
          if (!gameId || gameId === 0n) {
            logger.info("블록체인에 활성 게임 없음");
            return null;
          }
        }

        if (!gameId) {
          logger.warn("gameId 또는 tokenAddress가 필요합니다");
          return null;
        }

        // getGameInfo로 게임 정보 조회
        logger.info("블록체인에서 게임 정보 조회", { gameId: gameId.toString() });

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
        logger.error("블록체인 게임 조회 실패", err);
        return null;
      }
    },
    [getV2Client]
  );

  /**
   * 토큰 주소로 게임 정보 조회
   *
   * 흐름:
   * 1. 백엔드 조회 → 있으면 바로 UI 표시 (빠른 응답)
   * 2. 블록체인 조회 (병렬) → 최신 상태 확인 (isEnded, endTime 등)
   * 3. 블록체인 결과로 상태 업데이트
   * 4. 백엔드에 없고 블록체인에만 있으면 → 백엔드 등록
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
        logger.info("토큰 주소로 게임 조회 시작", { tokenAddress, queryTokenAddress });

        // 1. 백엔드 + 블록체인 동시 조회
        const [backendGame, blockchainGame] = await Promise.all([
          backgroundApi.getGameByToken(queryTokenAddress),
          fetchGameFromBlockchain({ tokenAddress: queryTokenAddress }),
        ]);

        // 2. 블록체인에 활성 게임이 있는 경우 (getActiveGameId > 0)
        if (blockchainGame) {
          const gameInfo = toActiveGameInfo(blockchainGame);
          const blockchainGameId = blockchainGame.id.toString();
          const isSameGame = backendGame?.gameId === blockchainGameId;

          logger.info("블록체인 활성 게임 확인", {
            blockchainGameId,
            backendGameId: backendGame?.gameId || "없음",
            isSameGame,
            isEnded: blockchainGame.isEnded,
          });

          // 블록체인 최신 상태로 UI 업데이트
          setGameState(gameInfo, blockchainGame.isEnded);

          // 백엔드에 없거나 다른 게임이면 등록
          if (!isSameGame) {
            logger.info("새 게임 백엔드 등록", { gameId: blockchainGameId });
            backgroundApi.registerGame(blockchainGame).catch((err) => {
              logger.error("백엔드 게임 등록 실패 (무시)", err);
            });
          }

          // 같은 게임이면 백엔드 데이터 반환 (추가 정보 활용)
          return isSameGame ? backendGame : null;
        }

        // 3. 블록체인에 활성 게임 없음 (getActiveGameId === 0)
        // 백엔드에 게임이 있으면 종료된 게임으로 처리
        if (backendGame) {
          logger.info("블록체인에 활성 게임 없음, 백엔드 게임은 종료됨", {
            gameId: backendGame.gameId,
          });

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
            isEnded: true, // 블록체인에 없으면 종료된 것
            totalFunding: backendGame.totalFunding || "0",
            funderCount: backendGame.funderCount || "0",
          };

          setGameState(gameInfo, true);
          return null;
        }

        // 4. 양쪽 모두 게임 없음
        logger.info("게임 없음 (백엔드 및 블록체인 모두)", { tokenAddress });
        setGameState(null, false);
        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "게임 조회 실패";
        logger.error("게임 조회 실패", err);
        setError(errorMessage);
        setGameState(null, false);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading, setError, setGameState, fetchGameFromBlockchain, toActiveGameInfo]
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
