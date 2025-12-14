import {
    BackgroundMessage,
    BackgroundResponse,
    SerializedGameInfo,
} from "../contents/lib/backgroundApi";
import type { JoinRequest } from "../types/request.types";
import type {
    CommentListResponse,
    SaveCommentResponse,
} from "../types/response.types";
import { apiCall, apiUpload } from "./api";
import { openSidePanel } from "./sidepanel";

/**
 * MEMEX 탭을 찾는 헬퍼 함수
 * @returns MEMEX 탭 배열
 * @throws 탭이 없으면 에러 발생
 */
async function isMemexTabs(): Promise<any[]> {
    const { browser } = await import("wxt/browser");
    const tabs = browser?.tabs || (globalThis as any).chrome?.tabs;

    const memexTabs = await tabs.query({
        url: [
            "https://app.memex.xyz/*",
            "http://app.memex.xyz/*",
        ],
    });

    if (memexTabs.length === 0) {
        throw new Error("MEMEX에서 실행해주세요.");
    }

    return memexTabs;
}

export function createMessageHandler() {
    return (
        message: BackgroundMessage,
        sender: any,
        sendResponse: (response: BackgroundResponse) => void,
    ): boolean => {
        // 비동기 응답 처리
        (async () => {
            try {
                let result: BackgroundResponse;

                switch (message.type) {
                    case "GET_COMMENTS": {
                        const walletAddress = (message as any).walletAddress;
                        const response = await apiCall<{ success: boolean; data: CommentListResponse }>(
                            `/v1/comments/game/${encodeURIComponent(message.gameId)}`, {
                            headers: walletAddress ? { "x-wallet-address": walletAddress } : undefined,
                        });
                        result = { success: true, data: response.data };
                        break;
                    }

                    case "CREATE_COMMENT": {
                        const response = await apiCall<{ comment: any }>("/api/comments", {
                            method: "POST",
                            body: JSON.stringify({
                                challenge_id: message.challengeId,
                                player_address: message.playerAddress,
                                content: message.content,
                                signature: (message as any).signature,
                                message: (message as any).message
                            }),
                        });
                        result = { success: true, data: response.comment };
                        break;
                    }

                    case "HEALTH_CHECK": {
                        const response = await apiCall<{
                            status: string;
                            timestamp: string;
                            supabase: string;
                        }>("/health");
                        result = { success: true, data: response };
                        break;
                    }

                    case "OPEN_SIDE_PANEL": {
                        try {
                            await openSidePanel(sender.tab?.id ?? 0);
                            result = { success: true, data: undefined };
                        } catch (error: any) {
                            console.error("❌ 사이드 패널 열기 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "사이드 패널 열기 실패",
                            };
                        }
                        break;
                    }

                    case "GET_STORAGE": {
                        try {
                            const { browser } = await import("wxt/browser");
                            const storage =
                                browser?.storage ||
                                (globalThis as any).chrome?.storage;
                            const area = (message as any).area || "session";
                            const storageArea =
                                area === "local"
                                    ? storage.local
                                    : storage.session;

                            const data = await new Promise<any>(
                                (resolve, reject) => {
                                    storageArea.get(
                                        [(message as any).key],
                                        (result: any) => {
                                            const runtime =
                                                browser?.runtime ||
                                                (globalThis as any).chrome
                                                    ?.runtime;
                                            if (runtime?.lastError) {
                                                reject(
                                                    new Error(
                                                        runtime.lastError.message,
                                                    ),
                                                );
                                                return;
                                            }
                                            resolve(
                                                result[(message as any).key] ||
                                                null,
                                            );
                                        },
                                    );
                                },
                            );

                            result = { success: true, data };
                        } catch (error: any) {
                            console.error("❌ Storage 읽기 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "Storage 읽기 실패",
                            };
                        }
                        break;
                    }

                    case "SET_STORAGE": {
                        const runtime =
                            (await import("wxt/browser")).browser?.runtime ||
                            (globalThis as any).chrome?.runtime;
                        if (sender.id !== runtime?.id) {
                            result = {
                                success: false,
                                error: "Storage 쓰기 권한이 없습니다. 익스텐션 내부에서만 가능합니다.",
                            };
                            break;
                        }

                        try {
                            const { browser } = await import("wxt/browser");
                            const storage =
                                browser?.storage ||
                                (globalThis as any).chrome?.storage;
                            const area = (message as any).area || "session";
                            const storageArea =
                                area === "local"
                                    ? storage.local
                                    : storage.session;

                            await new Promise<void>((resolve, reject) => {
                                storageArea.set(
                                    {
                                        [(message as any).key]: (message as any)
                                            .value,
                                    },
                                    () => {
                                        const runtime =
                                            browser?.runtime ||
                                            (globalThis as any).chrome?.runtime;
                                        if (runtime?.lastError) {
                                            reject(
                                                new Error(
                                                    runtime.lastError.message,
                                                ),
                                            );
                                            return;
                                        }
                                        resolve();
                                    },
                                );
                            });

                            result = { success: true, data: undefined };
                        } catch (error: any) {
                            console.error("❌ Storage 저장 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "Storage 저장 실패",
                            };
                        }
                        break;
                    }

                    case "REMOVE_STORAGE": {
                        const runtime =
                            (await import("wxt/browser")).browser?.runtime ||
                            (globalThis as any).chrome?.runtime;
                        if (sender.id !== runtime?.id) {
                            result = {
                                success: false,
                                error: "Storage 삭제 권한이 없습니다. 익스텐션 내부에서만 가능합니다.",
                            };
                            break;
                        }

                        try {
                            const { browser } = await import("wxt/browser");
                            const storage = browser?.storage || (globalThis as any).chrome?.storage;
                            const area = (message as any).area || "session";
                            const storageArea =
                                area === "local"
                                    ? storage.local
                                    : storage.session;

                            await new Promise<void>((resolve, reject) => {
                                storageArea.remove(
                                    [(message as any).key],
                                    () => {
                                        const runtime =
                                            browser?.runtime ||
                                            (globalThis as any).chrome?.runtime;
                                        if (runtime?.lastError) {
                                            reject(
                                                new Error(
                                                    runtime.lastError.message,
                                                ),
                                            );
                                            return;
                                        }
                                        resolve();
                                    },
                                );
                            });

                            result = { success: true, data: undefined };
                        } catch (error: any) {
                            console.error("❌ Storage 삭제 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "Storage 삭제 실패",
                            };
                        }
                        break;
                    }

                    case "GET_GAME_BY_TOKEN": {
                        try {
                            const response = await apiCall<any>(
                                `/v1/games/by-token/${encodeURIComponent(
                                    message.tokenAddress,
                                )}`,
                            );
                            result = { success: true, data: response };
                        } catch (error: any) {
                            const errorMsg = error.message || "";
                            if (
                                errorMsg.includes("404") ||
                                errorMsg.includes("Not Found")
                            ) {
                                result = { success: true, data: null };
                            } else {
                                console.error("❌ 게임 조회 오류:", error);
                                result = {
                                    success: false,
                                    error:
                                        error instanceof Error
                                            ? error.message
                                            : "게임 조회 실패",
                                };
                            }
                        }
                        break;
                    }

                    case "GET_ACTIVE_GAME_BY_TOKEN": {
                        try {
                            const response = await apiCall<any>(
                                `/v1/games/active/by-token/${encodeURIComponent(
                                    message.tokenAddress,
                                )}`,
                            );
                            result = { success: true, data: response };
                        } catch (error: any) {
                            const errorMsg = error.message || "";
                            if (
                                errorMsg.includes("404") ||
                                errorMsg.includes("Not Found")
                            ) {
                                result = { success: true, data: null };
                            } else {
                                console.error("❌ 활성 게임 조회 오류:", error);
                                result = {
                                    success: false,
                                    error:
                                        error instanceof Error
                                            ? error.message
                                            : "활성 게임 조회 실패",
                                };
                            }
                        }
                        break;
                    }

                    case "GET_ACTIVE_GAME_BY_ID": {
                        try {
                            const response = await apiCall<{
                                success: boolean;
                                data: {
                                    gameId: string;
                                    endTime: string;
                                    isClaimed: boolean;
                                };
                            }>(
                                `/v1/games/active/${encodeURIComponent(
                                    message.gameId,
                                )}`,
                            );
                            result = { success: true, data: response.data };
                        } catch (error: any) {
                            const errorMsg = error.message || "";
                            if (
                                errorMsg.includes("404") ||
                                errorMsg.includes("Not Found")
                            ) {
                                result = { success: true, data: null };
                            } else {
                                console.error(
                                    "❌ 활성 게임 조회 (ID) 오류:",
                                    error,
                                );
                                result = {
                                    success: false,
                                    error:
                                        error instanceof Error
                                            ? error.message
                                            : "활성 게임 조회 실패",
                                };
                            }
                        }
                        break;
                    }

                    case "SAVE_COMMENT": {
                        try {
                            const response = await apiCall<{
                                success: boolean;
                                data: SaveCommentResponse;
                            }>("/v1/comments", {
                                method: "POST",
                                body: JSON.stringify(message.data),
                            });
                            result = { success: true, data: response.data };
                        } catch (error: any) {
                            console.error("❌ 댓글 저장 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "댓글 저장 실패",
                            };
                        }
                        break;
                    }

                    case "SAVE_GAME": {
                        try {
                            const response = await apiCall<{
                                success: boolean;
                                data: { gameId: string };
                            }>("/v1/games", {
                                method: "POST",
                                body: JSON.stringify(message.data),
                            });
                            result = { success: true, data: response.data };
                        } catch (error: any) {
                            console.error("❌ 게임 저장 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "게임 저장 실패",
                            };
                        }
                        break;
                    }

                    case "REGISTER_GAME": {
                        const { data } = message as {
                            type: string;
                            data: SerializedGameInfo;
                        };
                        try {
                            const payload = {
                                gameId: data.id,
                                initiator: data.initiator,
                                gameToken: data.gameToken,
                                cost: data.cost,
                                gameTime: data.gameTime,
                                tokenSymbol: data.tokenSymbol,
                                endTime: data.endTime,
                                lastCommentor: data.lastCommentor,
                                prizePool: data.prizePool,
                                isClaimed: data.isClaimed,
                                isEnded: data.isEnded,
                                totalFunding: data.totalFunding,
                                funderCount: data.funderCount,
                            };
                            const response = await apiCall<{
                                success: boolean;
                                data: { gameId: string };
                            }>("/v1/games/register", {
                                method: "POST",
                                body: JSON.stringify(payload),
                            });
                            result = { success: true, data: response.data };
                        } catch (error: any) {
                            console.error("❌ 게임 등록 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "게임 등록 실패",
                            };
                        }
                        break;
                    }

                    case "CREATE_GAME_BY_TX": {
                        const { txHash, tokenImageUrl } = message as {
                            type: string;
                            txHash: string;
                            tokenImageUrl?: string;
                        };
                        try {
                            const response = await apiCall<{
                                success: boolean;
                                data: { gameId: string };
                            }>("/v1/games/create-by-tx", {
                                method: "POST",
                                body: JSON.stringify({ txHash, tokenImageUrl }),
                            });
                            result = { success: true, data: response.data };
                        } catch (error: any) {
                            console.error("❌ 게임 생성 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "게임 생성 실패",
                            };
                        }
                        break;
                    }

                    case "REGISTER_CLAIM_PRIZE": {
                        try {
                            const response = await apiCall<{
                                success: boolean;
                            }>(
                                `/v1/games/${encodeURIComponent(
                                    message.gameId,
                                )}/claim`,
                                {
                                    method: "POST",
                                    body: JSON.stringify({
                                        txHash: message.txHash,
                                    }),
                                },
                            );
                            result = { success: true, data: response };
                        } catch (error: any) {
                            console.error("❌ claimPrize 등록 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "claimPrize 등록 실패",
                            };
                        }
                        break;
                    }

                    case "PROFILE_URL_CHANGED": {
                        // NOTE: 프로필 캐시 버그로 인해 local storage 저장 비활성화
                        // 내 프로필인 경우 session storage 업데이트만 수행
                        const {
                            username,
                            userTag,
                            profileInfo,
                            currentUsername,
                            currentUserTag,
                        } = message as {
                            type: string;
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
                        };

                        try {
                            const { browser } = await import("wxt/browser");
                            const storage =
                                browser?.storage ||
                                (globalThis as any).chrome?.storage;

                            const sessionState = await new Promise<any>(
                                (resolve, reject) => {
                                    storage.session.get(
                                        ["squid_session_state"],
                                        (result: any) => {
                                            const runtime =
                                                browser?.runtime ||
                                                (globalThis as any).chrome
                                                    ?.runtime;
                                            if (runtime?.lastError) {
                                                reject(
                                                    new Error(
                                                        runtime.lastError.message,
                                                    ),
                                                );
                                                return;
                                            }
                                            resolve(
                                                result.squid_session_state ||
                                                null,
                                            );
                                        },
                                    );
                                },
                            );

                            // currentUsername과 currentUserTag가 둘 다 있어야만 내 프로필인지 확인
                            // 웹에서 로그아웃 상태면 (currentUsername = null) 절대 내 프로필로 처리하지 않음
                            // 이전 버그: sessionState에서 fallback하면 잘못된 사용자 정보가 저장될 수 있음
                            const isMyProfile =
                                currentUsername &&
                                currentUserTag &&
                                currentUsername === username &&
                                currentUserTag === userTag;

                            // 내 프로필인 경우에만 session storage 업데이트
                            if (isMyProfile) {
                                const updatedState = {
                                    ...sessionState,
                                    isMemexLoggedIn: true,
                                    memexUsername: username,
                                    memexUserTag: userTag,
                                    memexProfileImage:
                                        profileInfo.profileImageUrl,
                                    memexWalletAddress:
                                        profileInfo.memexWalletAddress,
                                    myTokenAddr: profileInfo.tokenAddr,
                                    myTokenSymbol: profileInfo.tokenSymbol,
                                    myTokenImageUrl: profileInfo.tokenImageUrl,
                                };

                                await new Promise<void>((resolve, reject) => {
                                    storage.session.set(
                                        { squid_session_state: updatedState },
                                        () => {
                                            const runtime =
                                                browser?.runtime ||
                                                (globalThis as any).chrome
                                                    ?.runtime;
                                            if (runtime?.lastError) {
                                                reject(
                                                    new Error(
                                                        runtime.lastError.message,
                                                    ),
                                                );
                                                return;
                                            }
                                            resolve();
                                        },
                                    );
                                });
                            }
                            // 다른 사람 프로필은 더 이상 local storage에 캐시하지 않음

                            // 토큰 정보가 있으면 백엔드 API에 저장 (upsert)
                            // tokenImageUrl이 있어야만 저장 (빈 값이면 스킵)
                            if (
                                profileInfo.tokenAddr &&
                                profileInfo.tokenImageUrl
                            ) {
                                try {
                                    await apiCall("/v1/tokens", {
                                        method: "POST",
                                        body: JSON.stringify({
                                            tokenAddress: profileInfo.tokenAddr,
                                            tokenUsername: username,
                                            tokenUsertag: userTag,
                                            tokenImageUrl:
                                                profileInfo.tokenImageUrl,
                                            tokenSymbol:
                                                profileInfo.tokenSymbol,
                                        }),
                                    });
                                } catch (tokenError: any) {
                                    // 토큰 저장 실패는 무시 (주요 기능에 영향 없음)
                                    console.warn(
                                        "⚠️ [Background] 토큰 정보 저장 실패:",
                                        tokenError.message,
                                    );
                                }
                            } else if (
                                profileInfo.tokenAddr &&
                                !profileInfo.tokenImageUrl
                            ) {
                                // tokenImageUrl 없음, 토큰 저장 스킵
                            }

                            result = { success: true, data: { success: true } };
                        } catch (error: any) {
                            console.error(
                                "❌ PROFILE_URL_CHANGED 오류:",
                                error,
                            );
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "프로필 정보 저장 실패",
                            };
                        }
                        break;
                    }

                    case "FETCH_MEMEX_PROFILE_INFO": {
                        const { username, userTag } = message as {
                            type: string;
                            username: string;
                            userTag: string;
                        };
                        try {
                            // Background에서 직접 fetch (CORS 제약 없음, 페이지 이동 불필요)
                            const profileUrl = `https://app.memex.xyz/profile/${username}/${userTag}`;

                            const response = await fetch(profileUrl);
                            if (!response.ok) {
                                throw new Error(
                                    `Fetch failed: ${response.status}`,
                                );
                            }

                            const html = await response.text();

                            let profileImageUrl: string | null = null;
                            let tokenAddr: string | null = null;
                            let tokenSymbol: string | null = null;
                            let memexWalletAddress: string | null = null;

                            // tokenAddress 패턴 (이스케이프된 JSON 내부)
                            const tokenMatch = html.match(
                                /\\?"tokenAddress\\?"\\?:\s*\\?"(0x[a-fA-F0-9]{40})\\?"/,
                            );
                            if (tokenMatch && tokenMatch[1]) {
                                tokenAddr = tokenMatch[1];
                            }

                            // walletAddress 패턴
                            const walletMatch = html.match(
                                /\\?"walletAddress\\?"\\?:\s*\\?"(0x[a-fA-F0-9]{40})\\?"/,
                            );
                            if (walletMatch && walletMatch[1]) {
                                memexWalletAddress = walletMatch[1];
                            }

                            // profileImage 패턴 (여러 가지 시도)
                            let profileImgMatch = html.match(
                                /\\?"profileImage\\?"\\?:\s*\\?"(https?:[^"\\]+)\\?"/,
                            );
                            // 패턴 2: \"profileImage\":\"https:\/\/...\"
                            if (!profileImgMatch) {
                                profileImgMatch = html.match(
                                    /"profileImage":"(https?:\/\/[^"]+)"/,
                                );
                            }
                            // 패턴 3: 이스케이프된 URL (https:\\/\\/)
                            if (!profileImgMatch) {
                                profileImgMatch = html.match(
                                    /profileImage[^:]*:\s*[\\"]*(https?:\\?\/\\?\/[^"\\,\}]+)/,
                                );
                            }
                            if (profileImgMatch && profileImgMatch[1]) {
                                profileImageUrl = profileImgMatch[1].replace(
                                    /\\\//g,
                                    "/",
                                );
                            }

                            // tokenSymbol 패턴
                            const symbolMatch = html.match(
                                /\\?"tokenSymbol\\?"\\?:\s*\\?"([^"\\]+)\\?"/,
                            );
                            if (symbolMatch && symbolMatch[1]) {
                                tokenSymbol = symbolMatch[1];
                            }

                            result = {
                                success: true,
                                data: {
                                    profileImageUrl,
                                    tokenAddr,
                                    tokenSymbol,
                                    tokenImageUrl: null,
                                    memexWalletAddress,
                                },
                            };
                        } catch (error: any) {
                            console.error(
                                "❌ FETCH_MEMEX_PROFILE_INFO 오류:",
                                error,
                            );
                            result = {
                                success: true,
                                data: {
                                    profileImageUrl: null,
                                    tokenAddr: null,
                                    tokenSymbol: null,
                                    tokenImageUrl: null,
                                    memexWalletAddress: null,
                                },
                            };
                        }
                        break;
                    }

                    case "JOIN": {
                        const { data } = message as {
                            type: string;
                            data: JoinRequest;
                        };

                        if (!data) {
                            result = {
                                success: false,
                                error: "walletAddress is required",
                            };
                            break;
                        }

                        try {
                            const joinPayload = {
                                walletAddress: data.walletAddress,
                                userName: data.username,
                                userTag: data.userTag,
                                profileImage: data.profileImageUrl,
                                memexLink: data.memeXLink,
                                memexWalletAddress: data.memexWalletAddress,
                                myTokenAddr: data.myTokenAddr,
                                myTokenSymbol: data.myTokenSymbol,
                            };
                            const bodyString = JSON.stringify(joinPayload);
                            const response = await apiCall<{
                                success: boolean;
                                data: { user: any; isNew: boolean };
                            }>("/v1/users/join", {
                                method: "POST",
                                body: bodyString,
                            });

                            if (response.data?.user) {
                                const { browser } = await import("wxt/browser");
                                const storage =
                                    browser?.storage ||
                                    (globalThis as any).chrome?.storage;
                                await new Promise<void>((resolve, reject) => {
                                    storage.session.set(
                                        { squid_user: response.data.user },
                                        () => {
                                            const runtime =
                                                browser?.runtime ||
                                                (globalThis as any).chrome
                                                    ?.runtime;
                                            if (runtime?.lastError) {
                                                reject(
                                                    new Error(
                                                        runtime.lastError.message,
                                                    ),
                                                );
                                                return;
                                            }
                                            resolve();
                                        },
                                    );
                                });
                            }

                            result = {
                                success: true,
                                data: {
                                    user: response.data?.user,
                                    isNew: response.data?.isNew,
                                },
                            };
                        } catch (error: any) {
                            console.error("❌ JOIN 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "Join 요청 실패",
                            };
                        }
                        break;
                    }

                    case "LOGOUT": {
                        try {
                            const { browser } = await import("wxt/browser");
                            const storage =
                                browser?.storage ||
                                (globalThis as any).chrome?.storage;
                            const tabs =
                                browser?.tabs ||
                                (globalThis as any).chrome?.tabs;

                            // 익스텐션의 session storage만 삭제 (브라우저의 sessionStorage는 건드리지 않음)
                            await new Promise<void>((resolve, reject) => {
                                storage.session.remove(
                                    [
                                        "gtm_user_identifier", // 익스텐션에 저장된 복사본만 삭제
                                        "squid_user",
                                        "squid_session_state",
                                        "squid_login_check_completed",
                                    ],
                                    () => {
                                        const runtime =
                                            browser?.runtime ||
                                            (globalThis as any).chrome?.runtime;
                                        if (runtime?.lastError) {
                                            reject(
                                                new Error(
                                                    runtime.lastError.message,
                                                ),
                                            );
                                            return;
                                        }
                                        resolve();
                                    },
                                );
                            });

                            await new Promise<void>((resolve, reject) => {
                                storage.local.remove(
                                    ["walletAddress", "isWalletConnected"],
                                    () => {
                                        const runtime =
                                            browser?.runtime ||
                                            (globalThis as any).chrome?.runtime;
                                        if (runtime?.lastError) {
                                            reject(
                                                new Error(
                                                    runtime.lastError.message,
                                                ),
                                            );
                                            return;
                                        }
                                        resolve();
                                    },
                                );
                            });

                            // 모든 MEMEX 탭에 로그아웃 메시지 전송 (UI 숨김 + inject script 캐시 초기화)
                            try {
                                const memexTabs = await isMemexTabs();

                                // 모든 탭에 메시지 전송
                                for (const tab of memexTabs) {
                                    if (tab.id) {
                                        try {
                                            // UI 숨김 메시지
                                            await tabs.sendMessage(tab.id, {
                                                type: "HIDE_SQUID_UI",
                                            });
                                            // Inject script 캐시 초기화 메시지
                                            await tabs.sendMessage(tab.id, {
                                                type: "LOGOUT_INJECT_SCRIPT",
                                            });
                                        } catch {
                                            // 개별 탭 메시지 전송 실패는 무시
                                        }
                                    }
                                }
                            } catch {
                                // Content Script 메시지 전송 실패는 무시
                            }

                            result = { success: true, data: { success: true } };
                        } catch (error: any) {
                            console.error("❌ LOGOUT 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "로그아웃 실패",
                            };
                        }
                        break;
                    }

                    case "UPLOAD_IMAGE": {
                        try {
                            const { fileData, fileName, mimeType } =
                                message as {
                                    type: string;
                                    fileData: string;
                                    fileName: string;
                                    mimeType: string;
                                };

                            const byteCharacters = atob(fileData);
                            const byteNumbers = new Array(
                                byteCharacters.length,
                            );
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const blob = new Blob([byteArray], {
                                type: mimeType,
                            });

                            const formData = new FormData();
                            formData.append("file", blob, fileName);

                            const response = await apiUpload<{
                                success: boolean;
                                data: { url: string; path: string };
                            }>("/v1/upload/image", formData);

                            result = { success: true, data: response.data };
                        } catch (error: any) {
                            console.error("❌ 이미지 업로드 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "이미지 업로드 실패",
                            };
                        }
                        break;
                    }

                    case "WALLET_CONNECT":
                    case "WALLET_GET_ACCOUNT":
                    case "WALLET_DISCONNECT": {
                        try {
                            const scripting = (globalThis as any).chrome?.scripting;
                            const memexTabs = await isMemexTabs();

                            const targetTab = memexTabs[0];
                            if (!targetTab?.id) {
                                result = {
                                    success: false,
                                    error: "MEMEX 탭 ID를 찾을 수 없습니다.",
                                };
                                break;
                            }

                            const injectionResults =
                                await scripting.executeScript({
                                    target: { tabId: targetTab.id },
                                    world: "MAIN",
                                    func: async (action: string) => {
                                        const ethereum = (window as any)
                                            .ethereum;
                                        if (!ethereum) {
                                            return {
                                                error: "MetaMask가 설치되어 있지 않습니다.",
                                            };
                                        }

                                        try {
                                            if (action === "WALLET_CONNECT") {
                                                const accounts =
                                                    await ethereum.request({
                                                        method: "eth_requestAccounts",
                                                    });
                                                return {
                                                    isConnected: true,
                                                    address:
                                                        accounts[0] || null,
                                                };
                                            } else if (
                                                action === "WALLET_GET_ACCOUNT"
                                            ) {
                                                const accounts =
                                                    await ethereum.request({
                                                        method: "eth_accounts",
                                                    });
                                                return {
                                                    isConnected:
                                                        accounts.length > 0,
                                                    address:
                                                        accounts[0] || null,
                                                };
                                            } else if (
                                                action === "WALLET_DISCONNECT"
                                            ) {
                                                return { success: true };
                                            }
                                            return { error: "Unknown action" };
                                        } catch (err: any) {
                                            return {
                                                error:
                                                    err.message ||
                                                    "지갑 연결 실패",
                                            };
                                        }
                                    },
                                    args: [message.type],
                                });

                            const scriptResult = injectionResults?.[0]?.result;

                            if (scriptResult?.error) {
                                result = {
                                    success: false,
                                    error: scriptResult.error,
                                };
                            } else {
                                result = { success: true, data: scriptResult };
                            }
                        } catch (error: any) {
                            console.error(`❌ ${message.type} 오류:`, error);
                            result = {
                                success: false,
                                error: error.message || "지갑 연결 실패",
                            };
                            break;
                        }
                        break;
                    }

                    case "MEMEX_LOGIN": {
                        const { browser } = await import("wxt/browser");
                        const storage = browser?.storage || (globalThis as any).chrome?.storage;
                        const scripting = (globalThis as any).chrome?.scripting;
                        const syncFromBrowser = (message as any).syncFromBrowser ?? false;

                        // MEMEX 탭 찾기
                        const memexTabs = await isMemexTabs();
                        const targetTab = memexTabs[0];
                        if (!targetTab?.id) {
                            result = {
                                success: false,
                                error: "MEMEX에서 실행해주세요.",
                            };
                            break;
                        }

                        // 먼저 익스텐션 storage에서 확인
                        let gtmUserIdentifier: string | null = null;
                        try {
                            const storedData = await new Promise<string | null>(
                                (resolve, reject) => {
                                    storage.session.get(
                                        ["gtm_user_identifier"],
                                        (result: any) => {
                                            const runtime =
                                                browser?.runtime ||
                                                (globalThis as any).chrome
                                                    ?.runtime;
                                            if (runtime?.lastError) {
                                                reject(
                                                    new Error(
                                                        runtime.lastError.message,
                                                    ),
                                                );
                                                return;
                                            }
                                            resolve(
                                                result.gtm_user_identifier || null,
                                            );
                                        },
                                    );
                                },
                            );
                            gtmUserIdentifier = storedData;
                        } catch (error: any) {
                            console.warn(
                                "⚠️ [MEMEX_LOGIN] 익스텐션 storage 읽기 실패:",
                                error,
                            );
                        }

                        // syncFromBrowser가 true면 브라우저 sessionStorage에서 읽어서 저장 (로그인 시도 시)
                        if (syncFromBrowser) {
                            const injectionResults = await scripting.executeScript({
                                target: { tabId: targetTab.id },
                                world: "MAIN",
                                func: () => {
                                    // 브라우저의 sessionStorage에서 읽기
                                    try {
                                        const data = window.sessionStorage.getItem(
                                            "gtm_user_identifier",
                                        );
                                        return data;
                                    } catch (error: any) {
                                        return null;
                                    }
                                },
                                args: [],
                            });

                            const browserData = injectionResults?.[0]?.result;
                            if (browserData) {
                                gtmUserIdentifier = browserData;
                                // 익스텐션 storage에 저장 (기존 데이터 덮어쓰기)
                                try {
                                    await new Promise<void>((resolve, reject) => {
                                        storage.session.set(
                                            { gtm_user_identifier: browserData },
                                            () => {
                                                const runtime =
                                                    browser?.runtime ||
                                                    (globalThis as any).chrome
                                                        ?.runtime;
                                                if (runtime?.lastError) {
                                                    reject(
                                                        new Error(
                                                            runtime.lastError.message,
                                                        ),
                                                    );
                                                    return;
                                                }
                                                resolve();
                                            },
                                        );
                                    });
                                } catch (error: any) {
                                    console.warn(
                                        "⚠️ [MEMEX_LOGIN] 익스텐션 storage 저장 실패:",
                                        error,
                                    );
                                }
                            }
                        }

                        // 익스텐션 storage에서 읽은 데이터 파싱
                        if (gtmUserIdentifier) {
                            try {
                                const parsed = JSON.parse(gtmUserIdentifier);
                                if (parsed.username && parsed.user_tag) {
                                    result = {
                                        success: true,
                                        data: {
                                            success: true,
                                            isLoggedIn: true,
                                            username: parsed.username,
                                            userTag: parsed.user_tag,
                                        },
                                    };
                                    break;
                                }
                            } catch (error: any) {
                                console.warn(
                                    "⚠️ [MEMEX_LOGIN] 데이터 파싱 실패:",
                                    error,
                                );
                            }
                        }

                        // 로그인 정보가 없는 경우
                        result = {
                            success: true,
                            data: {
                                success: false,
                                isLoggedIn: false,
                                error: "로그인 정보가 없습니다.",
                            },
                        };
                        break;
                    }
                    case "REFRESH_MEMEX_TAB": {
                        try {
                            const { browser } = await import("wxt/browser");
                            const tabs =
                                browser?.tabs ||
                                (globalThis as any).chrome?.tabs;

                            let memexTabs: any[];
                            try {
                                memexTabs = await isMemexTabs();
                            } catch {
                                // 탭이 없으면 새로 생성
                                await tabs.create({
                                    url: "https://app.memex.xyz",
                                    active: true,
                                });
                                result = {
                                    success: true,
                                    data: { opened: true, refreshed: false },
                                };
                                break;
                            }

                            const targetTab = memexTabs[0];
                            if (targetTab.id) {
                                await tabs.reload(targetTab.id);
                                await tabs.update(targetTab.id, {
                                    active: true,
                                });
                            }

                            result = {
                                success: true,
                                data: { opened: false, refreshed: true },
                            };
                        } catch (error: any) {
                            console.error("❌ REFRESH_MEMEX_TAB 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "MEMEX 탭 새로고침 실패",
                            };
                        }
                        break;
                    }

                    case "SAVE_FUNDING": {
                        try {
                            const response = await apiCall<{
                                success: boolean;
                                data: {
                                    id: number;
                                    totalFunding: string;
                                    userTotalFunding: string;
                                };
                            }>("/v1/funders", {
                                method: "POST",
                                body: JSON.stringify(message.data),
                            });
                            result = { success: true, data: response.data };
                        } catch (error: any) {
                            console.error("❌ 펀딩 저장 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "펀딩 저장 실패",
                            };
                        }
                        break;
                    }

                    case "GET_USER_BY_USERNAME": {
                        try {
                            const response = await apiCall<{
                                success: boolean;
                                data: { user: any };
                            }>(
                                `/v1/users/${encodeURIComponent(
                                    message.username,
                                )}/${encodeURIComponent(message.userTag)}`,
                            );
                            result = { success: true, data: response.data };
                        } catch (error: any) {
                            const errorMsg = error.message || "";
                            // 404 Not Found는 정상 응답으로 처리 (신규 사용자)
                            if (
                                errorMsg.includes("404") ||
                                errorMsg.includes("Not Found")
                            ) {
                                result = {
                                    success: true,
                                    data: { user: null },
                                };
                            } else {
                                console.error("❌ 사용자 조회 오류:", error);
                                result = {
                                    success: false,
                                    error:
                                        error instanceof Error
                                            ? error.message
                                            : "사용자 조회 실패",
                                };
                            }
                        }
                        break;
                    }

                    case "GET_PROFILE": {
                        try {
                            const { browser } = await import("wxt/browser");
                            const storage =
                                browser?.storage ||
                                (globalThis as any).chrome?.storage;

                            // chrome.storage.session에서 walletAddress 가져오기
                            const sessionState = await new Promise<any>(
                                (resolve) => {
                                    storage.session.get(
                                        ["squid_session_state"],
                                        (result: any) => {
                                            resolve(
                                                result.squid_session_state ||
                                                null,
                                            );
                                        },
                                    );
                                },
                            );

                            const walletAddress = sessionState?.walletAddress;
                            if (!walletAddress) {
                                result = {
                                    success: false,
                                    error: "지갑 주소가 없습니다. 먼저 지갑을 연결해주세요.",
                                };
                                break;
                            }

                            const response = await apiCall<{
                                success: boolean;
                                data: {
                                    username: string | null;
                                    connectedWallet: string;
                                    memexWallet: string | null;
                                    commentCounts: number;
                                    streakDays: number;
                                };
                            }>("/v1/users/profile", {
                                headers: {
                                    "x-wallet-address": walletAddress,
                                },
                            });
                            result = { success: true, data: response.data };
                        } catch (error: any) {
                            console.error("❌ 프로필 조회 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "프로필 조회 실패",
                            };
                        }
                        break;
                    }

                    case "GET_GAME_RANKING": {
                        try {
                            const response = await apiCall<{
                                success: boolean;
                                data: { gameRanking: any[] };
                            }>("/v1/users/game-ranking");
                            result = { success: true, data: response.data };
                        } catch (error: any) {
                            console.error("❌ 게임 랭킹 조회 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "게임 랭킹 조회 실패",
                            };
                        }
                        break;
                    }

                    case "GET_PRIZE_RANKING": {
                        try {
                            const response = await apiCall<{
                                success: boolean;
                                data: { prizeRanking: any[] };
                            }>("/v1/users/prize-ranking");
                            result = { success: true, data: response.data };
                        } catch (error: any) {
                            console.error("❌ 상금 랭킹 조회 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "상금 랭킹 조회 실패",
                            };
                        }
                        break;
                    }

                    case "GET_MOST_COMMENTS": {
                        try {
                            const response = await apiCall<{
                                success: boolean;
                                data: any[];
                            }>("/v1/users/most-comments");
                            result = { success: true, data: { mostComments: response.data } };
                        } catch (error: any) {
                            console.error("❌ 댓글 랭킹 조회 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "댓글 랭킹 조회 실패",
                            };
                        }
                        break;
                    }

                    case "GET_QUESTS": {
                        try {
                            const { browser } = await import("wxt/browser");
                            const storage =
                                browser?.storage ||
                                (globalThis as any).chrome?.storage;

                            const sessionState = await new Promise<any>(
                                (resolve) => {
                                    storage.session.get(
                                        ["squid_session_state"],
                                        (result: any) => {
                                            resolve(
                                                result.squid_session_state ||
                                                null,
                                            );
                                        },
                                    );
                                },
                            );

                            const walletAddress = sessionState?.walletAddress;
                            if (!walletAddress) {
                                result = {
                                    success: false,
                                    error: "지갑 주소가 없습니다. 먼저 지갑을 연결해주세요.",
                                };
                                break;
                            }

                            const response = await apiCall<{
                                success: boolean;
                                data: { today: string; quests: any[] };
                            }>("/v1/quests", {
                                headers: {
                                    "x-wallet-address": walletAddress,
                                },
                            });
                            result = { success: true, data: response.data };
                        } catch (error: any) {
                            console.error("❌ 퀘스트 조회 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "퀘스트 조회 실패",
                            };
                        }
                        break;
                    }

                    case "GET_MY_ACTIVE_GAMES": {
                        try {
                            const { browser } = await import("wxt/browser");
                            const storage =
                                browser?.storage ||
                                (globalThis as any).chrome?.storage;

                            const sessionState = await new Promise<any>(
                                (resolve) => {
                                    storage.session.get(
                                        ["squid_session_state"],
                                        (result: any) => {
                                            resolve(
                                                result.squid_session_state ||
                                                null,
                                            );
                                        },
                                    );
                                },
                            );

                            const walletAddress = sessionState?.walletAddress;
                            if (!walletAddress) {
                                result = {
                                    success: false,
                                    error: "지갑 주소가 없습니다. 먼저 지갑을 연결해주세요.",
                                };
                                break;
                            }

                            const response = await apiCall<{
                                success: boolean;
                                data: { myActiveGames: any[] };
                            }>("/v1/users/my-active-games", {
                                headers: {
                                    "x-wallet-address": walletAddress,
                                },
                            });
                            result = { success: true, data: response.data };
                        } catch (error: any) {
                            console.error(
                                "❌ 참여 중인 게임 조회 오류:",
                                error,
                            );
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "참여 중인 게임 조회 실패",
                            };
                        }
                        break;
                    }

                    case "GET_LIVE_GAMES": {
                        try {
                            const response = await apiCall<{
                                success: boolean;
                                data: Array<{
                                    gameId: string;
                                    tokenAddress: string;
                                    tokenUsername: string | null;
                                    tokenUsertag: string | null;
                                    tokenImageUrl: string | null;
                                    tokenSymbol: string | null;
                                    currentPrizePool: string;
                                    endTime: string;
                                }>;
                            }>("/v1/games/live");

                            // 백엔드 응답을 LiveGameItem 형식으로 매핑
                            const liveGames = (response.data || []).map(
                                (game) => ({
                                    gameId: game.gameId,
                                    tokenAddress: game.tokenAddress,
                                    tokenUsername: game.tokenUsername,
                                    tokenUsertag: game.tokenUsertag,
                                    tokenImageUrl: game.tokenImageUrl,
                                    tokenSymbol: game.tokenSymbol,
                                    currentPrizePool: game.currentPrizePool,
                                    endTime: game.endTime,
                                }),
                            );

                            result = { success: true, data: { liveGames } };
                        } catch (error: any) {
                            console.error("❌ 라이브 게임 조회 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "라이브 게임 조회 실패",
                            };
                        }
                        break;
                    }

                    case "TOGGLE_COMMENT_LIKE": {
                        try {
                            const walletAddress = (message as any)
                                .walletAddress;
                            if (!walletAddress) {
                                result = {
                                    success: false,
                                    error: "지갑 주소가 없습니다. 먼저 지갑을 연결해주세요.",
                                };
                                break;
                            }

                            const response = await apiCall<{
                                success: boolean;
                                data: { liked: boolean; likeCount: number };
                            }>(`/v1/comments/${message.commentId}/like`, {
                                method: "POST",
                                headers: {
                                    "x-wallet-address": walletAddress,
                                },
                            });
                            result = { success: true, data: response.data };
                        } catch (error: any) {
                            console.error("❌ 좋아요 토글 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "좋아요 토글 실패",
                            };
                        }
                        break;
                    }

                    case "NAVIGATE_TO_URL": {
                        try {
                            const { browser } = await import("wxt/browser");
                            const tabs =
                                browser?.tabs ||
                                (globalThis as any).chrome?.tabs;

                            // 현재 활성 탭의 URL을 변경
                            const [activeTab] = await tabs.query({
                                active: true,
                                currentWindow: true,
                            });

                            if (activeTab?.id) {
                                await tabs.update(activeTab.id, {
                                    url: message.url,
                                });
                                result = {
                                    success: true,
                                    data: { success: true },
                                };
                            } else {
                                result = {
                                    success: false,
                                    error: "활성 탭을 찾을 수 없습니다.",
                                };
                            }
                        } catch (error: any) {
                            console.error("❌ NAVIGATE_TO_URL 오류:", error);
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "URL 이동 실패",
                            };
                        }
                        break;
                    }

                    case "GET_CURRENT_TAB_URL": {
                        try {
                            const { browser } = await import("wxt/browser");
                            const tabs =
                                browser?.tabs ||
                                (globalThis as any).chrome?.tabs;

                            // 현재 활성 탭의 URL 가져오기
                            const [activeTab] = await tabs.query({
                                active: true,
                                currentWindow: true,
                            });

                            if (activeTab?.url) {
                                result = {
                                    success: true,
                                    data: { url: activeTab.url },
                                };
                            } else {
                                result = { success: true, data: { url: null } };
                            }
                        } catch (error: any) {
                            console.error(
                                "❌ GET_CURRENT_TAB_URL 오류:",
                                error,
                            );
                            result = {
                                success: false,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : "URL 조회 실패",
                            };
                        }
                        break;
                    }

                    default:
                        result = {
                            success: false,
                            error: "알 수 없는 메시지 타입입니다.",
                        };
                }

                sendResponse(result);
            } catch (error: any) {
                console.error("❌ Background API 오류:", error);
                sendResponse({
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "알 수 없는 오류가 발생했습니다.",
                });
                return false;
            }
        })();

        return true;
    };
}
