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
            const response = await apiCall<{
              success: boolean;
              data: { comments: any[] };
            }>(`/v1/comments/game/${encodeURIComponent(message.gameId)}`);
            result = { success: true, data: response.data?.comments || [] };
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
                message: (message as any).message,
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
            const runtime =
              (await import("wxt/browser")).browser?.runtime ||
              (globalThis as any).chrome?.runtime;
            if (sender.id !== runtime?.id) {
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
            const runtime =
              (await import("wxt/browser")).browser?.runtime ||
              (globalThis as any).chrome?.runtime;
            if (sender.id !== runtime?.id) {
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
            try {
              const response = await apiCall<any>(
                `/v1/games/by-token/${encodeURIComponent(message.tokenAddress)}`
              );
              result = { success: true, data: response };
            } catch (error: any) {
              const errorMsg = error.message || "";
              if (errorMsg.includes("404") || errorMsg.includes("Not Found")) {
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
            try {
              const response = await apiCall<any>(
                `/v1/games/active/by-token/${encodeURIComponent(
                  message.tokenAddress
                )}`
              );
              result = { success: true, data: response };
            } catch (error: any) {
              const errorMsg = error.message || "";
              if (errorMsg.includes("404") || errorMsg.includes("Not Found")) {
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
                  error instanceof Error ? error.message : "게임 등록 실패",
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
                  error instanceof Error ? error.message : "게임 생성 실패",
              };
            }
            break;
          }

          case "REGISTER_CLAIM_PRIZE": {
            try {
              const response = await apiCall<{ success: boolean }>(
                `/v1/games/${encodeURIComponent(message.gameId)}/claim`,
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
                browser?.storage || (globalThis as any).chrome?.storage;

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

              const profileStorageKey = "profile";
              const profileKey = `${username}#${userTag}`;

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

              if (isMyProfile) {
                const existingProfile = existingProfiles[profileKey];

                if (
                  existingProfile &&
                  existingProfile.profileImageUrl &&
                  existingProfile.tokenAddr &&
                  existingProfile.tokenSymbol &&
                  existingProfile.memexWalletAddress
                ) {
                  result = {
                    success: true,
                    data: { success: true, skipped: true },
                  };
                  break;
                }

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
                      resolve();
                    }
                  );
                });

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
                      resolve();
                    }
                  );
                });
              } else {
                const existingCache = existingProfiles[profileKey];

                if (
                  existingCache &&
                  existingCache.profileImageUrl &&
                  existingCache.tokenAddr &&
                  existingCache.tokenSymbol &&
                  existingCache.memexWalletAddress
                ) {
                  result = {
                    success: true,
                    data: { success: true, skipped: true },
                  };
                  break;
                }

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
            const { username, userTag } = message as {
              type: string;
              username: string;
              userTag: string;
            };
            try {
              const { browser } = await import("wxt/browser");
              const tabs = browser?.tabs || (globalThis as any).chrome?.tabs;

              const memexTabs = await tabs.query({
                url: ["https://app.memex.xyz/*", "http://app.memex.xyz/*"],
              });

              if (memexTabs.length === 0 || !memexTabs[0]?.id) {
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
            const { data } = message as { type: string; data: JoinRequest };

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
                  browser?.storage || (globalThis as any).chrome?.storage;
                await new Promise<void>((resolve, reject) => {
                  storage.session.set(
                    { squid_user: response.data.user },
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
            try {
              const { browser } = await import("wxt/browser");
              const storage =
                browser?.storage || (globalThis as any).chrome?.storage;
              const tabs = browser?.tabs || (globalThis as any).chrome?.tabs;

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

              try {
                const memexTabs = await tabs.query({
                  url: ["https://app.memex.xyz/*", "http://app.memex.xyz/*"],
                });

                if (memexTabs.length > 0 && memexTabs[0]?.id) {
                  await tabs.sendMessage(memexTabs[0].id, {
                    type: "LOGOUT_INJECT_SCRIPT",
                  });
                }
              } catch {
                // Content Script 메시지 전송 실패는 무시
              }

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
            try {
              const { fileData, fileName, mimeType } = message as {
                type: string;
                fileData: string;
                fileName: string;
                mimeType: string;
              };

              const byteCharacters = atob(fileData);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: mimeType });

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
            try {
              const { browser } = await import("wxt/browser");
              const tabs = browser?.tabs || (globalThis as any).chrome?.tabs;
              const scripting = (globalThis as any).chrome?.scripting;

              let memexTabs = await tabs.query({
                url: ["https://app.memex.xyz/*", "http://app.memex.xyz/*"],
              });

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
                      setTimeout(resolve, 1500);
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
                  result = { success: false, error: "MEMEX 페이지 로딩 실패" };
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

              const injectionResults = await scripting.executeScript({
                target: { tabId: targetTab.id },
                world: "MAIN",
                func: async (action: string) => {
                  const ethereum = (window as any).ethereum;
                  if (!ethereum) {
                    return { error: "MetaMask가 설치되어 있지 않습니다." };
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
            try {
              const { browser } = await import("wxt/browser");
              const tabs = browser?.tabs || (globalThis as any).chrome?.tabs;
              const scripting = (globalThis as any).chrome?.scripting;

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

              const triggerLogin = (message as any).triggerLogin ?? false;

              const messageToSend = {
                type: "MEMEX_LOGIN",
                triggerLogin,
              };

              try {
                const response = await tabs.sendMessage(
                  targetTab.id,
                  messageToSend
                );
                result = { success: true, data: response };
              } catch {
                const injectionResults = await scripting.executeScript({
                  target: { tabId: targetTab.id },
                  world: "MAIN",
                  func: (shouldTriggerLogin: boolean) => {
                    try {
                      const data = window.sessionStorage.getItem(
                        "gtm_user_identifier"
                      );
                      if (data) {
                        const parsed = JSON.parse(data);
                        if (parsed.username && parsed.user_tag) {
                          return {
                            success: true,
                            isLoggedIn: true,
                            username: parsed.username,
                            userTag: parsed.user_tag,
                          };
                        }
                      }
                    } catch {
                      // 파싱 오류 무시
                    }

                    if (shouldTriggerLogin) {
                      const googleButton = (document.querySelector(
                        'button[class*="googleButton"]'
                      ) ||
                        document.querySelector(
                          'button:has(img[alt="Sign in with Google"])'
                        ) ||
                        document.querySelector(
                          "button.page_googleButton__XByPk"
                        )) as HTMLButtonElement;

                      if (googleButton) {
                        googleButton.click();
                        return {
                          success: true,
                          isLoggedIn: false,
                          loginStarted: true,
                        };
                      } else {
                        return {
                          success: true,
                          isLoggedIn: false,
                          loginStarted: false,
                        };
                      }
                    }

                    return {
                      success: true,
                      isLoggedIn: false,
                      loginStarted: false,
                    };
                  },
                  args: [triggerLogin],
                });

                const scriptResult = injectionResults?.[0]?.result;
                result = {
                  success: true,
                  data: scriptResult || { isLoggedIn: false },
                };
              }
            } catch (error: any) {
              console.error("❌ MEMEX_LOGIN 오류:", error);
              result = {
                success: true,
                data: { isLoggedIn: false, error: error.message },
              };
            }
            break;
          }

          case "REFRESH_MEMEX_TAB": {
            try {
              const { browser } = await import("wxt/browser");
              const tabs = browser?.tabs || (globalThis as any).chrome?.tabs;

              const memexTabs = await tabs.query({
                url: ["https://app.memex.xyz/*", "http://app.memex.xyz/*"],
              });

              if (memexTabs.length === 0) {
                await tabs.create({
                  url: "https://app.memex.xyz",
                  active: true,
                });
                result = {
                  success: true,
                  data: { opened: true, refreshed: false },
                };
              } else {
                const targetTab = memexTabs[0];

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

          case "SAVE_FUNDING": {
            try {
              const response = await apiCall<{
                success: boolean;
                data: { id: number };
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
                  error instanceof Error ? error.message : "펀딩 저장 실패",
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
                  message.username
                )}/${encodeURIComponent(message.userTag)}`
              );
              result = { success: true, data: response.data };
            } catch (error: any) {
              console.error("❌ 사용자 조회 오류:", error);
              result = {
                success: false,
                error:
                  error instanceof Error ? error.message : "사용자 조회 실패",
              };
            }
            break;
          }

          case "GET_PROFILE": {
            try {
              const { browser } = await import("wxt/browser");
              const storage =
                browser?.storage || (globalThis as any).chrome?.storage;

              // chrome.storage.session에서 walletAddress 가져오기
              const sessionState = await new Promise<any>((resolve) => {
                storage.session.get(["squid_session_state"], (result: any) => {
                  resolve(result.squid_session_state || null);
                });
              });

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
                  error instanceof Error ? error.message : "프로필 조회 실패",
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

          case "GET_QUESTS": {
            try {
              const { browser } = await import("wxt/browser");
              const storage =
                browser?.storage || (globalThis as any).chrome?.storage;

              const sessionState = await new Promise<any>((resolve) => {
                storage.session.get(["squid_session_state"], (result: any) => {
                  resolve(result.squid_session_state || null);
                });
              });

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
                data: { quests: any[] };
              }>("/v1/users/quests", {
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
                  error instanceof Error ? error.message : "퀘스트 조회 실패",
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

    return true;
  };
}
