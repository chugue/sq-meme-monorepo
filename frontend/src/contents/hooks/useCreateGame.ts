/**
 * 게임 생성 전체 플로우 훅 (V2)
 *
 * CommentGameV2 컨트랙트 사용:
 * 1. approve - 토큰을 CommentGameV2에 승인
 * 2. createGame - CommentGameV2에서 게임 생성 (initialFunding 포함)
 * 3. addComment - 첫 댓글 작성 (gameId 기반)
 */

import { useCallback, useState } from "react";
import type { Address } from "viem";
import { backgroundApi, type CreateCommentRequest } from "../lib/backgroundApi";
import {
  COMMENT_GAME_V2_ADDRESS,
  commentGameV2ABI,
  type GameInfo,
} from "../lib/contract/abis/commentGameV2";
import { createContractClient } from "../lib/contract/contractClient";
import { logger } from "../lib/injected/logger";
import { injectedApi } from "../lib/injectedApi";
import { useWallet } from "./useWallet";

// 테스트용 MockERC20 주소 (Insectarium 테스트넷에 배포됨)
const MOCK_ERC20_ADDRESS = (import.meta.env.VITE_MOCK_ERC20_ADDRESS ||
  "0xfda7278df9b004e05dbaa367fc2246a4a46271c9") as Address;

// ERC20 ABI (approve, allowance, balanceOf 필요)
const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export type CreateGameStep =
  | "idle"
  | "checking"
  | "approve"
  | "create"
  | "firstComment"
  | "complete"
  | "error";

export interface GameSettings {
  tokenAddress: Address;
  initialFunding: bigint; // 초기 펀딩 금액 (wei 단위) - V2 필수
  cost: bigint; // 댓글 비용 (wei 단위)
  time: number; // 타이머 (초)
  firstComment: string; // 첫 댓글 내용 (필수)
  firstCommentImage?: string; // 첫 댓글 이미지 URL (선택)
}

export interface ExistingGameInfo {
  gameId: bigint;
  tokenSymbol: string;
  isEnded: boolean;
}

export interface UseCreateGameReturn {
  step: CreateGameStep;
  status: string;
  error: string | null;
  txHash: string | null;
  gameId: string | null;
  existingGame: ExistingGameInfo | null;
  createGame: (settings: GameSettings) => Promise<string | null>;
  checkExistingGame: (
    tokenAddress: Address
  ) => Promise<ExistingGameInfo | null>;
  reset: () => void;
}

/**
 * 게임 생성 전체 플로우 훅 (V2)
 */
export function useCreateGame(): UseCreateGameReturn {
  const { address: userAddress, ensureNetwork } = useWallet();
  const [step, setStep] = useState<CreateGameStep>("idle");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [existingGame, setExistingGame] = useState<ExistingGameInfo | null>(
    null
  );

  /**
   * 상태 초기화
   */
  const reset = useCallback(() => {
    setStep("idle");
    setStatus("");
    setError(null);
    setTxHash(null);
    setGameId(null);
    setExistingGame(null);
  }, []);

  /**
   * 기존 게임 확인 (V2: getActiveGameId 사용)
   */
  const checkExistingGame = useCallback(
    async (tokenAddress: Address): Promise<ExistingGameInfo | null> => {
      try {
        setStep("checking");
        setStatus("기존 게임 확인 중...");

        // TODO: 밈코어 메인넷 배포시 실제 토큰으로 변경 필요, currentPageInfo에서 꺼내서 사용
        const actualTokenAddress = MOCK_ERC20_ADDRESS;

        logger.info("기존 게임 확인 (V2)", {
          originalTokenAddress: tokenAddress,
          actualTokenAddress,
        });

        const v2Client = createContractClient({
          address: COMMENT_GAME_V2_ADDRESS as Address,
          abi: commentGameV2ABI,
        });

        // getActiveGameId로 활성 게임 ID 조회
        const activeGameIdResult = await v2Client.read<bigint>({
          functionName: "getActiveGameId",
          args: [actualTokenAddress],
        });

        const activeGameId = activeGameIdResult.data;

        // 게임 ID가 0이면 활성 게임 없음
        if (activeGameId === 0n) {
          logger.info("활성 게임 없음");
          setExistingGame(null);
          setStep("idle");
          setStatus("");
          return null;
        }

        // 게임 정보 조회
        const gameInfoResult = await v2Client.read<GameInfo>({
          functionName: "getGameInfo",
          args: [activeGameId],
        });

        const gameInfo = gameInfoResult.data;

        const existingGameInfo: ExistingGameInfo = {
          gameId: gameInfo.id,
          tokenSymbol: gameInfo.tokenSymbol,
          isEnded: gameInfo.isEnded,
        };

        logger.info("기존 게임 발견 (V2)", {
          gameId: gameInfo.id.toString(),
          tokenSymbol: gameInfo.tokenSymbol,
          isEnded: gameInfo.isEnded,
          endTime: gameInfo.endTime.toString(),
        });

        setExistingGame(existingGameInfo);
        setStep("idle");
        setStatus("");
        return existingGameInfo;
      } catch (err) {
        logger.error("기존 게임 확인 실패", err);
        setStep("idle");
        setStatus("");
        return null;
      }
    },
    []
  );

  /**
   * 게임 생성 전체 플로우 실행 (V2)
   */
  const createGame = useCallback(
    async (settings: GameSettings): Promise<string | null> => {
      if (!userAddress) {
        setError("지갑이 연결되지 않았습니다.");
        setStep("error");
        return null;
      }

      try {
        // 네트워크 확인
        await ensureNetwork();

        // TODO: 밈코어 메인넷 배포시 실제 토큰으로 변경 필요, currentPageInfo에서 꺼내서 사용
        const actualTokenAddress = MOCK_ERC20_ADDRESS;
        const v2ContractAddress = COMMENT_GAME_V2_ADDRESS as Address;

        // 필요한 총 토큰: initialFunding + cost (첫 댓글용)
        const totalRequired = settings.initialFunding + settings.cost;

        logger.info("게임 생성 플로우 시작 (V2)", {
          originalTokenAddress: settings.tokenAddress,
          actualTokenAddress,
          initialFunding: settings.initialFunding.toString(),
          cost: settings.cost.toString(),
          totalRequired: totalRequired.toString(),
          time: settings.time,
          creator: userAddress,
        });

        // ============================================
        // Step 1: Approve - 토큰 승인 (CommentGameV2에)
        // ============================================
        setStep("approve");
        setStatus("토큰 승인 중... (1/3)");

        // 사용자의 토큰 잔액 조회
        const userBalance = (await injectedApi.readContract({
          address: actualTokenAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [userAddress as Address],
        })) as bigint;

        logger.info("사용자 토큰 잔액", { balance: userBalance.toString() });

        if (userBalance < totalRequired) {
          throw new Error(
            `토큰 잔액이 부족합니다. 필요: ${totalRequired.toString()}, 보유: ${userBalance.toString()}`
          );
        }

        // 현재 allowance 확인
        const currentAllowance = (await injectedApi.readContract({
          address: actualTokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [userAddress as Address, v2ContractAddress],
        })) as bigint;

        logger.info("현재 allowance", {
          currentAllowance: currentAllowance.toString(),
        });

        // allowance가 부족하면 approve 실행 (max uint256으로 한 번만 승인)
        // 이렇게 하면 이후 게임 생성/댓글 시 approve 없이 바로 진행 가능
        const MAX_UINT256 = 2n ** 256n - 1n;

        if (currentAllowance < totalRequired) {
          logger.info("Approve 필요 (max uint256으로 승인)", {
            currentAllowance: currentAllowance.toString(),
            required: totalRequired.toString(),
          });

          const approveResult = await injectedApi.writeContract({
            address: actualTokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [v2ContractAddress, MAX_UINT256],
          });

          logger.info("Approve 트랜잭션 전송됨", { hash: approveResult });
          setStatus("토큰 승인 확인 대기 중...");

          // 트랜잭션 확정 대기
          await injectedApi.waitForTransaction(approveResult);
        } else {
          logger.info("이미 충분한 allowance 있음");
        }

        // ============================================
        // Step 2: Create Game - 게임 생성 (V2)
        // ============================================
        setStep("create");
        setStatus("게임 생성 중... (2/3)");

        const v2Client = createContractClient({
          address: v2ContractAddress,
          abi: commentGameV2ABI,
        });

        // createGame(token, time, cost, initialFunding) - V2 시그니처
        const result = await v2Client.write(
          {
            functionName: "createGame",
            args: [
              actualTokenAddress,
              BigInt(settings.time),
              settings.cost,
              settings.initialFunding,
            ],
          },
          userAddress as Address
        );

        logger.info("게임 생성 트랜잭션 전송됨", { hash: result.hash });
        setTxHash(result.hash);
        setStatus("트랜잭션 확인 대기 중...");

        // 트랜잭션 확정 대기
        const createGameReceipt = await injectedApi.waitForTransaction(
          result.hash
        );

        logger.info("게임 생성 트랜잭션 확정됨", {
          hash: result.hash,
          blockNumber: createGameReceipt.blockNumber,
          logsCount: createGameReceipt.logs.length,
        });

        // DB에 게임 정보 등록 (백엔드에서 txHash로 이벤트 파싱)
        // TODO: tokenImageUrl은 실제 토큰 이미지 URL로 변경 필요
        const createGameResult = await backgroundApi.createGameByTx(result.hash);

        if (!createGameResult?.gameId) {
          throw new Error("게임 생성에 실패했습니다.");
        }

        const createdGameId = createGameResult.gameId;

        setGameId(createdGameId);

        logger.info("게임 생성 완료", { gameId: createdGameId });

        // ============================================
        // Step 3: First Comment - 첫 댓글 작성 (V2)
        // ============================================
        setStep("firstComment");
        setStatus("첫 댓글 작성 중... (3/3)");

        // addComment(gameId, message) - V2 시그니처
        // 가스를 명시적으로 설정 (펀더에게 분배하는 루프 때문에 가스 추정이 실패할 수 있음)
        const commentResult = await v2Client.write(
          {
            functionName: "addComment",
            args: [createdGameId, settings.firstComment],
            gas: 500000n,
          },
          userAddress as Address
        );

        logger.info("첫 댓글 트랜잭션 전송됨", { hash: commentResult.hash });
        setStatus("첫 댓글 확인 대기 중...");

        // 트랜잭션 확정 대기
        const commentReceipt = await injectedApi.waitForTransaction(
          commentResult.hash
        );

        logger.info("첫 댓글 트랜잭션 확정됨", {
          hash: commentResult.hash,
          blockNumber: commentReceipt.blockNumber,
          logsCount: commentReceipt.logs.length,
        });

        const commentApiRequest: CreateCommentRequest = {
          txHash: commentResult.hash,
          imageUrl: settings.firstCommentImage,
        };

        const savedComment = await backgroundApi.saveComment(commentApiRequest);
        logger.info("백엔드에 첫 댓글 저장 완료", {
          commentId: savedComment?.id,
        });

        // ============================================
        // Complete
        // ============================================
        setStep("complete");
        setStatus("게임 생성 완료!");

        logger.info("게임 생성 플로우 완료 (V2)", {
          txHash: result.hash,
          gameId: createdGameId.toString(),
        });

        // 게임 ID를 문자열로 반환
        return createdGameId.toString();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "게임 생성 실패";
        logger.error("게임 생성 플로우 오류", err);
        setError(errorMessage);
        setStep("error");
        return null;
      }
    },
    [userAddress, ensureNetwork]
  );

  return {
    step,
    status,
    error,
    txHash,
    gameId,
    existingGame,
    createGame,
    checkExistingGame,
    reset,
  };
}
