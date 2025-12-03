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
  EndedGameInfo,
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

  /**
   * 블록체인에서 게임 종료 여부 확인 (V2: gameId로 조회)
   * getGameInfo(gameId)로 종료 여부 및 상세 정보 한번에 조회
   */
  const checkGameEnded = useCallback(
    async (gameId: string): Promise<boolean> => {
      try {
        logger.info("게임 종료 여부 확인 시작 (V2)", { gameId });

        const v2Client = createContractClient({
          address: COMMENT_GAME_V2_ADDRESS as Address,
          abi: commentGameV2ABI,
        });

        // getGameInfo로 게임 정보 조회 (isEnded 포함)
        const gameInfoResult = await v2Client.read<{
          id: bigint;
          initiator: Address;
          gameToken: Address;
          cost: bigint;
          gameTime: bigint;
          tokenSymbol: string;
          endTime: bigint;
          lastCommentor: Address;
          prizePool: bigint;
          isClaimed: boolean;
          isEnded: boolean;
          totalFunding: bigint;
          funderCount: bigint;
        }>({
          functionName: "getGameInfo",
          args: [BigInt(gameId)],
        });

        const gameInfo = gameInfoResult.data;
        const isEnded = gameInfo.isEnded;

        logger.info("게임 종료 여부 확인 완료 (V2)", {
          gameId,
          endTime: gameInfo.endTime.toString(),
          isEnded,
        });

        // 게임이 종료된 경우 종료 정보 저장
        if (isEnded) {
          const endedInfo: EndedGameInfo = {
            id: gameId,
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
          };

          logger.info("종료된 게임 정보", { ...endedInfo });
          setEndedGameInfo(endedInfo);
        } else {
          // 게임이 진행 중이면 종료 정보 초기화
          setEndedGameInfo(null);
        }

        return isEnded;
      } catch (err) {
        logger.error("게임 종료 여부 확인 실패", err);
        // 에러 시 false 반환 (게임 진행 중으로 가정)
        return false;
      }
    },
    [setEndedGameInfo]
  );

  /**
   * 블록체인에서 직접 게임 정보 조회 (V2: 전체 GameInfo 반환)
   */
  const fetchGameFromBlockchain = useCallback(
    async (tokenAddress: string): Promise<BlockchainGameInfo | null> => {
      try {
        logger.info("블록체인에서 게임 조회 시작 (V2)", {
          tokenAddress,
        });

        const v2Client = createContractClient({
          address: COMMENT_GAME_V2_ADDRESS as Address,
          abi: commentGameV2ABI,
        });

        // getActiveGameId로 활성 게임 ID 조회
        const gameIdResult = await v2Client.read<bigint>({
          functionName: "getActiveGameId",
          args: [tokenAddress as Address],
        });

        const gameId = gameIdResult.data;

        // 게임이 없는 경우 (gameId가 0)
        if (!gameId || gameId === 0n) {
          logger.info("블록체인에 활성 게임 없음");
          return null;
        }

        // getGameInfo로 전체 게임 정보 조회
        const gameInfoResult = await v2Client.read<BlockchainGameInfo>({
          functionName: "getGameInfo",
          args: [gameId],
        });

        const gameInfo = gameInfoResult.data;

        logger.info("블록체인에서 활성 게임 발견", {
          gameId: gameInfo.id.toString(),
          tokenSymbol: gameInfo.tokenSymbol,
          isEnded: gameInfo.isEnded,
        });

        return gameInfo;
      } catch (err) {
        logger.error("블록체인 게임 조회 실패", err);
        return null;
      }
    },
    []
  );

  /**
   * 토큰 주소로 게임 정보 조회
   * 1. 먼저 백엔드 API 조회
   * 2. 백엔드에 없으면 블록체인에서 직접 조회
   */
  const fetchGameByToken = useCallback(
    async (
      tokenAddress: string,
      forceRefresh = false
    ): Promise<GameInfo | null> => {
      // 중복 조회 방지 (forceRefresh가 아닌 경우에만)
      if (!forceRefresh && lastTokenAddressRef.current === tokenAddress) {
        logger.debug("이미 조회한 토큰 주소", { tokenAddress });
        return null;
      }

      lastTokenAddressRef.current = tokenAddress;
      setIsLoading(true);
      setError(null);

      try {
        // 현재는 MockToken 주소를 사용하여 조회
        // TODO: 밈코어 메인넷에 올라갈 땐 프로필 URL에서 토큰 주소를 사용하여 조회
        const queryTokenAddress = MOCK_ERC20_ADDRESS;
        logger.info("토큰 주소로 게임 조회 시작", {
          tokenAddress,
          queryTokenAddress,
        });

        // 1. 백엔드 API에서 게임 조회 (MockToken 주소 사용)
        const game = await backgroundApi.getGameByToken(queryTokenAddress);

        if (game) {
          logger.info("백엔드에서 게임 정보 조회 성공", {
            gameId: game.gameId,
            tokenSymbol: game.tokenSymbol,
          });

          // 백엔드 GameInfo → ActiveGameInfo/EndedGameInfo 변환
          const gameInfo: ActiveGameInfo = {
            id: game.gameId,
            initiator: game.initiator,
            gameToken: game.gameToken,
            cost: game.cost,
            gameTime: game.gameTime,
            tokenSymbol: game.tokenSymbol || "",
            endTime: game.endTime,
            lastCommentor: game.lastCommentor,
            prizePool: game.prizePool,
            isClaimed: game.isClaimed,
            isEnded: game.isEnded,
            totalFunding: game.totalFunding || "0",
            funderCount: game.funderCount || "0",
          };

          // 먼저 백엔드 데이터 기준으로 UI 표시 (블록체인 호출 실패해도 UI 표시됨)
          if (game.isEnded) {
            logger.info("게임이 종료됨 (백엔드 데이터 기준)", {
              gameId: game.gameId,
            });
            setIsGameEnded(true);
            setEndedGameInfo(gameInfo);
            setActiveGameInfo(null);
            return null;
          }

          // 게임이 진행 중이면 activeGameInfo 설정
          setActiveGameInfo(gameInfo);
          setIsGameEnded(false);

          // 블록체인에서 최신 종료 여부 확인 (백그라운드로, 실패해도 무시)
          checkGameEnded(game.gameId).then((isEnded) => {
            if (isEnded) {
              logger.info("게임이 종료됨 (블록체인 타임스탬프 기준)", {
                gameId: game.gameId,
              });
              setIsGameEnded(true);
              setActiveGameInfo(null);
              // checkGameEnded에서 이미 endedGameInfo 설정됨
            }
          }).catch((err) => {
            logger.warn("블록체인 종료 여부 확인 실패 (무시)", err);
          });

          return game;
        }

        // 2. 백엔드에 없으면 블록체인에서 직접 조회 (V2: 전체 GameInfo 반환)
        logger.info("백엔드에 게임 없음, 블록체인 조회 시도");
        const blockchainGame = await fetchGameFromBlockchain(queryTokenAddress);

        if (blockchainGame) {
          const gameId = blockchainGame.id.toString();

          logger.info("블록체인에서 기존 게임 발견", {
            gameId,
            tokenSymbol: blockchainGame.tokenSymbol,
          });

          // 블록체인 GameInfo → ActiveGameInfo/EndedGameInfo 변환
          const gameInfo: ActiveGameInfo = {
            id: gameId,
            initiator: blockchainGame.initiator,
            gameToken: blockchainGame.gameToken,
            cost: blockchainGame.cost.toString(),
            gameTime: blockchainGame.gameTime.toString(),
            tokenSymbol: blockchainGame.tokenSymbol,
            endTime: blockchainGame.endTime.toString(),
            lastCommentor: blockchainGame.lastCommentor,
            prizePool: blockchainGame.prizePool.toString(),
            isClaimed: blockchainGame.isClaimed,
            isEnded: blockchainGame.isEnded,
            totalFunding: blockchainGame.totalFunding.toString(),
            funderCount: blockchainGame.funderCount.toString(),
          };

          // 게임 종료 여부 확인 (블록체인 GameInfo에서 직접 확인)
          const isEnded = blockchainGame.isEnded;
          setIsGameEnded(isEnded);

          if (isEnded) {
            logger.info("게임이 종료됨", { gameId });
            setEndedGameInfo(gameInfo);
            setActiveGameInfo(null);
            return null;
          }

          // 게임이 진행 중이면 백엔드에 등록
          try {
            logger.info("백엔드에 게임 등록 시도", { gameId });
            await backgroundApi.registerGame(blockchainGame);
            logger.info("백엔드에 게임 등록 완료", { gameId });
          } catch (registerErr) {
            logger.error("백엔드 게임 등록 실패 (계속 진행)", registerErr);
          }

          setActiveGameInfo(gameInfo);
          return null;
        }

        logger.info("게임 없음 (백엔드 및 블록체인 모두)", { tokenAddress });
        setActiveGameInfo(null);
        return null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "게임 조회 실패";
        logger.error("게임 조회 실패", err);
        setError(errorMessage);
        // 에러 발생 시에도 activeGameInfo를 null로 설정하여 NoGameSection 표시
        setActiveGameInfo(null);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      setIsLoading,
      setError,
      setActiveGameInfo,
      setIsGameEnded,
      setEndedGameInfo,
      fetchGameFromBlockchain,
      checkGameEnded,
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
          logger.info("캐시에 토큰 정보 없음, TOKEN_CONTRACT_CACHED 메시지 대기");
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
  }, [setCurrentPageInfo, setActiveGameInfo, setIsGameEnded, setEndedGameInfo, setError]);

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
