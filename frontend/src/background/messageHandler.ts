import {
  BackgroundMessage,
  BackgroundResponse,
} from "../contents/lib/backgroundApi";
import { apiCall } from "./api";
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
            console.log("📥 GET_COMMENTS 요청:", message.gameAddress);
            const response = await apiCall<{
              success: boolean;
              data: { comments: any[] };
            }>(`/v1/comments/game/${encodeURIComponent(message.gameAddress)}`);
            // Result wrapper에서 comments 추출
            result = { success: true, data: response.data?.comments || [] };
            break;
          }

          // NOTE: CREATE_COMMENT는 더 이상 사용하지 않음 - 프론트엔드에서 직접 스마트 컨트랙트 호출
          // case 'CREATE_COMMENT': {
          //     console.log('📝 CREATE_COMMENT 요청:', message);
          //     const response = await apiCall<{ comment: any }>('/api/comments', {
          //         method: 'POST',
          //         body: JSON.stringify({
          //             challenge_id: message.challengeId,
          //             player_address: message.playerAddress,
          //             content: message.content,
          //             signature: (message as any).signature,
          //             message: (message as any).message,
          //         }),
          //     });
          //     result = { success: true, data: response.comment };
          //     break;
          // }

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

          case "NAVIGATE_TO_URL": {
            console.log(`🔗 NAVIGATE_TO_URL 요청:`, (message as any).url);
            try {
              const { browser } = await import("wxt/browser");
              const tabs = browser?.tabs || (globalThis as any).chrome?.tabs;

              // MEMEX 페이지 탭 찾기
              let memexTabs = await tabs.query({
                url: ["https://app.memex.xyz/*", "http://app.memex.xyz/*"],
              });

              if (memexTabs.length > 0 && memexTabs[0].id) {
                // 기존 MEMEX 탭의 URL 변경
                await tabs.update(memexTabs[0].id, { url: (message as any).url, active: true });
                result = { success: true, data: { success: true } };
              } else {
                // MEMEX 탭이 없으면 새 탭 열기
                await tabs.create({ url: (message as any).url, active: true });
                result = { success: true, data: { success: true } };
              }
            } catch (error: any) {
              console.error("❌ NAVIGATE_TO_URL 오류:", error);
              result = {
                success: false,
                error: error instanceof Error ? error.message : "URL 이동 실패",
              };
            }
            break;
          }

          case "MEMEX_LOGIN":
          case "WALLET_CONNECT":
          case "WALLET_GET_ACCOUNT": {
            console.log(`🔐 ${message.type} 요청`);
            try {
              const { browser } = await import("wxt/browser");
              const tabs = browser?.tabs || (globalThis as any).chrome?.tabs;

              // MEMEX 페이지 탭 찾기 (활성 탭이 아니어도 됨)
              let memexTabs = await tabs.query({
                url: ["https://app.memex.xyz/*", "http://app.memex.xyz/*"],
              });

              console.log(`🔐 MEMEX 탭 찾기 결과:`, memexTabs.length, "개");

              // MEMEX 탭이 없으면 새로 열기
              if (memexTabs.length === 0) {
                console.log(`🔐 MEMEX 탭 없음, 새 탭 열기`);
                const newTab = await tabs.create({
                  url: "https://app.memex.xyz",
                  active: true,
                });

                // 탭이 완전히 로드될 때까지 대기
                await new Promise<void>((resolve) => {
                  const listener = (
                    tabId: number,
                    changeInfo: { status?: string }
                  ) => {
                    if (tabId === newTab.id && changeInfo.status === "complete") {
                      tabs.onUpdated.removeListener(listener);
                      // content script 초기화 시간 추가 대기
                      setTimeout(resolve, 1000);
                    }
                  };
                  tabs.onUpdated.addListener(listener);
                  // 타임아웃 (10초)
                  setTimeout(() => {
                    tabs.onUpdated.removeListener(listener);
                    resolve();
                  }, 10000);
                });

                // 다시 조회
                memexTabs = await tabs.query({
                  url: ["https://app.memex.xyz/*", "http://app.memex.xyz/*"],
                });

                if (memexTabs.length === 0) {
                  result = {
                    success: false,
                    error: "MEMEX 페이지 로딩 중입니다. 잠시 후 다시 시도해주세요.",
                  };
                  break;
                }
              }

              // 첫 번째 MEMEX 탭 사용
              const targetTab = memexTabs[0];
              console.log(`🔐 타겟 탭:`, targetTab.id, targetTab.url);

              if (!targetTab?.id) {
                result = {
                  success: false,
                  error: "MEMEX 탭 ID를 찾을 수 없습니다.",
                };
                break;
              }

              // Content script로 메시지 전달
              const response = await tabs.sendMessage(targetTab.id, {
                type: message.type,
              });

              result = { success: true, data: response };
            } catch (error: any) {
              console.error(`❌ ${message.type} 오류:`, error);
              result = {
                success: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "지갑 연결 실패. MEMEX 페이지가 열려있는지 확인하세요.",
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
