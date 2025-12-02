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
  currentChallengeIdAtom,
  EndedGameInfo,
  endedGameInfoAtom,
  isGameEndedAtom,
} from "../atoms/commentAtoms";
import {
  isTokenContractLoadingAtom,
  tokenContractAtom,
  tokenContractErrorAtom,
  TokenContractInfo,
} from "../atoms/tokenContractAtoms";
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
};

export function useTokenContract() {
  const [tokenContract, setTokenContract] = useAtom(tokenContractAtom);
  const [isLoading, setIsLoading] = useAtom(isTokenContractLoadingAtom);
  const [error, setError] = useAtom(tokenContractErrorAtom);
  const [, setGameAddress] = useAtom(currentChallengeIdAtom);
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
            gameAddress: gameId, // V2에서는 gameId를 사용
            lastCommentor: gameInfo.lastCommentor,
            isClaimed: gameInfo.isClaimed,
            prizePool: gameInfo.prizePool.toString(),
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

          // 블록체인에서 게임 종료 여부 확인 (V2: gameId로 확인)
          const isEnded = await checkGameEnded(game.gameId);
          setIsGameEnded(isEnded);

          if (isEnded) {
            logger.info("게임이 종료됨 (블록체인 타임스탬프 기준)", {
              gameId: game.gameId,
            });
            // 종료된 게임은 gameId를 null로 설정하여 CreateGame UI 표시
            setGameAddress(null);
            return null;
          }

          // 게임 ID를 currentChallengeIdAtom에 저장
          setGameAddress(game.gameId);

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

          // 게임 종료 여부 확인 (블록체인 GameInfo에서 직접 확인)
          const isEnded = blockchainGame.isEnded;
          setIsGameEnded(isEnded);

          if (isEnded) {
            logger.info("게임이 종료됨", { gameId });

            // 종료된 게임 정보 저장
            const endedInfo: EndedGameInfo = {
              gameAddress: gameId,
              lastCommentor: blockchainGame.lastCommentor,
              isClaimed: blockchainGame.isClaimed,
              prizePool: blockchainGame.prizePool.toString(),
            };
            setEndedGameInfo(endedInfo);

            // 종료된 게임은 gameId를 null로 설정하여 CreateGame UI 표시
            setGameAddress(null);
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

          // 게임 ID를 설정하여 댓글 UI가 표시되도록 함
          setGameAddress(gameId);

          return null;
        }

        logger.info("게임 없음 (백엔드 및 블록체인 모두)", { tokenAddress });
        setGameAddress(null);
        return null;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "게임 조회 실패";
        logger.error("게임 조회 실패", err);
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      setIsLoading,
      setError,
      setGameAddress,
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
    async (data: TokenContractInfo) => {
      logger.info("토큰 컨트랙트 정보 수신", { ...data });

      setTokenContract(data);

      // 토큰 주소로 게임 정보 조회
      await fetchGameByToken(data.contractAddress);
    },
    [setTokenContract, fetchGameByToken]
  );

  /**
   * window에서 초기 토큰 정보 확인
   */
  const checkInitialTokenInfo = useCallback(() => {
    try {
      const cachedTokens = (window as any).__SQUID_MEME_TOKEN_CONTRACTS__;
      if (cachedTokens && typeof cachedTokens === "object") {
        // 현재 URL에서 username/usertag 추출
        const currentUrl = window.location.href;
        const profileMatch = currentUrl.match(/\/profile\/([^\/]+)\/([^\/]+)/);

        if (profileMatch) {
          const [, username, userTag] = profileMatch;
          const cacheKey = `${username}#${userTag}`;

          const tokenInfo = cachedTokens[cacheKey];
          if (tokenInfo) {
            logger.info("초기 토큰 정보 발견", tokenInfo);
            // 초기 로딩 시에는 ref 초기화하여 항상 새로 조회
            lastTokenAddressRef.current = null;
            handleTokenContractCached(tokenInfo);
          }
        }
      }
    } catch (err) {
      logger.error("초기 토큰 정보 확인 실패", err);
    }
  }, [handleTokenContractCached]);

  useEffect(() => {
    // 메시지 리스너 등록
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.source !== MESSAGE_SOURCE.TOKEN_CONTRACT_CACHED) return;

      const { data } = event.data;
      if (data?.contractAddress) {
        handleTokenContractCached(data);
      }
    };

    window.addEventListener("message", handleMessage);

    // 초기 토큰 정보 확인 (약간의 딜레이 후)
    const timeoutId = setTimeout(() => {
      checkInitialTokenInfo();
    }, 500);

    return () => {
      window.removeEventListener("message", handleMessage);
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
