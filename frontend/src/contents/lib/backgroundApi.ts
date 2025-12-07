import { browser } from "wxt/browser";
import type {
    BlockchainGameInfo,
    CreateCommentRequest,
    CreateGameRequest,
    JoinRequest,
} from "../../types/request.types";
import type { CommentListResponse, JoinResponse, SaveCommentResponse } from "../../types/response.types";

// Re-export types for convenience
export type {
    CreateCommentRequest,
    CreateGameRequest,
    JoinRequest,
    JoinResponse
};

// BlockchainGameInfo의 직렬화된 버전 (bigint → string)
export interface SerializedGameInfo {
    id: string;
    initiator: string;
    gameToken: string;
    cost: string;
    gameTime: string;
    tokenSymbol: string;
    endTime: string;
    lastCommentor: string;
    prizePool: string;
    isClaimed: boolean;
    isEnded: boolean;
    totalFunding: string;
    funderCount: string;
}

// Background Script와 통신하기 위한 메시지 타입
export type BackgroundMessage =
    | { type: "GET_COMMENTS"; gameId: string; walletAddress?: string }
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
    | { type: "GET_ACTIVE_GAME_BY_TOKEN"; tokenAddress: string }
    | { type: "GET_ACTIVE_GAME_BY_ID"; gameId: string }
    | { type: "SAVE_COMMENT"; data: CreateCommentRequest }
    | { type: "SAVE_GAME"; data: CreateGameRequest }
    | { type: "REGISTER_CLAIM_PRIZE"; gameId: string; txHash: string }
    | { type: "WALLET_CONNECT" }
    | { type: "WALLET_GET_ACCOUNT" }
    | { type: "MEMEX_LOGIN"; triggerLogin?: boolean; syncFromBrowser?: boolean }
    | { type: "NAVIGATE_TO_URL"; url: string }
    | { type: "FETCH_MEMEX_PROFILE_INFO"; username: string; userTag: string }
    | { type: "GET_USER_BY_USERNAME"; username: string; userTag: string }
    | {
        type: "PROFILE_URL_CHANGED";
        username: string;
        userTag: string;
        profileInfo: {
            profileImageUrl: string | null;
            tokenAddr: string | null;
            tokenSymbol: string | null;
            tokenImageUrl: string | null;
            memexWalletAddress: string | null;
        };
        currentUsername?: string | null;
        currentUserTag?: string | null;
    }
    | { type: "JOIN"; data: JoinRequest }
    | { type: "LOGOUT" }
    | { type: "WALLET_DISCONNECT" }
    | { type: "REGISTER_GAME"; data: SerializedGameInfo }
    | { type: "CREATE_GAME_BY_TX"; txHash: string; tokenImageUrl?: string }
    | {
        type: "UPLOAD_IMAGE";
        fileData: string;
        fileName: string;
        mimeType: string;
    }
    | { type: "REFRESH_MEMEX_TAB" }
    | { type: "SAVE_FUNDING"; data: { txHash: string; userAddress?: string } }
    | { type: "GET_PROFILE" }
    | { type: "GET_GAME_RANKING" }
    | { type: "GET_PRIZE_RANKING" }
    | { type: "GET_QUESTS" }
    | { type: "GET_MY_ACTIVE_GAMES" }
    | { type: "GET_LIVE_GAMES" }
    | { type: "GET_MOST_COMMENTS" }
    | { type: "TOGGLE_COMMENT_LIKE"; commentId: number; walletAddress: string }
    | { type: "GET_CURRENT_TAB_URL" };

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
    getComments: async (gameId: string, walletAddress?: string) => {
        return sendToBackground<CommentListResponse>({
            type: "GET_COMMENTS",
            gameId,
            walletAddress,
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

    // 토큰 주소로 활성 게임 조회 (isEnded = false)
    getActiveGameByToken: async (tokenAddress: string) => {
        return sendToBackground<GameInfo | null>({
            type: "GET_ACTIVE_GAME_BY_TOKEN",
            tokenAddress,
        });
    },

    // 댓글 데이터를 백엔드에 저장
    saveComment: async (data: CreateCommentRequest) => {
        return sendToBackground<SaveCommentResponse>({
            type: "SAVE_COMMENT",
            data,
        });
    },

    // 게임 데이터를 백엔드에 저장
    saveGame: async (data: CreateGameRequest) => {
        return sendToBackground<{ gameId: string }>({
            type: "SAVE_GAME",
            data,
        });
    },

    // claimPrize txHash를 백엔드에 등록
    registerClaimPrizeTx: async (gameId: string, txHash: string) => {
        return sendToBackground<{ success: boolean }>({
            type: "REGISTER_CLAIM_PRIZE",
            gameId,
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
    // syncFromBrowser: true면 브라우저 sessionStorage에서 읽어서 익스텐션 storage에 저장
    memexLogin: async (triggerLogin: boolean = false, syncFromBrowser: boolean = false) => {
        return sendToBackground<{ success: boolean }>({
            type: "MEMEX_LOGIN",
            triggerLogin,
            syncFromBrowser,
        });
    },

    // MEMEX 프로필 정보 가져오기 (이미지, 토큰 주소, 토큰 심볼, 토큰 이미지, MEMEX 지갑 주소)
    fetchMemexProfileInfo: async (username: string, userTag: string) => {
        return sendToBackground<{
            profileImageUrl: string | null;
            tokenAddr: string | null;
            tokenSymbol: string | null;
            tokenImageUrl: string | null;
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
    // bigint는 JSON 직렬화 불가하므로 string으로 변환하여 전송
    registerGame: async (data: BlockchainGameInfo) => {
        const serializedData = {
            id: data.id.toString(),
            initiator: data.initiator,
            gameToken: data.gameToken,
            cost: data.cost.toString(),
            gameTime: data.gameTime.toString(),
            tokenSymbol: data.tokenSymbol,
            endTime: data.endTime.toString(),
            lastCommentor: data.lastCommentor,
            prizePool: data.prizePool.toString(),
            isClaimed: data.isClaimed,
            isEnded: data.isEnded,
            totalFunding: data.totalFunding.toString(),
            funderCount: data.funderCount.toString(),
        };
        return sendToBackground<{ gameId: string }>({
            type: "REGISTER_GAME",
            data: serializedData,
        });
    },

    // txHash로 게임 생성 (백엔드에서 이벤트 파싱)
    createGameByTx: async (txHash: string, tokenImageUrl?: string) => {
        return sendToBackground<{ gameId: string }>({
            type: "CREATE_GAME_BY_TX",
            txHash,
            tokenImageUrl,
        });
    },

    // 이미지 업로드 (Supabase Storage)
    uploadImage: async (file: File) => {
        // File을 base64로 변환
        const fileData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // data:image/png;base64,... 에서 base64 부분만 추출
                const base64 = result.split(",")[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        return sendToBackground<{ url: string; path: string }>({
            type: "UPLOAD_IMAGE",
            fileData,
            fileName: file.name,
            mimeType: file.type,
        });
    },

    // MEMEX 탭 새로고침 (content script 재연결용)
    refreshMemexTab: async () => {
        return sendToBackground<{ success: boolean }>({
            type: "REFRESH_MEMEX_TAB",
        });
    },

    // 펀딩 데이터를 백엔드에 저장 (txHash로 PrizePoolFunded 이벤트 파싱)
    saveFunding: async (data: { txHash: string; userAddress?: string }) => {
        return sendToBackground<{ id: number; totalFunding: string; userTotalFunding: string }>({
            type: "SAVE_FUNDING",
            data,
        });
    },

    // username과 userTag로 사용자 조회 (출석 체크 포함)
    getUserByUsername: async (username: string, userTag: string) => {
        return sendToBackground<{
            user: import("../../types/response.types").User | null;
        }>({
            type: "GET_USER_BY_USERNAME",
            username,
            userTag,
        });
    },

    // 프로필 페이지 데이터 조회 (walletAddress 헤더 사용)
    getProfile: async () => {
        return sendToBackground<import("../../types/response.types").ProfilePageData>({
            type: "GET_PROFILE",
        });
    },

    // 토큰별 상금 랭킹 조회 (Game Ranking 탭 / Best Memes)
    getGameRanking: async () => {
        return sendToBackground<import("../../types/response.types").GameRankingResponse>({
            type: "GET_GAME_RANKING",
        });
    },

    // getBestMemes는 getGameRanking의 별칭
    getBestMemes: async () => {
        return sendToBackground<import("../../types/response.types").GameRankingResponse>({
            type: "GET_GAME_RANKING",
        });
    },

    // 유저별 획득 상금 랭킹 조회 (Prize Ranking 탭)
    getPrizeRanking: async () => {
        return sendToBackground<import("../../types/response.types").PrizeRankingResponse>({
            type: "GET_PRIZE_RANKING",
        });
    },

    // 퀘스트 목록 조회 (Quests 탭)
    getQuests: async () => {
        return sendToBackground<import("../../types/response.types").QuestsResponse>({
            type: "GET_QUESTS",
        });
    },

    // 내가 참여 중인 활성 게임 목록 조회 (참여 중인 게임 탭)
    getMyActiveGames: async () => {
        return sendToBackground<import("../../types/response.types").MyActiveGamesResponse>({
            type: "GET_MY_ACTIVE_GAMES",
        });
    },

    // 현재 진행 중인 전체 활성 게임 목록 조회 (Live Games)
    getLiveGames: async () => {
        return sendToBackground<import("../../types/response.types").LiveGamesResponse>({
            type: "GET_LIVE_GAMES",
        });
    },

    // 댓글 수 기준 유저 랭킹 조회 (Most Comments)
    getMostComments: async () => {
        return sendToBackground<import("../../types/response.types").MostCommentsResponse>({
            type: "GET_MOST_COMMENTS",
        });
    },

    // 댓글 좋아요 토글
    toggleCommentLike: async (commentId: number, walletAddress: string) => {
        return sendToBackground<{ liked: boolean; likeCount: number }>({
            type: "TOGGLE_COMMENT_LIKE",
            commentId,
            walletAddress,
        });
    },

    // gameId로 활성 게임 조회
    getActiveGameById: async (gameId: string) => {
        return sendToBackground<{ gameId: string; endTime: string; isClaimed: boolean } | null>({
            type: "GET_ACTIVE_GAME_BY_ID",
            gameId,
        });
    },

    // URL로 현재 탭 이동
    navigateToUrl: async (url: string) => {
        return sendToBackground<{ success: boolean }>({
            type: "NAVIGATE_TO_URL",
            url,
        });
    },

    // 현재 활성 탭의 URL 가져오기
    getCurrentTabUrl: async () => {
        return sendToBackground<{ url: string | null }>({
            type: "GET_CURRENT_TAB_URL",
        });
    },
};

// 게임 정보 타입 (ABI GameInfo 구조체 기준 + DB 필드)
export interface GameInfo {
    id: number;
    gameId: string;
    gameToken: string;
    tokenSymbol: string | null;
    initiator: string;
    gameTime: string;
    endTime: string;
    cost: string;
    prizePool: string;
    isClaimed: boolean;
    isEnded: boolean;
    lastCommentor: string;
    totalFunding: string | null;
    funderCount: string | null;
}
