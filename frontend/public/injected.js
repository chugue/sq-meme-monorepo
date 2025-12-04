/**
 * Injected Script - 웹페이지 컨텍스트에서 실행
 *
 * - 보안 강화
 * - 에러 처리 개선
 * - 구조화된 로깅
 * - 확장 가능한 구조
 */

(function () {
  "use strict";

  // 고유 식별자
  const SCRIPT_ID = "__SQUID_MEME_INJECTED__";
  const MESSAGE_SOURCE = {
    CONTENT_SCRIPT: "CONTENT_SCRIPT",
    INJECTED_SCRIPT_RESPONSE: "INJECTED_SCRIPT_RESPONSE",
    INJECTED_SCRIPT_READY: "INJECTED_SCRIPT_READY",
    ACCOUNTS_CHANGED: "ACCOUNTS_CHANGED",
    CHAIN_CHANGED: "CHAIN_CHANGED",
    TOKEN_CONTRACT_CACHED: "TOKEN_CONTRACT_CACHED",
    SPA_NAVIGATION: "SPA_NAVIGATION",
    LOGOUT_COMPLETE: "LOGOUT_COMPLETE",
  };

  // 이미 주입되었는지 확인
  if (window[SCRIPT_ID]) {
    console.warn("🦑 [SQUID_MEME] Injected script already exists");
    return;
  }

  // 식별자 설정 (가장 먼저 실행)
  window[SCRIPT_ID] = true;

  // 즉시 fetch intercept 설정 (다른 코드보다 먼저 실행)
  // 이렇게 하면 웹페이지의 초기 요청도 캡처할 수 있습니다
  let cachedAuthToken = null;
  const CACHE_DURATION = 5 * 60 * 1000; // 5분

  // 사용자별 토큰 컨트랙트 주소 캐시
  // 키: username#usertag, 값: { id, contractAddress, username, userTag, timestamp }
  const tokenContractCache = new Map();

  // window에 토큰 저장 (Content Script와 공유)
  const TOKEN_STORAGE_KEY = "__SQUID_MEME_AUTH_TOKEN__";

  // 저장된 토큰 읽기 (window에서)
  function getStoredToken() {
    try {
      return window[TOKEN_STORAGE_KEY] || null;
    } catch (e) {
      return null;
    }
  }

  // 토큰 저장 (window에)
  function setStoredToken(token) {
    try {
      window[TOKEN_STORAGE_KEY] = token;
    } catch (e) {
      // 저장 실패는 무시
    }
  }

  /**
   * __next_f 데이터에서 토큰 컨트랙트 주소 추출
   * Next.js RSC 페이로드에서 프로필의 tokenAddress를 찾습니다.
   */
  function extractTokenFromNextF() {
    try {
      const currentUrl = window.location.href;
      const profileMatch = currentUrl.match(/\/profile\/([^\/]+)\/([^\/]+)/);

      if (!profileMatch) {
        return null;
      }

      const [, username, userTag] = profileMatch;

      // 방법 1: DOM에서 __next_f 스크립트 태그들을 찾아서 파싱
      const scripts = document.querySelectorAll("script");
      let tokenAddress = null;
      let tokenSymbol = null;

      for (const script of scripts) {
        const content = script.textContent || "";

        // self.__next_f.push 형태의 스크립트에서 tokenAddress 추출
        if (content.includes("self.__next_f.push")) {
          // tokenAddress 패턴 찾기 (이스케이프된 JSON 내부)
          // "tokenAddress":"0x..." 또는 \"tokenAddress\":\"0x...\"
          const tokenMatch = content.match(
            /\\?"tokenAddress\\?"\\?:\s*\\?"(0x[a-fA-F0-9]{40})\\?"/
          );
          if (tokenMatch && tokenMatch[1]) {
            tokenAddress = tokenMatch[1];
          }

          // tokenSymbol도 추출
          const symbolMatch = content.match(
            /\\?"tokenSymbol\\?"\\?:\s*\\?"([^"\\]+)\\?"/
          );
          if (symbolMatch && symbolMatch[1]) {
            tokenSymbol = symbolMatch[1];
          }

          if (tokenAddress) {
            break;
          }
        }
      }

      // 방법 2: DOM에서 직접 심볼 추출 (폴백)
      if (!tokenSymbol) {
        const symbolElement = document.querySelector(".Profile_symbol__TEC9N");
        if (symbolElement) {
          tokenSymbol = symbolElement.textContent?.trim() || null;
        }
      }

      if (tokenAddress) {
        return {
          contractAddress: tokenAddress,
          username,
          userTag,
          symbol: tokenSymbol,
          timestamp: Date.now(),
        };
      }

      return null;
    } catch (e) {
      log.error("__next_f 토큰 추출 실패", e);
      return null;
    }
  }

  /**
   * fetch로 프로필 HTML을 가져와서 토큰 추출 (SPA 네비게이션용)
   * DOM의 스크립트가 아직 업데이트되지 않은 경우 사용
   */
  async function fetchTokenFromProfile() {
    try {
      const currentUrl = window.location.href;
      const profileMatch = currentUrl.match(/\/profile\/([^\/]+)\/([^\/]+)/);

      if (!profileMatch) {
        return null;
      }

      const [, username, userTag] = profileMatch;

      log.info("fetch로 프로필 HTML 가져오기 시도", { username, userTag });

      const response = await fetch(currentUrl);
      if (!response.ok) {
        log.warn("fetch 실패", { status: response.status });
        return null;
      }

      const html = await response.text();

      // self.__next_f.push 스크립트에서 tokenAddress 추출
      let tokenAddress = null;
      let tokenSymbol = null;

      // HTML에서 tokenAddress 패턴 찾기
      const tokenMatch = html.match(
        /\\?"tokenAddress\\?"\\?:\s*\\?"(0x[a-fA-F0-9]{40})\\?"/
      );
      if (tokenMatch && tokenMatch[1]) {
        tokenAddress = tokenMatch[1];
      }

      // tokenSymbol도 추출
      const symbolMatch = html.match(
        /\\?"tokenSymbol\\?"\\?:\s*\\?"([^"\\]+)\\?"/
      );
      if (symbolMatch && symbolMatch[1]) {
        tokenSymbol = symbolMatch[1];
      }

      if (tokenAddress) {
        log.info("fetch로 토큰 정보 추출 성공", { tokenAddress, tokenSymbol });
        return {
          contractAddress: tokenAddress,
          username,
          userTag,
          symbol: tokenSymbol,
          timestamp: Date.now(),
        };
      }

      log.warn("fetch한 HTML에서 토큰 정보 없음");
      return null;
    } catch (e) {
      log.error("fetch 토큰 추출 실패", e);
      return null;
    }
  }

  // 원본 fetch 저장
  const originalFetch = window.fetch;

  // NOTE: fetch intercept 비활성화 - __next_f 방식으로 대체
  // price API 호출 대기 없이 __next_f에서 즉시 토큰 주소 추출
  // if (typeof originalFetch === 'function') {
  //     window.fetch = function (...args) {
  //         const [url, options = {}] = args;
  //         const urlString = typeof url === 'string' ? url : url?.url || '';
  //
  //
  //         // /api/service/public/price/latest/{id}/{contractAddress} 요청 감지
  //         const priceMatch = urlString.match(/\/api\/service\/public\/price\/latest\/([^\/]+)\/(0x[a-fA-F0-9]+)/);
  //         if (priceMatch) {
  //             const [, id, contractAddress] = priceMatch;
  //
  //             // 현재 브라우저 URL에서 profile/{username}/{usertag} 추출
  //             const currentUrl = window.location.href;
  //             const profileMatch = currentUrl.match(/\/profile\/([^\/]+)\/([^\/]+)/);
  //
  //             if (profileMatch) {
  //                 const [, username, userTag] = profileMatch;
  //                 const cacheKey = `${username}#${userTag}`;
  //
  //                 // 이미 같은 토큰이 캐시되어 있는지 확인 (중복 메시지 방지)
  //                 const existingCache = tokenContractCache.get(cacheKey);
  //                 const isNewToken = !existingCache || existingCache.contractAddress !== contractAddress;
  //
  //                 // DOM에서 토큰 심볼 파싱 (.Profile_symbol__TEC9N 요소)
  //                 let tokenSymbol = null;
  //                 try {
  //                     const symbolElement = document.querySelector('.Profile_symbol__TEC9N');
  //                     if (symbolElement) {
  //                         tokenSymbol = symbolElement.textContent?.trim() || null;
  //                     }
  //                 } catch (e) {
  //                     // DOM 파싱 실패는 무시
  //                 }
  //
  //                 // 캐시에 저장 (항상 업데이트 - timestamp 갱신)
  //                 tokenContractCache.set(cacheKey, {
  //                     id,
  //                     contractAddress,
  //                     username,
  //                     userTag,
  //                     symbol: tokenSymbol,
  //                     timestamp: Date.now()
  //                 });
  //
  //                 // 새로운 토큰일 때만 로그 및 메시지 전송 (중복 방지)
  //                 if (isNewToken) {
  //                     log.info('✅ 토큰 컨트랙트 주소 캐시됨', {
  //                         username,
  //                         userTag,
  //                         id,
  //                         contractAddress,
  //                         symbol: tokenSymbol,
  //                         cacheKey
  //                     });
  //
  //                     // Content Script에 토큰 컨트랙트 캐시 알림 (최초 1회만)
  //                     window.postMessage(
  //                         {
  //                             source: MESSAGE_SOURCE.TOKEN_CONTRACT_CACHED,
  //                             data: {
  //                                 id,
  //                                 contractAddress,
  //                                 username,
  //                                 userTag,
  //                                 symbol: tokenSymbol,
  //                                 timestamp: Date.now()
  //                             },
  //                         },
  //                         '*'
  //                     );
  //                 }
  //             }
  //         }
  //
  //         return originalFetch.apply(this, args);
  //     };
  // }

  // 로깅 헬퍼
  const log = {
    info: (message, ...args) =>
      console.log(`🦑 [SQUID_MEME] ${message}`, ...args),
    warn: (message, ...args) =>
      console.warn(`🦑 [SQUID_MEME] ${message}`, ...args),
    error: (message, ...args) =>
      console.error(`🦑 [SQUID_MEME] ${message}`, ...args),
  };

  log.info("Injected script loaded");

  // XMLHttpRequest도 intercept (일부 앱은 fetch 대신 XMLHttpRequest 사용)
  if (typeof window.XMLHttpRequest !== "undefined") {
    const OriginalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function () {
      const xhr = new OriginalXHR();
      const originalSetRequestHeader = xhr.setRequestHeader;
      const originalOpen = xhr.open;
      const originalSend = xhr.send;

      let requestUrl = "";
      let requestHeaders = {};

      xhr.open = function (method, url, ...args) {
        requestUrl = url;
        return originalOpen.apply(this, [method, url, ...args]);
      };

      xhr.setRequestHeader = function (header, value) {
        requestHeaders[header.toLowerCase()] = value;
        return originalSetRequestHeader.apply(this, arguments);
      };

      // send 호출 시점에 모든 헤더 확인
      xhr.send = function (...args) {
        if (requestUrl.includes("/api/service/public/user/info")) {
          log.info("🔍 XHR 사용자 정보 API 요청", {
            url: requestUrl.substring(0, 150),
            headers: Object.keys(requestHeaders),
          });
        }
        return originalSend.apply(this, args);
      };

      return xhr;
    };

    log.info("✅ XMLHttpRequest intercept 설정 완료");
  }

  // MetaMask provider 확인
  if (typeof window.ethereum === "undefined") {
    log.warn("MetaMask provider not found in the window");
  } else {
    log.info("MetaMask provider found. Setting up message listeners");
  }

  /**
   * 메시지 검증
   */
  function isValidMessage(event, expectedSource) {
    // 같은 window 객체에서 온 메시지인지 확인
    if (event.source !== window) {
      return false;
    }

    // 데이터 구조 확인
    if (!event.data || typeof event.data !== "object") {
      return false;
    }

    // source 확인
    if (event.data.source !== expectedSource) {
      return false;
    }

    return true;
  }

  /**
   * Ethereum 요청 처리
   */
  async function handleEthereumRequest(payload) {
    try {
      if (!window.ethereum) {
        throw new Error("Ethereum provider not available");
      }

      log.info("Processing Ethereum request", {
        method: payload.method,
        id: payload.id,
      });

      let result = await window.ethereum.request({
        method: payload.method,
        params: payload.params || [],
      });

      // wallet_switchEthereumChain은 null을 반환할 수 있음
      if (payload.method === "wallet_switchEthereumChain" && result === null) {
        result = { success: true };
      }

      // 결과 전송
      window.postMessage(
        {
          source: MESSAGE_SOURCE.INJECTED_SCRIPT_RESPONSE,
          id: payload.id,
          result: result,
        },
        "*"
      );

      log.info("Ethereum request completed", {
        method: payload.method,
        id: payload.id,
      });
    } catch (error) {
      log.error("Ethereum request failed", error, {
        method: payload.method,
        id: payload.id,
      });

      // MetaMask 에러 코드 추출
      let errorMessage = error?.message || "Injection request failed";
      let errorCode = null;

      if (error?.code) {
        errorCode = error.code;
        // 4902는 체인이 추가되지 않았다는 의미
        if (error.code === 4902) {
          errorMessage = "Chain not added. Please add chain manually.";
        }
      }

      // 에러 전송
      window.postMessage(
        {
          source: MESSAGE_SOURCE.INJECTED_SCRIPT_RESPONSE,
          id: payload.id,
          error: errorMessage,
          errorCode: errorCode,
        },
        "*"
      );
    }
  }

  /**
   * SessionStorage 읽기
   */
  function getSessionStorage(key) {
    try {
      const value = window.sessionStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      log.error("SessionStorage 읽기 실패", error, { key });
      return null;
    }
  }

  /**
   * 메시지 리스너
   */
  window.addEventListener("message", async (event) => {
    // Content Script로부터의 메시지만 처리
    if (!isValidMessage(event, MESSAGE_SOURCE.CONTENT_SCRIPT)) {
      return;
    }

    const { method, payload } = event.data;

    // ETH_REQUEST 메서드 처리
    if (method === "ETH_REQUEST") {
      await handleEthereumRequest(payload);
    }

    // GET_SESSION_STORAGE 메서드 처리
    if (method === "GET_SESSION_STORAGE") {
      try {
        const key = payload.key;
        if (!key) {
          throw new Error("Key is required");
        }

        const value = getSessionStorage(key);
        window.postMessage(
          {
            source: MESSAGE_SOURCE.INJECTED_SCRIPT_RESPONSE,
            id: payload.id,
            result: value,
          },
          "*"
        );
      } catch (error) {
        log.error("SessionStorage 읽기 실패", error, { key: payload?.key });
        window.postMessage(
          {
            source: MESSAGE_SOURCE.INJECTED_SCRIPT_RESPONSE,
            id: payload.id,
            error: error?.message || "Failed to read sessionStorage",
          },
          "*"
        );
      }
    }

    // LOGOUT 메서드 처리 (사이드 패널에서 로그아웃 시)
    if (method === "LOGOUT") {
      try {
        log.info("🚪 LOGOUT 요청 수신 - 토큰 및 캐시 초기화 시작");

        // 1. 캐시된 인증 토큰 초기화
        cachedAuthToken = null;

        // 2. window에 저장된 토큰 삭제
        try {
          delete window[TOKEN_STORAGE_KEY];
        } catch (e) {
          // 삭제 실패는 무시
        }

        // 3. 토큰 컨트랙트 캐시 초기화
        tokenContractCache.clear();

        // NOTE: window 캐시 비활성화 - 이벤트 드리븐 방식으로 대체
        // // 4. window에 저장된 토큰 컨트랙트 정보 삭제
        // try {
        //     delete window.__SQUID_MEME_TOKEN_CONTRACTS__;
        // } catch (e) {
        //     // 삭제 실패는 무시
        // }

        // 5. localStorage의 Mock 토큰 삭제 (개발/테스트 환경)
        try {
          localStorage.removeItem("__SQUID_MEME_MOCK_TOKEN__");
        } catch (e) {
          // localStorage 접근 실패는 무시
        }

        // 6. sessionStorage의 gtm_user_identifier 삭제 (MEMEX 로그인 상태)
        try {
          sessionStorage.removeItem("gtm_user_identifier");
          log.info("✅ gtm_user_identifier 삭제 완료");
        } catch (e) {
          // sessionStorage 접근 실패는 무시
        }

        log.info("✅ LOGOUT 완료 - 모든 토큰 및 캐시 초기화됨");

        // 로그아웃 완료 알림
        window.postMessage(
          {
            source: MESSAGE_SOURCE.LOGOUT_COMPLETE,
            success: true,
          },
          "*"
        );

        // 요청에 대한 응답
        window.postMessage(
          {
            source: MESSAGE_SOURCE.INJECTED_SCRIPT_RESPONSE,
            id: payload.id,
            result: { success: true },
          },
          "*"
        );
      } catch (error) {
        log.error("❌ LOGOUT 처리 실패", error);
        window.postMessage(
          {
            source: MESSAGE_SOURCE.INJECTED_SCRIPT_RESPONSE,
            id: payload.id,
            error: error?.message || "Logout failed",
          },
          "*"
        );
      }
    }
  });

  /**
   * MetaMask 이벤트 리스너 설정
   */
  function setupEthereumEventListeners() {
    if (!window.ethereum) {
      return;
    }

    // 계정 변경 이벤트 (연결/해제 감지)
    window.ethereum.on("accountsChanged", (accounts) => {
      log.info("Accounts changed", { accounts });
      window.postMessage(
        {
          source: MESSAGE_SOURCE.ACCOUNTS_CHANGED,
          accounts: accounts || [],
        },
        "*"
      );
    });

    // 체인 변경 이벤트
    window.ethereum.on("chainChanged", (chainId) => {
      log.info("Chain changed", { chainId });
      window.postMessage(
        {
          source: MESSAGE_SOURCE.CHAIN_CHANGED,
          chainId: chainId,
        },
        "*"
      );
    });

    // 연결 이벤트 (EIP-1193)
    if (window.ethereum.on) {
      window.ethereum.on("connect", (connectInfo) => {
        log.info("Provider connected", { chainId: connectInfo.chainId });
      });

      window.ethereum.on("disconnect", (error) => {
        log.warn("Provider disconnected", error);
        // 연결 해제 시 계정도 비워짐
        window.postMessage(
          {
            source: MESSAGE_SOURCE.ACCOUNTS_CHANGED,
            accounts: [],
          },
          "*"
        );
      });
    }
  }

  // MetaMask 이벤트 리스너 설정
  if (window.ethereum) {
    setupEthereumEventListeners();
  } else {
    // MetaMask가 나중에 로드될 수 있으므로 대기
    const checkEthereum = setInterval(() => {
      if (window.ethereum) {
        clearInterval(checkEthereum);
        setupEthereumEventListeners();
      }
    }, 1000);

    // 10초 후 포기
    setTimeout(() => {
      clearInterval(checkEthereum);
    }, 10000);
  }

  /**
   * SPA 네비게이션 감지
   * history.pushState와 replaceState를 가로채서 Content Script에 알림
   */
  function setupSpaNavigationDetection() {
    let lastUrl = window.location.href;

    // URL 변경 알림 함수 (캐시 미사용 - 항상 __next_f에서 직접 추출)
    const notifyUrlChange = (newUrl, type) => {
      if (newUrl === lastUrl) {
        return;
      }

      log.info(`🔄 SPA Navigation detected (${type})`, {
        from: lastUrl,
        to: newUrl,
      });

      lastUrl = newUrl;

      // 프로필 페이지인지 확인
      const profileMatch = newUrl.match(/\/profile\/([^\/]+)\/([^\/]+)/);

      // Content Script에 URL 변경 알림 (토큰 정보 없이 먼저 전송)
      window.postMessage(
        {
          source: MESSAGE_SOURCE.SPA_NAVIGATION,
          data: {
            url: newUrl,
            type: type,
            timestamp: Date.now(),
          },
          cachedToken: null, // 캐시 미사용
        },
        "*"
      );

      // 프로필 페이지면 토큰 정보 추출 후 전송
      if (profileMatch) {
        let tokenFound = false;

        const sendTokenInfo = (tokenInfo, source) => {
          if (tokenFound) return; // 이미 찾았으면 무시
          tokenFound = true;

          log.info(`토큰 정보 추출 성공 (${source})`, tokenInfo);
          window.postMessage(
            {
              source: MESSAGE_SOURCE.TOKEN_CONTRACT_CACHED,
              data: tokenInfo,
            },
            "*"
          );
        };

        // 방법 1: fetch로 HTML 가져와서 추출 (가장 신뢰성 높음 - SPA 네비게이션에서 DOM이 아직 업데이트 안됨)
        fetchTokenFromProfile().then((tokenInfo) => {
          if (tokenInfo) {
            sendTokenInfo(tokenInfo, "fetch");
          }
        });

        // 방법 2: DOM 폴링 (fetch 실패 대비 백업)
        const tryExtractToken = (attempt = 1) => {
          if (tokenFound) return;

          const tokenInfo = extractTokenFromNextF();

          if (tokenInfo) {
            sendTokenInfo(tokenInfo, `DOM polling 시도 ${attempt}`);
          } else if (attempt < 20) {
            // 최대 20회 재시도 (300ms 간격, 총 약 6초)
            setTimeout(() => tryExtractToken(attempt + 1), 300);
          } else {
            if (!tokenFound) {
              log.warn("토큰 정보 추출 실패 (DOM polling 최대 재시도 초과)");
            }
          }
        };

        // DOM 폴링은 약간의 딜레이 후 시작 (fetch에 우선권 부여)
        setTimeout(() => tryExtractToken(1), 500);
      }
    };

    // history.pushState 가로채기
    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      // pushState 후 약간의 딜레이를 주고 URL 확인
      setTimeout(() => {
        notifyUrlChange(window.location.href, "pushState");
      }, 0);
      return result;
    };

    // history.replaceState 가로채기
    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      setTimeout(() => {
        notifyUrlChange(window.location.href, "replaceState");
      }, 0);
      return result;
    };

    // popstate 이벤트 (브라우저 뒤로/앞으로 버튼)
    window.addEventListener("popstate", () => {
      setTimeout(() => {
        notifyUrlChange(window.location.href, "popstate");
      }, 0);
    });

    log.info("✅ SPA navigation detection 설정 완료");
  }

  // SPA 네비게이션 감지 설정
  setupSpaNavigationDetection();

  // 초기 페이지 로드 시 토큰 추출 시도 (프로필 페이지인 경우)
  const currentUrl = window.location.href;
  const isProfilePage = /\/profile\/([^\/]+)\/([^\/]+)/.test(currentUrl);

  if (isProfilePage) {
    // 초기 페이지 로드 시 __next_f에서 토큰 추출
    const tryInitialExtract = (attempt = 1) => {
      const tokenInfo = extractTokenFromNextF();

      if (tokenInfo) {
        log.info(
          `초기 로드: __next_f에서 토큰 정보 추출 성공 (시도 ${attempt})`,
          tokenInfo
        );
        // INJECTED_SCRIPT_READY와 함께 토큰 정보 전송
        window.postMessage(
          {
            source: MESSAGE_SOURCE.INJECTED_SCRIPT_READY,
            cachedToken: tokenInfo,
          },
          "*"
        );
      } else if (attempt < 10) {
        // 초기 로드는 더 많이 재시도 (최대 10회, 100ms 간격)
        log.info(`초기 로드: 토큰 정보 없음, 재시도 예약 (시도 ${attempt})`);
        setTimeout(() => tryInitialExtract(attempt + 1), 100);
      } else {
        log.warn("초기 로드: 토큰 정보 추출 실패 (최대 재시도 초과)");
        // 토큰 없이라도 준비 완료 메시지 전송
        window.postMessage(
          {
            source: MESSAGE_SOURCE.INJECTED_SCRIPT_READY,
            cachedToken: null,
          },
          "*"
        );
      }
    };

    // DOM이 준비된 후 시작
    if (document.readyState === "complete") {
      setTimeout(() => tryInitialExtract(1), 50);
    } else {
      window.addEventListener("load", () => {
        setTimeout(() => tryInitialExtract(1), 50);
      });
    }
  } else {
    // 프로필 페이지가 아니면 바로 준비 완료 메시지 전송
    window.postMessage(
      {
        source: MESSAGE_SOURCE.INJECTED_SCRIPT_READY,
        cachedToken: null,
      },
      "*"
    );
  }

  log.info("Injected script ready");
})();
