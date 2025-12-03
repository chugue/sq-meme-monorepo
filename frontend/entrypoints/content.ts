import CommentApp from "@/contents/components/CommentApp";
import "@/contents/components/sub-components/CommentSection.css";
import mockUserData from "@/contents/utils/mock-user-data.json";
import React from "react";
import { createRoot, type Root } from "react-dom/client";

// 현재 URL 경로 트래킹
let currentPath = "";

// 프로필 페이지 패턴 확인 함수
function isProfilePage(url: string): boolean {
  const profilePattern = /^https?:\/\/app\.memex\.xyz\/profile\/[^/]+\/[^/]+/;
  return profilePattern.test(url);
}

// URL에서 토큰 주소 추출 (마지막 경로 부분)
function extractTokenFromUrl(url: string): string | null {
  const match = url.match(/\/profile\/[^/]+\/([^/?#]+)/);
  return match ? match[1] : null;
}

// 타겟 요소 찾기 함수 - 오른쪽 사이드바 (RightPanel) 타겟
function findTargetElement(): HTMLElement | null {
  let targetElement: HTMLElement | null = null;

  // 방법 1: RightPanel 클래스로 찾기 (가장 정확)
  targetElement = document.querySelector(
    '[class*="RightPanel_container"]'
  ) as HTMLElement;
  if (targetElement) {
    console.log("🦑 RightPanel_container 클래스로 타겟 요소 찾음");
    return targetElement;
  }

  // 방법 2: layout_rightPanelContainer 내부 div 찾기
  const rightPanelContainer = document.querySelector(
    '[class*="layout_rightPanelContainer"]'
  );
  if (rightPanelContainer) {
    targetElement = rightPanelContainer.querySelector("div") as HTMLElement;
    if (targetElement) {
      console.log("🦑 layout_rightPanelContainer > div로 타겟 요소 찾음");
      return targetElement;
    }
    // div가 없으면 컨테이너 자체 사용
    targetElement = rightPanelContainer as HTMLElement;
    console.log("🦑 layout_rightPanelContainer로 타겟 요소 찾음");
    return targetElement;
  }

  // 방법 3: Search 컴포넌트가 있는 section 찾기
  const searchElement = document.querySelector('[class*="Search_"]');
  if (searchElement) {
    // Search의 부모 컨테이너 찾기
    const parentContainer =
      searchElement.closest('[class*="RightPanel"]') ||
      searchElement.closest('[class*="rightPanel"]') ||
      searchElement.parentElement;
    if (parentContainer) {
      targetElement = parentContainer as HTMLElement;
      console.log("🦑 Search 컴포넌트 부모로 타겟 요소 찾음");
      return targetElement;
    }
  }

  // 방법 4: 폴백 - 세 번째 section (오른쪽 패널)
  const sections = document.querySelectorAll("section");
  if (sections.length >= 3) {
    // layout_rightPanelContainer가 세 번째 section일 가능성
    targetElement =
      (sections[2].querySelector("div") as HTMLElement) ||
      (sections[2] as HTMLElement);
    console.log("🦑 세 번째 section으로 폴백");
    return targetElement;
  }

  console.log("🦑 오른쪽 패널을 찾지 못함, body 사용");
  return document.body;
}

// 타겟 요소 찾기 (리트라이 로직 포함)
function findTargetElementWithRetry(
  maxRetries: number = 10,
  retryInterval: number = 500,
  timeout: number = 10000
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let retryCount = 0;

    const tryFind = () => {
      // 타임아웃 체크
      if (Date.now() - startTime > timeout) {
        console.warn("🦑 타겟 요소 찾기 타임아웃, body에 마운트합니다.");
        resolve(document.body);
        return;
      }

      const element = findTargetElement();

      // 타겟 요소를 찾았고 body가 아닌 경우
      if (element && element !== document.body) {
        console.log(
          "🦑 타겟 요소 찾기 성공:",
          element,
          `(시도: ${retryCount + 1})`
        );
        resolve(element);
        return;
      }

      retryCount++;

      // 최대 재시도 횟수 체크
      if (retryCount >= maxRetries) {
        console.warn(
          `🦑 타겟 요소를 ${maxRetries}회 시도 후 찾지 못했습니다. body에 마운트합니다.`
        );
        resolve(document.body);
        return;
      }

      // 다음 시도 예약
      setTimeout(tryFind, retryInterval);
    };

    // MutationObserver를 사용하여 DOM 변경 감지
    const observer = new MutationObserver(() => {
      const element = findTargetElement();
      if (element && element !== document.body) {
        console.log("🦑 MutationObserver로 타겟 요소 발견:");
        observer.disconnect();
        resolve(element);
      }
    });

    // body를 관찰 대상으로 설정
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // 즉시 첫 시도
    tryFind();

    // 타임아웃 설정
    setTimeout(() => {
      observer.disconnect();
      const element = findTargetElement();
      if (element) {
        resolve(element);
      } else {
        resolve(document.body);
      }
    }, timeout);
  });
}

// Injected script 주입 함수 (CSP 우회를 위해 외부 파일로 로드)
async function injectScript(): Promise<void> {
  // 이미 주입되었는지 확인 (script 태그로 확인)
  const existingScript = document.querySelector(
    'script[data-squid-meme-injected="true"]'
  );
  if (existingScript) {
    console.log("🦑 [SQUID_MEME] Injected script already exists");
    return;
  }

  try {
    // Chrome Extension의 외부 파일로 로드 (CSP 우회)
    const chromeRuntime = (globalThis as any).chrome?.runtime;
    if (!chromeRuntime) {
      throw new Error("Chrome runtime not available");
    }
    const scriptUrl = chromeRuntime.getURL("injected.js");

    // Script 태그 생성 및 주입
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.setAttribute("data-squid-meme-injected", "true");

    // 스크립트 로드 완료 처리
    script.onload = () => {
      console.log("✅ [SQUID_MEME] Injected script 주입 완료 (외부 파일)");
    };

    script.onerror = (error) => {
      console.error("❌ [SQUID_MEME] Injected script 로드 실패:", error);
      console.error("💡 스크립트 URL:", scriptUrl);
    };

    // body의 맨 앞에 주입 (다른 스크립트보다 먼저 실행되도록)
    if (document.body) {
      document.body.insertBefore(script, document.body.firstChild);
    } else {
      // body가 아직 없으면 대기
      document.addEventListener("DOMContentLoaded", () => {
        document.body.insertBefore(script, document.body.firstChild);
      });
    }
  } catch (error) {
    console.error("❌ [SQUID_MEME] Injected script 주입 실패:", error);
  }
}

// @ts-ignore
export default defineContentScript({
  // app.memex.xyz 프로필 페이지와 홈 페이지에서 실행
  matches: [
    "https://app.memex.xyz/*",
    "http://app.memex.xyz/*", // 개발 환경용
  ],
  // @ts-ignore
  async main(ctx) {
    console.log("🦑 Squid Meme Content Script 시작", window.location.href);

    // Injected script 확인 (메시지 기반)
    // 주의: injected script는 웹 페이지 컨텍스트에서 실행되므로,
    // content script의 window 객체에서는 __SQUID_MEME_INJECTED__를 확인할 수 없습니다.
    // 대신 INJECTED_SCRIPT_READY 메시지를 통해 확인합니다.
    let injectedScriptReady = false;

    const messageListener = (event: MessageEvent) => {
      // injected script로부터의 메시지만 처리
      if (event.data?.source === "INJECTED_SCRIPT_READY") {
        injectedScriptReady = true;
        console.log("✅ [SQUID_MEME] Injected script 확인됨 (메시지 수신)");
        window.removeEventListener("message", messageListener);
      }
    };

    // 페이지 로드 시 저장된 토큰을 window에 복원
    async function restoreStoredToken() {
      try {
        const { backgroundApi } = await import("@/contents/lib/backgroundApi");
        const storedToken = await backgroundApi.getStorage<string>(
          "auth_token",
          "session"
        );
        if (storedToken) {
          // @ts-ignore
          window.__SQUID_MEME_AUTH_TOKEN__ = storedToken;
          console.log("✅ [SQUID_MEME] 저장된 Authorization 토큰 복원 완료", {
            tokenLength: storedToken.length,
            tokenPreview: storedToken.substring(0, 30) + "...",
          });
        }
      } catch (error) {
        console.debug("저장된 토큰 없음 또는 복원 실패:", error);
      }
    }

    // Mock 데이터에서 accessToken 사용 (개발/테스트 환경)
    function setupMockToken() {
      try {
        // mock 데이터가 있고 첫 번째 사용자의 accessToken이 있으면 사용
        if (Array.isArray(mockUserData) && mockUserData.length > 0) {
          const firstUser = mockUserData[0];
          if (firstUser.accessToken) {
            // Bearer 접두사 확인 및 추가
            let mockToken = firstUser.accessToken;
            if (!mockToken.startsWith("Bearer ")) {
              mockToken = `Bearer ${mockToken}`;
            }

            // window에 저장 (injected script에서 사용)
            // @ts-ignore
            window.__SQUID_MEME_AUTH_TOKEN__ = mockToken;

            // localStorage에도 저장 (백업)
            try {
              localStorage.setItem("__SQUID_MEME_MOCK_TOKEN__", mockToken);
            } catch (e) {
              // localStorage 저장 실패는 무시
            }

            console.log("✅ [SQUID_MEME] Mock accessToken 설정 완료", {
              userName: firstUser.userName,
              tokenLength: mockToken.length,
              tokenPreview: mockToken.substring(0, 30) + "...",
            });
          }
        }
      } catch (error) {
        console.debug("Mock 토큰 설정 실패:", error);
      }
    }

    // Mock 토큰 설정 (우선 실행)
    setupMockToken();

    // 페이지 로드 시 토큰 복원 (mock 토큰이 없을 경우)
    restoreStoredToken();

    // 메시지 리스너를 먼저 등록 (스크립트 주입 전에)
    window.addEventListener("message", messageListener);

    // Injected script를 최대한 빠르게 주입 (다른 작업 전에)
    // await를 사용하지 않고 비동기로 주입하여 다른 작업을 블로킹하지 않음
    injectScript().catch((err) => {
      console.error("❌ [SQUID_MEME] Injected script 주입 실패:", err);
    });

    // 타임아웃 설정 (5초 후에도 메시지가 오지 않으면 경고)
    setTimeout(() => {
      if (!injectedScriptReady) {
        console.warn(
          "⚠️ [SQUID_MEME] Injected script 준비 메시지를 받지 못했습니다"
        );
        console.warn(
          "💡 injected script는 로드되었지만 준비 메시지가 지연되고 있을 수 있습니다"
        );
      }
    }, 5000);

    // 타겟 요소 찾기 (리트라이 로직 포함) - 빠르게 찾고 없으면 body 사용
    const targetElement = await findTargetElementWithRetry(10, 500, 5000);

    // 타겟 요소 로깅 (오른쪽 사이드바의 기존 스타일 유지)
    if (targetElement && targetElement !== document.body) {
      console.log("🦑 타겟 요소 (오른쪽 사이드바):", targetElement.className);
    }

    // createIntegratedUi를 사용하여 UI 생성
    // @ts-ignore
    const ui = createIntegratedUi(ctx, {
      position: "inline",
      anchor: targetElement || "body",
      // @ts-ignore
      onMount: (container: HTMLElement) => {
        console.log("🦑 UI 마운트 시작", {
          containerId: container.id,
          containerParent: container.parentElement?.tagName,
        });

        // 컨테이너 스타일 적용
        container.id = "squid-meme-comment-root";
        container.style.marginTop = "20px";
        container.style.marginBottom = "20px";
        container.style.zIndex = "9999";
        container.style.position = "relative";
        container.style.minHeight = "100px";
        container.style.width = "100%";
        container.setAttribute("data-squid-meme", "true");

        // React root 생성 및 컴포넌트 렌더링
        try {
          const root: Root = createRoot(container);
          root.render(React.createElement(CommentApp));
          console.log("🦑 React 컴포넌트 렌더링 완료");
          return root;
        } catch (error) {
          console.error("❌ React 컴포넌트 렌더링 오류:", error);
          // CSP를 준수하는 방식으로 에러 메시지 표시 (innerHTML 대신 DOM API 사용)
          const errorDiv = document.createElement("div");
          errorDiv.style.cssText =
            "padding: 20px; background: #ff4444; color: white; border: 2px solid #ff0000; font-family: monospace;";

          const errorTitle = document.createElement("h3");
          errorTitle.textContent = "Error Loading Comment Component";
          errorDiv.appendChild(errorTitle);

          const errorMessage = document.createElement("p");
          errorMessage.textContent =
            error instanceof Error ? error.message : "Unknown error";
          errorDiv.appendChild(errorMessage);

          if (error instanceof Error && error.stack) {
            const errorStack = document.createElement("pre");
            errorStack.textContent = error.stack;
            errorDiv.appendChild(errorStack);
          }
          new Promise((resolve) => {
            window.addEventListener("message", function listener(event) {
              if (event.data.source === "INJECTED_SCRIPT_READY") {
                console.log("Injected script is ready. Starting connection.");
                window.removeEventListener("message", listener);
                resolve(true);
              }
            });
          });
          container.appendChild(errorDiv);
          return null;
        }
      },
      // @ts-ignore
      onRemove: (root) => {
        console.log("🦑 UI 제거 시작");
        if (root) {
          root.unmount();
        }
      },
    });

    // UI 마운트
    ui.mount();
    currentPath = window.location.pathname;

    // SPA 네비게이션 감지를 위한 URL 변경 리스너
    const handleUrlChange = async () => {
      const newPath = window.location.pathname;
      const newToken = extractTokenFromUrl(window.location.href);
      const oldToken = extractTokenFromUrl(currentPath);

      console.log("🦑 URL 변경 감지:", {
        oldPath: currentPath,
        newPath,
        oldToken,
        newToken,
        isProfilePage: isProfilePage(window.location.href),
      });

      // 같은 토큰의 프로필 페이지면 무시
      if (newToken === oldToken) {
        return;
      }

      currentPath = newPath;

      // SPA 네비게이션 시 UI를 재마운트하지 않음
      // React 내부에서 SPA_NAVIGATION 메시지를 받아 상태를 업데이트함
      // 이렇게 하면 메시지 리스너가 unmount되지 않아 cachedToken을 받을 수 있음
      console.log("🦑 SPA 네비게이션 감지 - React 내부에서 상태 업데이트 처리");

      // 프로필 페이지가 아니면 로그만 출력 (UI는 React에서 처리)
      if (!isProfilePage(window.location.href)) {
        console.log("🦑 프로필 페이지 아님");
      }
    };

    // Injected Script로부터 SPA 네비게이션 메시지 수신
    const spaNavigationListener = (event: MessageEvent) => {
      if (event.data?.source === "SPA_NAVIGATION") {
        console.log("🦑 SPA_NAVIGATION 메시지 수신:", event.data);
        handleUrlChange();
      }
    };

    window.addEventListener("message", spaNavigationListener);

    // Background script로부터의 메시지 처리 (sidepanel -> background -> content)
    const { browser } = await import("wxt/browser");
    const runtime = browser?.runtime || (globalThis as any).chrome?.runtime;

    if (runtime?.onMessage) {
      runtime.onMessage.addListener(
        (
          message: { type: string },
          _sender: any,
          sendResponse: (response: any) => void
        ) => {
          if (message.type === "WALLET_CONNECT") {
            console.log("🔐 [Content] WALLET_CONNECT 요청 수신");
            // injected script를 통해 MetaMask 연결
            import("@/contents/lib/injectedApi").then(({ injectedApi }) => {
              injectedApi
                .requestAccounts()
                .then((accounts) => {
                  console.log("✅ [Content] 지갑 연결 성공:", accounts[0]);
                  sendResponse({ address: accounts[0] });
                })
                .catch((error) => {
                  console.error("❌ [Content] 지갑 연결 실패:", error);
                  sendResponse({ error: error.message });
                });
            });
            return true; // 비동기 응답
          }

          if (message.type === "WALLET_GET_ACCOUNT") {
            console.log("🔐 [Content] WALLET_GET_ACCOUNT 요청 수신");

            // localStorage의 @appkit/connection_status로 연결 상태 확인
            const connectionStatus = window.localStorage.getItem(
              "@appkit/connection_status"
            );
            const isConnected = connectionStatus === "connected";
            console.log(
              "🔐 [Content] @appkit/connection_status:",
              connectionStatus
            );

            if (isConnected) {
              // 연결된 경우 identity_cache에서 주소 추출
              try {
                const identityCache = window.localStorage.getItem(
                  "@appkit/identity_cache"
                );
                if (identityCache) {
                  const parsed = JSON.parse(identityCache);
                  // 첫 번째 주소 추출 (키가 주소임)
                  const address = Object.keys(parsed)[0] || null;
                  console.log("✅ [Content] 지갑 연결됨:", {
                    isConnected: true,
                    address,
                  });
                  sendResponse({ isConnected: true, address });
                  return;
                }
              } catch (e) {
                console.error("❌ [Content] identity_cache 파싱 오류:", e);
              }

              // identity_cache가 없으면 MetaMask에서 직접 조회
              import("@/contents/lib/injectedApi").then(({ injectedApi }) => {
                injectedApi
                  .getAccounts()
                  .then((accounts) => {
                    console.log(
                      "✅ [Content] MetaMask 계정 조회:",
                      accounts[0]
                    );
                    sendResponse({
                      isConnected: true,
                      address: accounts[0] || null,
                    });
                  })
                  .catch(() => {
                    sendResponse({ isConnected: true, address: null });
                  });
              });
            } else {
              console.log("✅ [Content] 지갑 미연결");
              sendResponse({ isConnected: false, address: null });
            }
            return true; // 비동기 응답
          }

          if (message.type === "MEMEX_LOGIN") {
            const triggerLogin = (message as any).triggerLogin ?? false;
            console.log(
              "🔐 [Content] MEMEX_LOGIN 요청 수신, triggerLogin:",
              triggerLogin
            );

            // sessionStorage의 gtm_user_identifier 확인
            try {
              const data = window.sessionStorage.getItem("gtm_user_identifier");
              if (data) {
                const parsed = JSON.parse(data);
                if (parsed.username && parsed.user_tag) {
                  console.log(
                    "✅ [Content] 이미 로그인되어 있음:",
                    parsed.username
                  );
                  sendResponse({
                    success: true,
                    isLoggedIn: true,
                    username: parsed.username,
                    userTag: parsed.user_tag,
                  });
                  return true;
                }
              }
            } catch (e) {
              console.error("❌ [Content] gtm_user_identifier 파싱 오류:", e);
            }

            // 로그인 안됨 - triggerLogin이 true일 때만 Google 버튼 클릭
            if (triggerLogin) {
              const googleButton = document.querySelector(
                "button.page_googleButton__XByPk"
              ) as HTMLButtonElement;
              if (googleButton) {
                console.log("✅ [Content] Google 로그인 버튼 발견, 클릭");
                googleButton.click();
                sendResponse({
                  success: true,
                  isLoggedIn: false,
                  loginStarted: true,
                });
              } else {
                console.log("🔐 [Content] Google 버튼 없음");
                sendResponse({
                  success: true,
                  isLoggedIn: false,
                  loginStarted: false,
                });
              }
            } else {
              // triggerLogin이 false면 상태만 반환
              console.log(
                "🔐 [Content] 로그인 상태 확인만 (triggerLogin=false)"
              );
              sendResponse({
                success: true,
                isLoggedIn: false,
                loginStarted: false,
              });
            }
            return true;
          }

          if (message.type === "FETCH_MEMEX_PROFILE_INFO") {
            const { username, userTag } = message as any;
            console.log(
              "🖼️ [Content] FETCH_MEMEX_PROFILE_INFO 요청 수신:",
              username,
              userTag
            );

            // 비동기 함수로 처리
            (async () => {
              try {
                let profileImageUrl: string | null = null;
                let tokenAddr: string | null = null;
                let tokenSymbol: string | null = null;
                let memexWalletAddress: string | null = null;

                // 현재 페이지가 해당 유저의 프로필 페이지인지 확인
                const expectedPath = `/profile/${username}/${userTag}`;
                const currentUrl = window.location.href;
                const isTargetProfile = currentUrl.includes(expectedPath);

                // 올바른 프로필 페이지가 아니면 대기 (최대 5초)
                if (!isTargetProfile) {
                  console.log("🖼️ [Content] 올바른 프로필 페이지 대기 중...", {
                    expectedPath,
                    currentUrl,
                  });

                  const waitForCorrectUrl = (): Promise<boolean> => {
                    return new Promise((resolve) => {
                      const maxWait = 5000;
                      const checkInterval = 200;
                      let elapsed = 0;

                      const check = () => {
                        if (window.location.href.includes(expectedPath)) {
                          console.log(
                            "✅ [Content] 올바른 프로필 페이지 도달:",
                            window.location.href
                          );
                          resolve(true);
                          return;
                        }
                        elapsed += checkInterval;
                        if (elapsed >= maxWait) {
                          console.warn(
                            "⚠️ [Content] 프로필 페이지 대기 타임아웃"
                          );
                          resolve(false);
                          return;
                        }
                        setTimeout(check, checkInterval);
                      };
                      check();
                    });
                  };

                  const urlMatched = await waitForCorrectUrl();
                  if (!urlMatched) {
                    console.warn(
                      "⚠️ [Content] 프로필 페이지가 올바르지 않음, 빈 데이터 반환"
                    );
                    sendResponse({
                      profileImageUrl: null,
                      tokenAddr: null,
                      tokenSymbol: null,
                      memexWalletAddress: null,
                    });
                    return;
                  }

                  // URL 일치 후 DOM 렌더링 대기
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                }

                // 방법 1: injectedApi를 통해 __next_f 데이터 가져오기
                // Content script는 isolated world에서 실행되므로 웹 페이지의 self.__next_f에 직접 접근할 수 없음
                // injected script는 웹 페이지 컨텍스트에서 실행되므로 self.__next_f에 접근 가능
                try {
                  console.log(
                    "🔍 [Content] injectedApi.getNextFData() 호출 시도..."
                  );
                  const { injectedApi } = await import(
                    "@/contents/lib/injectedApi"
                  );
                  const nextFData = await injectedApi.getNextFData();

                  if (nextFData) {
                    console.log(
                      "✅ [Content] injectedApi.getNextFData() 결과:",
                      nextFData
                    );
                    profileImageUrl =
                      nextFData.profileImageUrl || profileImageUrl;
                    tokenAddr = nextFData.tokenAddr || tokenAddr;
                    tokenSymbol = nextFData.tokenSymbol || tokenSymbol;
                    memexWalletAddress =
                      nextFData.memexWalletAddress || memexWalletAddress;
                  }
                } catch (nextFErr) {
                  console.warn(
                    "⚠️ [Content] injectedApi.getNextFData() 실패:",
                    nextFErr
                  );
                }

                // 방법 2: __NEXT_DATA__에서 프로필 정보 추출 (폴백)
                if (!tokenAddr || !tokenSymbol || !profileImageUrl) {
                  const nextDataScript =
                    document.getElementById("__NEXT_DATA__");
                  if (nextDataScript) {
                    try {
                      const nextData = JSON.parse(
                        nextDataScript.textContent || ""
                      );
                      console.log("🔍 [Content] __NEXT_DATA__ 파싱 성공");

                      const pageProps = nextData?.props?.pageProps;
                      if (pageProps) {
                        if (!profileImageUrl && pageProps.profileImageUrl) {
                          profileImageUrl = pageProps.profileImageUrl;
                        }
                        if (
                          !tokenAddr &&
                          (pageProps.tokenAddress || pageProps.token?.address)
                        ) {
                          tokenAddr =
                            pageProps.tokenAddress || pageProps.token?.address;
                        }
                        if (
                          !tokenSymbol &&
                          (pageProps.tokenSymbol || pageProps.token?.symbol)
                        ) {
                          tokenSymbol =
                            pageProps.tokenSymbol || pageProps.token?.symbol;
                        }
                      }
                    } catch (e) {
                      console.log("🖼️ [Content] __NEXT_DATA__ 파싱 실패:", e);
                    }
                  }
                }

                // 방법 3: DOM에서 직접 프로필 이미지 추출 (백업)
                if (!profileImageUrl && isTargetProfile) {
                  const profileImg = document.querySelector(
                    'img[alt="Profile"]'
                  ) as HTMLImageElement;
                  if (profileImg && profileImg.src) {
                    if (profileImg.src.includes("_next/image")) {
                      const urlParams = new URL(profileImg.src).searchParams;
                      const encodedUrl = urlParams.get("url");
                      if (encodedUrl) {
                        profileImageUrl = decodeURIComponent(encodedUrl);
                      }
                    } else {
                      profileImageUrl = profileImg.src;
                    }
                    console.log(
                      "✅ [Content] DOM에서 프로필 이미지 발견:",
                      profileImageUrl
                    );
                  }
                }

                sendResponse({
                  profileImageUrl,
                  tokenAddr,
                  tokenSymbol,
                  memexWalletAddress,
                });
              } catch (e) {
                console.error("❌ [Content] FETCH_MEMEX_PROFILE_INFO 오류:", e);
                sendResponse({
                  profileImageUrl: null,
                  tokenAddr: null,
                  tokenSymbol: null,
                  memexWalletAddress: null,
                });
              }
            })();
            return true;
          }

          if (message.type === "WALLET_DISCONNECT") {
            console.log("🔐 [Content] WALLET_DISCONNECT 요청 수신");

            // 1. localStorage에서 appkit 관련 데이터 삭제
            try {
              window.localStorage.removeItem("@appkit/connection_status");
              window.localStorage.removeItem("@appkit/identity_cache");
              window.localStorage.removeItem("@appkit/connected_connector");
              window.localStorage.removeItem("@appkit/active_caip_network_id");
              console.log("✅ [Content] localStorage appkit 데이터 삭제 완료");
            } catch (e) {
              console.error("❌ [Content] localStorage 삭제 오류:", e);
            }

            // 2. MetaMask wallet_revokePermissions 호출
            import("@/contents/lib/injectedApi")
              .then(async ({ injectedApi }) => {
                try {
                  await injectedApi.revokePermissions();
                  console.log("✅ [Content] MetaMask 권한 해제 완료");
                  sendResponse({ success: true });
                } catch (error: any) {
                  console.warn(
                    "⚠️ [Content] MetaMask 권한 해제 실패 (무시):",
                    error.message
                  );
                  // 권한 해제 실패해도 localStorage는 삭제되었으므로 성공으로 처리
                  sendResponse({ success: true });
                }
              })
              .catch((error) => {
                console.error("❌ [Content] injectedApi import 실패:", error);
                sendResponse({ success: true }); // localStorage는 삭제되었으므로 성공
              });
            return true; // 비동기 응답
          }

          return false;
        }
      );
      console.log("🦑 [Content] Background 메시지 리스너 등록 완료");
    }

    // 클린업 함수 등록
    ctx.onInvalidated(() => {
      window.removeEventListener("message", spaNavigationListener);
      console.log("🦑 Content script 클린업 완료");
    });
  },
});
