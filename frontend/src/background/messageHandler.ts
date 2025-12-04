import {
  BackgroundMessage,
  BackgroundResponse,
  SerializedGameInfo,
} from "../contents/lib/backgroundApi";
import type { JoinRequest } from "../types/request.types";
import { apiCall, apiUpload } from "./api";
import { openSidePanel } from "./sidepanel";

export function createMessageHandler() {
  return (
    message: BackgroundMessage,
    sender: any,
    sendResponse: (response: BackgroundResponse) => void
  ): boolean => {
    // 비동기 응답 처리
    (async () => {
      try {
        let result: BackgroundResponse;

        switch (message.type) {
          case "GET_COMMENTS": {
            console.log("📥 GET_COMMENTS 요청:", message.gameId);
            const response = await apiCall<{
              success: boolean;
              data: { comments: any[] };
            }>(`/v1/comments/game/${encodeURIComponent(message.gameId)}`);
            // Result wrapper에서 comments 추출
            result = {
              success: true,
              data: response.data?.comments || [],
            };
            break;
          }

          //NOTE: CREATE_COMMENT는 더 이상 사용하지 않음 - 프론트엔드에서 직접 스마트 컨트랙트 호출
          case "CREATE_COMMENT": {
            console.log("📝 CREATE_COMMENT 요청:", message);
            const response = await apiCall<{ comment: any }>("/api/comments", {
              method: "POST",
              body: JSON.stringify({
                challenge_id: message.challengeId,
                player_address: message.playerAddress,
                content: message.content,
                signature: (message as any).signature,
                message: (message as any).message,
              }),
            });
            result = { success: true, data: response.comment };
            break;
          }

          case "HEALTH_CHECK": {
            console.log("💓 HEALTH_CHECK 요청");
            const response = await apiCall<{
              status: string;
              timestamp: string;
              supabase: string;
            }>("/health");
            result = { success: true, data: response };
            break;
          }

          case "OPEN_SIDE_PANEL": {
            console.log("📂 OPEN_SIDE_PANEL 요청");
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
            console.log("💾 GET_STORAGE 요청:", message);
            try {
              const { browser } = await import("wxt/browser");
              const storage =
                browser?.storage || (globalThis as any).chrome?.storage;
              const area = (message as any).area || "session";
              const storageArea =
                area === "local" ? storage.local : storage.session;

              const data = await new Promise<any>((resolve, reject) => {
                storageArea.get([(message as any).key], (result: any) => {
                  const runtime =
                    browser?.runtime || (globalThis as any).chrome?.runtime;
                  if (runtime?.lastError) {
                    reject(new Error(runtime.lastError.message));
                    return;
                  }
                  resolve(result[(message as any).key] || null);
                });
              });

              result = { success: true, data };
            } catch (error: any) {
              console.error("❌ Storage 읽기 오류:", error);
              result = {
                success: false,
                error:
                  error instanceof Error ? error.message : "Storage 읽기 실패",
              };
            }
            break;
          }

          case "SET_STORAGE": {
            console.log("💾 SET_STORAGE 요청:", message);
            // 권한 체크: 익스텐션 내부에서만 쓰기 허용
            const runtime =
              (await import("wxt/browser")).browser?.runtime ||
              (globalThis as any).chrome?.runtime;
            if (sender.id !== runtime?.id) {
              console.warn("⚠️ SET_STORAGE 권한 없음:", sender.id);
              result = {
                success: false,
                error:
                  "Storage 쓰기 권한이 없습니다. 익스텐션 내부에서만 가능합니다.",
              };
              break;
            }

            try {
              const { browser } = await import("wxt/browser");
              const storage =
                browser?.storage || (globalThis as any).chrome?.storage;
              const area = (message as any).area || "session";
              const storageArea =
                area === "local" ? storage.local : storage.session;

              await new Promise<void>((resolve, reject) => {
                storageArea.set(
                  { [(message as any).key]: (message as any).value },
                  () => {
                    const runtime =
                      browser?.runtime || (globalThis as any).chrome?.runtime;
                    if (runtime?.lastError) {
                      reject(new Error(runtime.lastError.message));
                      return;
                    }
                    resolve();
                  }
                );
              });

              result = { success: true, data: undefined };
            } catch (error: any) {
              console.error("❌ Storage 저장 오류:", error);
              result = {
                success: false,
                error:
                  error instanceof Error ? error.message : "Storage 저장 실패",
              };
            }
            break;
          }

          case "REMOVE_STORAGE": {
            console.log("🗑️ REMOVE_STORAGE 요청:", message);
            // 권한 체크: 익스텐션 내부에서만 삭제 허용
            const runtime =
              (await import("wxt/browser")).browser?.runtime ||
              (globalThis as any).chrome?.runtime;
            if (sender.id !== runtime?.id) {
              console.warn("⚠️ REMOVE_STORAGE 권한 없음:", sender.id);
              result = {
                success: false,
                error:
                  "Storage 삭제 권한이 없습니다. 익스텐션 내부에서만 가능합니다.",
              };
              break;
            }

            try {
              const { browser } = await import("wxt/browser");
              const storage =
                browser?.storage || (globalThis as any).chrome?.storage;
              const area = (message as any).area || "session";
              const storageArea =
                area === "local" ? storage.local : storage.session;

              await new Promise<void>((resolve, reject) => {
                storageArea.remove([(message as any).key], () => {
                  const runtime =
                    browser?.runtime || (globalThis as any).chrome?.runtime;
                  if (runtime?.lastError) {
                    reject(new Error(runtime.lastError.message));
                    return;
                  }
                  resolve();
                });
              });

              result = { success: true, data: undefined };
            } catch (error: any) {
              console.error("❌ Storage 삭제 오류:", error);
              result = {
                success: false,
                error:
                  error instanceof Error ? error.message : "Storage 삭제 실패",
              };
            }
            break;
          }

          case "GET_GAME_BY_TOKEN": {
            console.log("🎮 GET_GAME_BY_TOKEN 요청:", message.tokenAddress);
            try {
              const response = await apiCall<any>(
                `/v1/games/by-token/${encodeURIComponent(message.tokenAddress)}`
              );
              result = { success: true, data: response };
            } catch (error: any) {
              // 404는 게임이 없는 정상 케이스 (Not Found 또는 404 포함)
              const errorMsg = error.message || "";
              if (errorMsg.includes("404") || errorMsg.includes("Not Found")) {
                console.log("🎮 게임 없음 (404):", message.tokenAddress);
                result = { success: true, data: null };
              } else {
                console.error("❌ 게임 조회 오류:", error);
                result = {
                  success: false,
                  error:
                    error instanceof Error ? error.message : "게임 조회 실패",
                };
              }
            }
            break;
          }

          case "GET_ACTIVE_GAME_BY_TOKEN": {
            console.log(
              "🎮 GET_ACTIVE_GAME_BY_TOKEN 요청:",
              message.tokenAddress
            );
            try {
              const response = await apiCall<any>(
                `/v1/games/active/by-token/${encodeURIComponent(
                  message.tokenAddress
                )}`
              );
              result = { success: true, data: response };
            } catch (error: any) {
              // 404는 활성 게임이 없는 정상 케이스
              const errorMsg = error.message || "";
              if (errorMsg.includes("404") || errorMsg.includes("Not Found")) {
                console.log("🎮 활성 게임 없음 (404):", message.tokenAddress);
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

          case "SAVE_COMMENT": {
            console.log("💬 SAVE_COMMENT 요청:", message.data);
            try {
              const response = await apiCall<{
                success: boolean;
                data: { id: number };
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
                  error instanceof Error ? error.message : "댓글 저장 실패",
              };
            }
            break;
          }

          case "SAVE_GAME": {
            console.log("🎮 SAVE_GAME 요청:", message.data);
            try {
              const response = await apiCall<{
                success: boolean;
                data: { gameAddress: string };
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
                  error instanceof Error ? error.message : "게임 저장 실패",
              };
            }
            break;
          }

          case "REGISTER_GAME": {
            const { data } = message as {
              type: string;
              data: SerializedGameInfo;
            };
            console.log(
              "🎮 REGISTER_GAME 요청 (블록체인 조회 게임 등록):",
              data.id
            );
            try {
              // SerializedGameInfo는 이미 string으로 변환되어 있음
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
                  error instanceof Error ? error.message : "게임 등록 실패",
              };
            }
            break;
          }

          case "REGISTER_CLAIM_PRIZE": {
            console.log(
              "🏆 REGISTER_CLAIM_PRIZE 요청:",
              message.gameAddress,
              message.txHash
            );
            try {
              const response = await apiCall<{ success: boolean }>(
                `/v1/games/${encodeURIComponent(message.gameAddress)}/claim`,
                {
                  method: "POST",
                  body: JSON.stringify({ txHash: message.txHash }),
                }
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
            // Content script에서 프로필 URL 변경 시 자동으로 전송되는 메시지
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
            console.log(`🖼️ PROFILE_URL_CHANGED 요청:`, {
              username,
              userTag,
              profileInfo,
              currentUsername,
              currentUserTag,
            });

            try {
              const { browser } = await import("wxt/browser");
              const storage =
                browser?.storage || (globalThis as any).chrome?.storage;

              // 현재 로그인한 사용자 정보 가져오기
              const sessionState = await new Promise<any>((resolve, reject) => {
                storage.session.get(["squid_session_state"], (result: any) => {
                  const runtime =
                    browser?.runtime || (globalThis as any).chrome?.runtime;
                  if (runtime?.lastError) {
                    reject(new Error(runtime.lastError.message));
                    return;
                  }
                  resolve(result.squid_session_state || null);
                });
              });

              const loggedInUsername =
                currentUsername || sessionState?.memexUsername;
              const loggedInUserTag =
                currentUserTag || sessionState?.memexUserTag;
              const isMyProfile =
                loggedInUsername === username && loggedInUserTag === userTag;

              console.log(`🖼️ [PROFILE_URL_CHANGED] 프로필 소유자 확인:`, {
                isMyProfile,
                loggedIn: {
                  username: loggedInUsername,
                  userTag: loggedInUserTag,
                },
                profile: { username, userTag },
              });

              // 프로필 정보를 'profile' 키로 통합 저장
              const profileStorageKey = "profile";
              const profileKey = `${username}#${userTag}`;

              // 기존 프로필 정보 가져오기
              const existingProfiles = await new Promise<Record<string, any>>(
                (resolve) => {
                  storage.local.get([profileStorageKey], (result: any) => {
                    const runtime =
                      browser?.runtime || (globalThis as any).chrome?.runtime;
                    if (runtime?.lastError) {
                      resolve({});
                      return;
                    }
                    resolve(result[profileStorageKey] || {});
                  });
                }
              );

              // 내 프로필인 경우
              if (isMyProfile) {
                // 기존 정보 확인
                const existingProfile = existingProfiles[profileKey];

                // 이미 정보가 있고 모든 필드가 있으면 생략
                if (
                  existingProfile &&
                  existingProfile.profileImageUrl &&
                  existingProfile.tokenAddr &&
                  existingProfile.tokenSymbol &&
                  existingProfile.memexWalletAddress
                ) {
                  console.log(
                    `✅ [PROFILE_URL_CHANGED] 내 프로필 정보 이미 존재, 생략`
                  );
                  result = {
                    success: true,
                    data: { success: true, skipped: true },
                  };
                  break;
                }

                // 내 프로필 정보를 local storage에 저장
                const profileData = {
                  profileImageUrl: profileInfo.profileImageUrl,
                  tokenAddr: profileInfo.tokenAddr,
                  tokenSymbol: profileInfo.tokenSymbol,
                  tokenImageUrl: profileInfo.tokenImageUrl,
                  memexWalletAddress: profileInfo.memexWalletAddress,
                  updatedAt: Date.now(),
                };

                existingProfiles[profileKey] = profileData;

                await new Promise<void>((resolve, reject) => {
                  storage.local.set(
                    { [profileStorageKey]: existingProfiles },
                    () => {
                      const runtime =
                        browser?.runtime || (globalThis as any).chrome?.runtime;
                      if (runtime?.lastError) {
                        reject(new Error(runtime.lastError.message));
                        return;
                      }
                      console.log(
                        "✅ [PROFILE_URL_CHANGED] 내 프로필 정보 local storage에 저장 완료"
                      );
                      resolve();
                    }
                  );
                });

                // Session storage에도 저장 (내 프로필이므로)
                const updatedState = {
                  ...sessionState,
                  isMemexLoggedIn: true,
                  memexUsername: username,
                  memexUserTag: userTag,
                  memexProfileImage: profileInfo.profileImageUrl,
                  memexWalletAddress: profileInfo.memexWalletAddress,
                  myTokenAddr: profileInfo.tokenAddr,
                  myTokenSymbol: profileInfo.tokenSymbol,
                  myTokenImageUrl: profileInfo.tokenImageUrl,
                };

                await new Promise<void>((resolve, reject) => {
                  storage.session.set(
                    { squid_session_state: updatedState },
                    () => {
                      const runtime =
                        browser?.runtime || (globalThis as any).chrome?.runtime;
                      if (runtime?.lastError) {
                        reject(new Error(runtime.lastError.message));
                        return;
                      }
                      console.log(
                        "✅ [PROFILE_URL_CHANGED] 내 프로필 정보 session에 저장 완료"
                      );
                      resolve();
                    }
                  );
                });
              } else {
                // 다른 사람 프로필인 경우 - local storage에만 저장 (캐시)
                // 기존 캐시 확인
                const existingCache = existingProfiles[profileKey];

                // 캐시가 있고 모든 필드가 있으면 생략
                if (
                  existingCache &&
                  existingCache.profileImageUrl &&
                  existingCache.tokenAddr &&
                  existingCache.tokenSymbol &&
                  existingCache.memexWalletAddress
                ) {
                  console.log(
                    `✅ [PROFILE_URL_CHANGED] 다른 사람 프로필 캐시 존재, 생략`
                  );
                  result = {
                    success: true,
                    data: { success: true, skipped: true },
                  };
                  break;
                }

                // Local storage에 캐시 저장
                const profileData = {
                  profileImageUrl: profileInfo.profileImageUrl,
                  tokenAddr: profileInfo.tokenAddr,
                  tokenSymbol: profileInfo.tokenSymbol,
                  tokenImageUrl: profileInfo.tokenImageUrl,
                  memexWalletAddress: profileInfo.memexWalletAddress,
                  updatedAt: Date.now(),
                };

                existingProfiles[profileKey] = profileData;

                await new Promise<void>((resolve, reject) => {
                  storage.local.set(
                    { [profileStorageKey]: existingProfiles },
                    () => {
                      const runtime =
                        browser?.runtime || (globalThis as any).chrome?.runtime;
                      if (runtime?.lastError) {
                        reject(new Error(runtime.lastError.message));
                        return;
                      }
                      console.log(
                        `✅ [PROFILE_URL_CHANGED] 다른 사람 프로필 정보 local storage에 캐시 저장 완료`
                      );
                      resolve();
                    }
                  );
                });
              }

              result = { success: true, data: { success: true } };
            } catch (error: any) {
              console.error("❌ PROFILE_URL_CHANGED 오류:", error);
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
            // Content script로 전달하여 fetch로 프로필 정보 가져오기
            const { username, userTag } = message as {
              type: string;
              username: string;
              userTag: string;
            };
            console.log(
              `🖼️ FETCH_MEMEX_PROFILE_INFO 요청 (content script 전달):`,
              username,
              userTag
            );
            try {
              const { browser } = await import("wxt/browser");
              const tabs = browser?.tabs || (globalThis as any).chrome?.tabs;

              // MEMEX 페이지 탭 찾기
              const memexTabs = await tabs.query({
                url: ["https://app.memex.xyz/*", "http://app.memex.xyz/*"],
              });

              if (memexTabs.length === 0 || !memexTabs[0]?.id) {
                console.log(`🖼️ MEMEX 탭 없음, 프로필 정보 가져오기 불가`);
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
                break;
              }

              // Content script로 메시지 전달 (fetch 기반)
              const response = await tabs.sendMessage(memexTabs[0].id, {
                type: "FETCH_MEMEX_PROFILE_INFO",
                username,
                userTag,
              });

              result = { success: true, data: response };
            } catch (error: any) {
              console.error("❌ FETCH_MEMEX_PROFILE_INFO 오류:", error);
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
            console.log(`🚀 JOIN 요청 DTO:`, {
              username: data.username,
              walletAddress: data.walletAddress,
            });

            // 필수 필드 검증 (walletAddress는 백엔드에서 필수)
            if (!data) {
              console.error("❌ JOIN 오류: walletAddress가 없습니다");
              result = {
                success: false,
                error: "walletAddress is required",
              };
              break;
            }

            try {
              // 프론트엔드 필드명을 백엔드 JoinDto 필드명으로 매핑
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
              console.log(`🚀 JOIN 요청 Payload:`, joinPayload);
              console.log(`🚀 JOIN 요청 Body String:`, bodyString);
              // Backend returns Result<{ user, isNew }> = { success: true, data: { user, isNew } }
              const response = await apiCall<{
                success: boolean;
                data: { user: any; isNew: boolean };
              }>("/v1/users/join", {
                method: "POST",
                body: bodyString,
              });
              // Unwrap Result and return { user, isNew } as JoinResponse
              console.log(`✅ JOIN 응답:`, response);

              // User 정보를 chrome.storage.session에 캐시 저장
              if (response.data?.user) {
                const { browser } = await import("wxt/browser");
                const storage =
                  browser?.storage || (globalThis as any).chrome?.storage;
                await new Promise<void>((resolve, reject) => {
                  storage.session.set(
                    { squid_user: response.data.user },
                    () => {
                      const runtime =
                        browser?.runtime || (globalThis as any).chrome?.runtime;
                      if (runtime?.lastError) {
                        console.warn(
                          "⚠️ Squid User 캐시 저장 실패:",
                          runtime.lastError
                        );
                        reject(new Error(runtime.lastError.message));
                        return;
                      }
                      console.log(
                        "✅ Squid User 캐시 저장 완료:",
                        response.data.user.id
                      );
                      resolve();
                    }
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
                  error instanceof Error ? error.message : "Join 요청 실패",
              };
            }
            break;
          }

          case "LOGOUT": {
            console.log(`🚪 LOGOUT 요청`);
            try {
              const { browser } = await import("wxt/browser");
              const storage =
                browser?.storage || (globalThis as any).chrome?.storage;
              const tabs = browser?.tabs || (globalThis as any).chrome?.tabs;

              // session storage에서 gtm_user_identifier, squid_user 삭제
              await new Promise<void>((resolve, reject) => {
                storage.session.remove(
                  ["gtm_user_identifier", "squid_user"],
                  () => {
                    const runtime =
                      browser?.runtime || (globalThis as any).chrome?.runtime;
                    if (runtime?.lastError) {
                      reject(new Error(runtime.lastError.message));
                      return;
                    }
                    resolve();
                  }
                );
              });

              // local storage에서 지갑 관련 데이터 삭제
              await new Promise<void>((resolve, reject) => {
                storage.local.remove(
                  ["walletAddress", "isWalletConnected"],
                  () => {
                    const runtime =
                      browser?.runtime || (globalThis as any).chrome?.runtime;
                    if (runtime?.lastError) {
                      reject(new Error(runtime.lastError.message));
                      return;
                    }
                    resolve();
                  }
                );
              });

              // Content Script에 로그아웃 메시지 전송 (inject script 토큰 캐시 초기화)
              try {
                const memexTabs = await tabs.query({
                  url: ["https://app.memex.xyz/*", "http://app.memex.xyz/*"],
                });

                if (memexTabs.length > 0 && memexTabs[0]?.id) {
                  await tabs.sendMessage(memexTabs[0].id, {
                    type: "LOGOUT_INJECT_SCRIPT",
                  });
                  console.log(`✅ Content Script에 로그아웃 메시지 전송 완료`);
                }
              } catch (tabError) {
                // Content Script 메시지 전송 실패는 무시 (탭이 없을 수 있음)
                console.warn(
                  "⚠️ Content Script 로그아웃 메시지 전송 실패 (무시):",
                  tabError
                );
              }

              console.log(
                `✅ LOGOUT 완료: gtm_user_identifier 및 지갑 정보 삭제`
              );
              result = { success: true, data: { success: true } };
            } catch (error: any) {
              console.error("❌ LOGOUT 오류:", error);
              result = {
                success: false,
                error: error instanceof Error ? error.message : "로그아웃 실패",
              };
            }
            break;
          }

          case "UPLOAD_IMAGE": {
            console.log("📤 UPLOAD_IMAGE 요청");
            try {
              const { fileData, fileName, mimeType } = message as {
                type: string;
                fileData: string; // base64 encoded
                fileName: string;
                mimeType: string;
              };

              // base64를 Blob으로 변환
              const byteCharacters = atob(fileData);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: mimeType });

              // FormData 생성
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
                  error instanceof Error ? error.message : "이미지 업로드 실패",
              };
            }
            break;
          }

          case "WALLET_CONNECT":
          case "WALLET_GET_ACCOUNT":
          case "WALLET_DISCONNECT": {
            console.log(`🔐 ${message.type} 요청 (scripting API 사용)`);
            try {
              const { browser } = await import("wxt/browser");
              const tabs = browser?.tabs || (globalThis as any).chrome?.tabs;
              const scripting = (globalThis as any).chrome?.scripting;

              // MEMEX 페이지 탭 찾기
              let memexTabs = await tabs.query({
                url: ["https://app.memex.xyz/*", "http://app.memex.xyz/*"],
              });

              console.log(`🔐 MEMEX 탭 찾기 결과:`, memexTabs.length, "개");

              // MEMEX 탭이 없는 경우
              if (memexTabs.length === 0) {
                if (message.type === "WALLET_GET_ACCOUNT") {
                  result = {
                    success: true,
                    data: { isConnected: false, address: null },
                  };
                  break;
                }
                if (message.type === "WALLET_DISCONNECT") {
                  result = { success: true, data: { success: true } };
                  break;
                }

                // WALLET_CONNECT: 새 탭 열고 대기
                console.log(`🔐 MEMEX 탭 없음, 새 탭 열기`);
                const newTab = await tabs.create({
                  url: "https://app.memex.xyz",
                  active: true,
                });

                await new Promise<void>((resolve) => {
                  const listener = (
                    tabId: number,
                    changeInfo: { status?: string }
                  ) => {
                    if (
                      tabId === newTab.id &&
                      changeInfo.status === "complete"
                    ) {
                      tabs.onUpdated.removeListener(listener);
                      setTimeout(resolve, 1500); // 페이지 로딩 대기
                    }
                  };
                  tabs.onUpdated.addListener(listener);
                  setTimeout(() => {
                    tabs.onUpdated.removeListener(listener);
                    resolve();
                  }, 10000);
                });

                memexTabs = await tabs.query({
                  url: ["https://app.memex.xyz/*", "http://app.memex.xyz/*"],
                });

                if (memexTabs.length === 0) {
                  result = {
                    success: false,
                    error: "MEMEX 페이지 로딩 실패",
                  };
                  break;
                }
              }

              const targetTab = memexTabs[0];
              if (!targetTab?.id) {
                result = {
                  success: false,
                  error: "MEMEX 탭 ID를 찾을 수 없습니다.",
                };
                break;
              }

              console.log(`🔐 타겟 탭에서 스크립트 실행:`, targetTab.id);

              // chrome.scripting.executeScript로 직접 실행
              const injectionResults = await scripting.executeScript({
                target: { tabId: targetTab.id },
                world: "MAIN", // 페이지 컨텍스트에서 실행 (window.ethereum 접근 가능)
                func: async (action: string) => {
                  const ethereum = (window as any).ethereum;
                  if (!ethereum) {
                    return {
                      error: "MetaMask가 설치되어 있지 않습니다.",
                    };
                  }

                  try {
                    if (action === "WALLET_CONNECT") {
                      const accounts = await ethereum.request({
                        method: "eth_requestAccounts",
                      });
                      return {
                        isConnected: true,
                        address: accounts[0] || null,
                      };
                    } else if (action === "WALLET_GET_ACCOUNT") {
                      const accounts = await ethereum.request({
                        method: "eth_accounts",
                      });
                      return {
                        isConnected: accounts.length > 0,
                        address: accounts[0] || null,
                      };
                    } else if (action === "WALLET_DISCONNECT") {
                      // MetaMask는 프로그래밍적 연결 해제를 지원하지 않음
                      return { success: true };
                    }
                    return { error: "Unknown action" };
                  } catch (err: any) {
                    return { error: err.message || "지갑 연결 실패" };
                  }
                },
                args: [message.type],
              });

              const scriptResult = injectionResults?.[0]?.result;
              console.log(`🔐 스크립트 실행 결과:`, scriptResult);

              if (scriptResult?.error) {
                result = { success: false, error: scriptResult.error };
              } else {
                result = { success: true, data: scriptResult };
              }
            } catch (error: any) {
              console.error(`❌ ${message.type} 오류:`, error);

              if (message.type === "WALLET_GET_ACCOUNT") {
                result = {
                  success: true,
                  data: { isConnected: false, address: null },
                };
              } else if (message.type === "WALLET_DISCONNECT") {
                result = { success: true, data: { success: true } };
              } else {
                result = {
                  success: false,
                  error:
                    error instanceof Error ? error.message : "지갑 연결 실패",
                };
              }
            }
            break;
          }

          // FIXME: 이거 Connect Wallet시에 강제로 url이동시켜서 구글 버튼 클릭하게 해야되요.
          // 안그러면 사용자가 직접 app.memex.xyz로 이동해서 이 메서드가 실행되어야 되는데, 그렇게는 실행 안할거 같아서요.
          // 강제 이동후 구글로그인 버튼이 아니면, memex Login 버튼을 눌려도 아무 동작안하는 화면만 사용자가 보게되어요.
          case "MEMEX_LOGIN": {
            console.log(`🔐 MEMEX_LOGIN 요청`);
            try {
              const { browser } = await import("wxt/browser");
              const tabs = browser?.tabs || (globalThis as any).chrome?.tabs;

              // MEMEX 페이지 탭 찾기
              const memexTabs = await tabs.query({
                url: ["https://app.memex.xyz/*", "http://app.memex.xyz/*"],
              });

              if (memexTabs.length === 0) {
                result = { success: true, data: { isLoggedIn: false } };
                break;
              }

              const targetTab = memexTabs[0];
              if (!targetTab?.id) {
                result = { success: true, data: { isLoggedIn: false } };
                break;
              }

              // Content script로 메시지 전달 (MEMEX 로그인 상태 확인)
              const messageToSend = {
                type: "MEMEX_LOGIN",
                triggerLogin: (message as any).triggerLogin ?? false,
              };
              const response = await tabs.sendMessage(
                targetTab.id,
                messageToSend
              );
              result = { success: true, data: response };
            } catch (error: any) {
              console.error(`❌ MEMEX_LOGIN 오류:`, error);
              result = { success: true, data: { isLoggedIn: false } };
            }
            break;
          }

          case "REFRESH_MEMEX_TAB": {
            console.log("🔄 REFRESH_MEMEX_TAB 요청");
            try {
              const { browser } = await import("wxt/browser");
              const tabs = browser?.tabs || (globalThis as any).chrome?.tabs;

              // MEMEX 페이지 탭 찾기
              const memexTabs = await tabs.query({
                url: ["https://app.memex.xyz/*", "http://app.memex.xyz/*"],
              });

              if (memexTabs.length === 0) {
                // MEMEX 탭이 없으면 새로 열기
                console.log("🔄 MEMEX 탭 없음, 새 탭 열기");
                await tabs.create({
                  url: "https://app.memex.xyz",
                  active: true,
                });
                result = {
                  success: true,
                  data: { opened: true, refreshed: false },
                };
              } else {
                // MEMEX 탭이 있으면 새로고침 및 활성화
                const targetTab = memexTabs[0];
                console.log(
                  "🔄 MEMEX 탭 새로고침:",
                  targetTab.id,
                  targetTab.url
                );

                if (targetTab.id) {
                  await tabs.reload(targetTab.id);
                  await tabs.update(targetTab.id, { active: true });
                }

                result = {
                  success: true,
                  data: { opened: false, refreshed: true },
                };
              }
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

          default:
            result = {
              success: false,
              error: "알 수 없는 메시지 타입입니다.",
            };
        }

        // 응답 전송
        try {
          sendResponse(result);
        } catch (sendError) {
          console.error("❌ 응답 전송 실패:", sendError);
        }
      } catch (error: any) {
        console.error("❌ Background API 오류:", error);
        try {
          sendResponse({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "알 수 없는 오류가 발생했습니다.",
          });
        } catch (sendError) {
          console.error("❌ 에러 응답 전송 실패:", sendError);
        }
      }
    })();

    // 비동기 응답을 위해 true 반환
    return true;
  };
}
