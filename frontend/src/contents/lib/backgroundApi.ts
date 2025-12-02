import { browser } from "wxt/browser";
import type {
  BlockchainGameInfo,
  CreateCommentRequest,
  CreateGameRequest,
  JoinRequest,
} from "../../types/request.types";
import type { JoinResponse } from "../../types/response.types";

// Re-export types for convenience
export type { CreateCommentRequest, CreateGameRequest, JoinRequest, JoinResponse };

// Background Script와 통신하기 위한 메시지 타입
export type BackgroundMessage =
  | { type: "GET_COMMENTS"; gameAddress: string }
  | {
      type: "CREATE_COMMENT";
      challengeId: string;
      playerAddress: string;
      content: string;
    }
  | { type: "DELETE_COMMENT"; commentId: number }
  | { type: "HEALTH_CHECK" }
  | { type: "OPEN_SIDE_PANEL" }
  | { type: "GET_STORAGE"; key: string; area?: "session" | "local" }
  | { type: "SET_STORAGE"; key: string; value: any; area?: "session" | "local" }
  | { type: "REMOVE_STORAGE"; key: string; area?: "session" | "local" }
  | { type: "GET_GAME_BY_TOKEN"; tokenAddress: string }
  | { type: "SAVE_COMMENT"; data: CreateCommentRequest }
  | { type: "SAVE_GAME"; data: CreateGameRequest }
  | { type: "REGISTER_CLAIM_PRIZE"; gameAddress: string; txHash: string }
  | { type: "WALLET_CONNECT" }
  | { type: "WALLET_GET_ACCOUNT" }
  | { type: "MEMEX_LOGIN"; triggerLogin?: boolean }
  | { type: "NAVIGATE_TO_URL"; url: string }
  | { type: "FETCH_MEMEX_PROFILE_INFO"; username: string; userTag: string }
  | { type: "JOIN"; data: JoinRequest }
  | { type: "LOGOUT" }
  | { type: "WALLET_DISCONNECT" }
  | { type: "REGISTER_GAME"; data: BlockchainGameInfo };

export type BackgroundResponse<T = any> =
  | { success: true; data: T }
  | { success: false; error: string };

// Chrome runtime 가져오기 (content script, sidepanel 모두 지원)
function getRuntime() {
  // @ts-ignore
  if (typeof browser !== "undefined" && browser?.runtime) {
    // @ts-ignore
    return browser.runtime;
  }
  // @ts-ignore
  if (typeof chrome !== "undefined" && chrome?.runtime) {
    // @ts-ignore
    return chrome.runtime;
  }
  return null;
}

// Background Script로 메시지 전송
export async function sendToBackground<T>(
  message: BackgroundMessage
): Promise<T> {
  return new Promise((resolve, reject) => {
    const runtime = getRuntime();

    if (!runtime) {
      console.error("❌ Chrome Extension API를 찾을 수 없습니다.");
      reject(new Error("Chrome Extension API를 찾을 수 없습니다."));
      return;
    }

    console.log("📤 [backgroundApi] sendMessage:", message.type);

    runtime.sendMessage(message, (response: BackgroundResponse<T>) => {
      const lastError = runtime.lastError;

      if (lastError) {
        console.error("❌ Runtime 오류:", lastError);
        reject(new Error(lastError.message || "메시지 전송 실패"));
        return;
      }

      console.log("📥 [backgroundApi] response:", response);

      if (!response) {
        reject(
          new Error(
            "응답이 없습니다. Background Script가 실행 중인지 확인하세요."
          )
        );
        return;
      }

      if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error || "알 수 없는 오류가 발생했습니다."));
      }
    });
  });
}

// API 클라이언트 (Background Script와 통신)
export const backgroundApi = {
  // 댓글 목록
  getComments: async (gameAddress: string) => {
    return sendToBackground<Array<any>>({
      type: "GET_COMMENTS",
      gameAddress,
    });
  },

  // 댓글 작성
  createComment: async (input: {
    challengeId: string;
    playerAddress: string;
    content: string;
  }) => {
    return sendToBackground<any>({
      type: "CREATE_COMMENT",
      challengeId: input.challengeId,
      playerAddress: input.playerAddress,
      content: input.content,
    });
  },

  // 댓글 삭제
  deleteComment: async (commentId: number) => {
    return sendToBackground<void>({
      type: "DELETE_COMMENT",
      commentId,
    });
  },

  // Health check
  healthCheck: async () => {
    return sendToBackground<{
      status: string;
      timestamp: string;
      supabase: string;
    }>({
      type: "HEALTH_CHECK",
    });
  },

  // 사이드 패널 열기 (Background Script에서 처리)
  openSidePanel: async () => {
    return sendToBackground<void>({
      type: "OPEN_SIDE_PANEL",
    });
  },

  // Storage 읽기
  getStorage: async <T = any>(
    key: string,
    area: "session" | "local" = "session"
  ): Promise<T | null> => {
    return sendToBackground<T | null>({
      type: "GET_STORAGE",
      key,
      area,
    });
  },

  // Storage 저장
  setStorage: async (
    key: string,
    value: any,
    area: "session" | "local" = "session"
  ): Promise<void> => {
    return sendToBackground<void>({
      type: "SET_STORAGE",
      key,
      value,
      area,
    });
  },

  // Storage 삭제
  removeStorage: async (
    key: string,
    area: "session" | "local" = "session"
  ): Promise<void> => {
    return sendToBackground<void>({
      type: "REMOVE_STORAGE",
      key,
      area,
    });
  },

  // 토큰 주소로 게임 정보 조회
  getGameByToken: async (tokenAddress: string) => {
    return sendToBackground<GameInfo | null>({
      type: "GET_GAME_BY_TOKEN",
      tokenAddress,
    });
  },

  // 댓글 데이터를 백엔드에 저장
  saveComment: async (data: CreateCommentRequest) => {
    return sendToBackground<{ id: number }>({
      type: "SAVE_COMMENT",
      data,
    });
  },

  // 게임 데이터를 백엔드에 저장
  saveGame: async (data: CreateGameRequest) => {
    return sendToBackground<{ gameAddress: string }>({
      type: "SAVE_GAME",
      data,
    });
  },

  // claimPrize txHash를 백엔드에 등록
  registerClaimPrizeTx: async (gameAddress: string, txHash: string) => {
    return sendToBackground<{ success: boolean }>({
      type: "REGISTER_CLAIM_PRIZE",
      gameAddress,
      txHash,
    });
  },

  // 지갑 연결 요청 (sidepanel -> content script)
  walletConnect: async () => {
    return sendToBackground<{ address: string }>({
      type: "WALLET_CONNECT",
    });
  },

  // 현재 연결된 지갑 계정 조회
  walletGetAccount: async () => {
    return sendToBackground<{ address: string | null; isConnected: boolean }>({
      type: "WALLET_GET_ACCOUNT",
    });
  },

  // MEMEX 로그인 상태 확인 (triggerLogin: true면 Google 버튼 클릭도 수행)
  memexLogin: async (triggerLogin: boolean = false) => {
    return sendToBackground<{ success: boolean }>({
      type: "MEMEX_LOGIN",
      triggerLogin,
    });
  },

  // URL로 이동 (MEMEX 탭에서)
  navigateToUrl: async (url: string) => {
    return sendToBackground<{ success: boolean }>({
      type: "NAVIGATE_TO_URL",
      url,
    });
  },

  // MEMEX 프로필 정보 가져오기 (이미지, 토큰 주소, 토큰 심볼, MEMEX 지갑 주소)
  fetchMemexProfileInfo: async (username: string, userTag: string) => {
    return sendToBackground<{
      profileImageUrl: string | null;
      tokenAddr: string | null;
      tokenSymbol: string | null;
      memexWalletAddress: string | null;
    }>({
      type: "FETCH_MEMEX_PROFILE_INFO",
      username,
      userTag,
    });
  },

  // Join 요청 (백엔드에 사용자 등록)
  join: async (data: JoinRequest) => {
    return sendToBackground<JoinResponse>({
      type: "JOIN",
      data,
    });
  },

  // 로그아웃 (gtm_user_identifier 및 지갑 연결 상태 초기화)
  logout: async () => {
    return sendToBackground<{ success: boolean }>({
      type: "LOGOUT",
    });
  },

  // 지갑 연결 해제 (MetaMask disconnect)
  walletDisconnect: async () => {
    return sendToBackground<{ success: boolean }>({
      type: "WALLET_DISCONNECT",
    });
  },

  // 블록체인에서 조회한 게임 등록 (txHash 없이)
  registerGame: async (data: BlockchainGameInfo) => {
    return sendToBackground<{ gameId: string }>({
      type: "REGISTER_GAME",
      data,
    });
  },
};

// 게임 정보 타입
export interface GameInfo {
  id: number;
  gameId: string;
  gameAddress: string;
  gameToken: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  initiator: string;
  gameTime: string;
  endTime: string;
  cost: string;
  prizePool: string;
  isEnded: boolean;
  lastCommentor: string;
}
