var background = (function() {
  "use strict";
  const browser$2 = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
  const browser = browser$2;
  const browser$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    browser
  }, Symbol.toStringTag, { value: "Module" }));
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  const API_BASE_URL = "http://localhost:3000";
  async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultHeaders = {
      "Content-Type": "application/json"
    };
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "알 수 없는 오류가 발생했습니다." }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("네트워크 오류가 발생했습니다.");
    }
  }
  async function openSidePanel(tabId) {
    try {
      const targetTabId = tabId ?? (await browser.tabs.query({ active: true, currentWindow: true }))[0]?.id ?? 0;
      if (targetTabId === 0) {
        throw new Error("탭 ID를 찾을 수 없습니다.");
      }
      await browser.sidePanel.open({
        tabId: targetTabId
      });
      await browser.sidePanel.setOptions({
        tabId: targetTabId,
        path: "sidepanel.html",
        enabled: true
      });
    } catch (error) {
      console.error("❌ 사이드 패널 열기 오류:", error);
      throw error;
    }
  }
  function createMessageHandler() {
    return (message, sender, sendResponse) => {
      (async () => {
        try {
          let result2;
          switch (message.type) {
            case "GET_COMMENTS": {
              console.log("📥 GET_COMMENTS 요청:", message.gameAddress);
              const response = await apiCall(
                `/api/comments/${encodeURIComponent(message.gameAddress)}`
              );
              result2 = { success: true, data: response.comments || [] };
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
            case "DELETE_COMMENT": {
              console.log("🗑️ DELETE_COMMENT 요청:", message.commentId);
              await apiCall(`/api/comments/${encodeURIComponent(message.commentId)}`, {
                method: "DELETE"
              });
              result2 = { success: true, data: void 0 };
              break;
            }
            case "HEALTH_CHECK": {
              console.log("💓 HEALTH_CHECK 요청");
              const response = await apiCall("/health");
              result2 = { success: true, data: response };
              break;
            }
            case "OPEN_SIDE_PANEL": {
              console.log("📂 OPEN_SIDE_PANEL 요청");
              try {
                await openSidePanel(sender.tab?.id ?? 0);
                result2 = { success: true, data: void 0 };
              } catch (error) {
                console.error("❌ 사이드 패널 열기 오류:", error);
                result2 = {
                  success: false,
                  error: error instanceof Error ? error.message : "사이드 패널 열기 실패"
                };
              }
              break;
            }
            case "GET_STORAGE": {
              console.log("💾 GET_STORAGE 요청:", message);
              try {
                const { browser: browser2 } = await Promise.resolve().then(() => browser$1);
                const storage = browser2?.storage || globalThis.chrome?.storage;
                const area = message.area || "session";
                const storageArea = area === "local" ? storage.local : storage.session;
                const data = await new Promise((resolve, reject) => {
                  storageArea.get([message.key], (result22) => {
                    const runtime = browser2?.runtime || globalThis.chrome?.runtime;
                    if (runtime?.lastError) {
                      reject(new Error(runtime.lastError.message));
                      return;
                    }
                    resolve(result22[message.key] || null);
                  });
                });
                result2 = { success: true, data };
              } catch (error) {
                console.error("❌ Storage 읽기 오류:", error);
                result2 = {
                  success: false,
                  error: error instanceof Error ? error.message : "Storage 읽기 실패"
                };
              }
              break;
            }
            case "SET_STORAGE": {
              console.log("💾 SET_STORAGE 요청:", message);
              try {
                const { browser: browser2 } = await Promise.resolve().then(() => browser$1);
                const storage = browser2?.storage || globalThis.chrome?.storage;
                const area = message.area || "session";
                const storageArea = area === "local" ? storage.local : storage.session;
                await new Promise((resolve, reject) => {
                  storageArea.set(
                    { [message.key]: message.value },
                    () => {
                      const runtime = browser2?.runtime || globalThis.chrome?.runtime;
                      if (runtime?.lastError) {
                        reject(new Error(runtime.lastError.message));
                        return;
                      }
                      resolve();
                    }
                  );
                });
                result2 = { success: true, data: void 0 };
              } catch (error) {
                console.error("❌ Storage 저장 오류:", error);
                result2 = {
                  success: false,
                  error: error instanceof Error ? error.message : "Storage 저장 실패"
                };
              }
              break;
            }
            case "GET_GAME_BY_TOKEN": {
              console.log("🎮 GET_GAME_BY_TOKEN 요청:", message.tokenAddress);
              try {
                const response = await apiCall(
                  `/v1/games/by-token/${encodeURIComponent(message.tokenAddress)}`
                );
                result2 = { success: true, data: response };
              } catch (error) {
                if (error.message?.includes("404")) {
                  result2 = { success: true, data: null };
                } else {
                  console.error("❌ 게임 조회 오류:", error);
                  result2 = {
                    success: false,
                    error: error instanceof Error ? error.message : "게임 조회 실패"
                  };
                }
              }
              break;
            }
            default:
              result2 = {
                success: false,
                error: "알 수 없는 메시지 타입입니다."
              };
          }
          try {
            sendResponse(result2);
          } catch (sendError) {
            console.error("❌ 응답 전송 실패:", sendError);
          }
        } catch (error) {
          console.error("❌ Background API 오류:", error);
          try {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
            });
          } catch (sendError) {
            console.error("❌ 에러 응답 전송 실패:", sendError);
          }
        }
      })();
      return true;
    };
  }
  const definition = defineBackground(() => {
    const runtime = browser?.runtime || globalThis.chrome?.runtime;
    browser.action?.onClicked.addListener(async (tab) => {
      await openSidePanel(tab?.id);
    });
    runtime.onMessage.addListener(createMessageHandler());
  });
  function initPlugins() {
  }
  var _MatchPattern = class {
    constructor(matchPattern) {
      if (matchPattern === "<all_urls>") {
        this.isAllUrls = true;
        this.protocolMatches = [..._MatchPattern.PROTOCOLS];
        this.hostnameMatch = "*";
        this.pathnameMatch = "*";
      } else {
        const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
        if (groups == null)
          throw new InvalidMatchPattern(matchPattern, "Incorrect format");
        const [_, protocol, hostname, pathname] = groups;
        validateProtocol(matchPattern, protocol);
        validateHostname(matchPattern, hostname);
        this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
        this.hostnameMatch = hostname;
        this.pathnameMatch = pathname;
      }
    }
    includes(url) {
      if (this.isAllUrls)
        return true;
      const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
      return !!this.protocolMatches.find((protocol) => {
        if (protocol === "http")
          return this.isHttpMatch(u);
        if (protocol === "https")
          return this.isHttpsMatch(u);
        if (protocol === "file")
          return this.isFileMatch(u);
        if (protocol === "ftp")
          return this.isFtpMatch(u);
        if (protocol === "urn")
          return this.isUrnMatch(u);
      });
    }
    isHttpMatch(url) {
      return url.protocol === "http:" && this.isHostPathMatch(url);
    }
    isHttpsMatch(url) {
      return url.protocol === "https:" && this.isHostPathMatch(url);
    }
    isHostPathMatch(url) {
      if (!this.hostnameMatch || !this.pathnameMatch)
        return false;
      const hostnameMatchRegexs = [
        this.convertPatternToRegex(this.hostnameMatch),
        this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))
      ];
      const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
      return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
    }
    isFileMatch(url) {
      throw Error("Not implemented: file:// pattern matching. Open a PR to add support");
    }
    isFtpMatch(url) {
      throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
    }
    isUrnMatch(url) {
      throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
    }
    convertPatternToRegex(pattern) {
      const escaped = this.escapeForRegex(pattern);
      const starsReplaced = escaped.replace(/\\\*/g, ".*");
      return RegExp(`^${starsReplaced}$`);
    }
    escapeForRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  };
  var MatchPattern = _MatchPattern;
  MatchPattern.PROTOCOLS = ["http", "https", "file", "ftp", "urn"];
  var InvalidMatchPattern = class extends Error {
    constructor(matchPattern, reason) {
      super(`Invalid match pattern "${matchPattern}": ${reason}`);
    }
  };
  function validateProtocol(matchPattern, protocol) {
    if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*")
      throw new InvalidMatchPattern(
        matchPattern,
        `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`
      );
  }
  function validateHostname(matchPattern, hostname) {
    if (hostname.includes(":"))
      throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
    if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*."))
      throw new InvalidMatchPattern(
        matchPattern,
        `If using a wildcard (*), it must go at the start of the hostname`
      );
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  let ws;
  function getDevServerWebSocket() {
    if (ws == null) {
      const serverUrl = "ws://localhost:3001";
      logger.debug("Connecting to dev server @", serverUrl);
      ws = new WebSocket(serverUrl, "vite-hmr");
      ws.addWxtEventListener = ws.addEventListener.bind(ws);
      ws.sendCustom = (event, payload) => ws?.send(JSON.stringify({ type: "custom", event, payload }));
      ws.addEventListener("open", () => {
        logger.debug("Connected to dev server");
      });
      ws.addEventListener("close", () => {
        logger.debug("Disconnected from dev server");
      });
      ws.addEventListener("error", (event) => {
        logger.error("Failed to connect to dev server", event);
      });
      ws.addEventListener("message", (e) => {
        try {
          const message = JSON.parse(e.data);
          if (message.type === "custom") {
            ws?.dispatchEvent(
              new CustomEvent(message.event, { detail: message.data })
            );
          }
        } catch (err) {
          logger.error("Failed to handle message", err);
        }
      });
    }
    return ws;
  }
  function keepServiceWorkerAlive() {
    setInterval(async () => {
      await browser.runtime.getPlatformInfo();
    }, 5e3);
  }
  function reloadContentScript(payload) {
    const manifest = browser.runtime.getManifest();
    if (manifest.manifest_version == 2) {
      void reloadContentScriptMv2();
    } else {
      void reloadContentScriptMv3(payload);
    }
  }
  async function reloadContentScriptMv3({
    registration,
    contentScript
  }) {
    if (registration === "runtime") {
      await reloadRuntimeContentScriptMv3(contentScript);
    } else {
      await reloadManifestContentScriptMv3(contentScript);
    }
  }
  async function reloadManifestContentScriptMv3(contentScript) {
    const id = `wxt:${contentScript.js[0]}`;
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const existing = registered.find((cs) => cs.id === id);
    if (existing) {
      logger.debug("Updating content script", existing);
      await browser.scripting.updateContentScripts([
        {
          ...contentScript,
          id,
          css: contentScript.css ?? []
        }
      ]);
    } else {
      logger.debug("Registering new content script...");
      await browser.scripting.registerContentScripts([
        {
          ...contentScript,
          id,
          css: contentScript.css ?? []
        }
      ]);
    }
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadRuntimeContentScriptMv3(contentScript) {
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const matches = registered.filter((cs) => {
      const hasJs = contentScript.js?.find((js) => cs.js?.includes(js));
      const hasCss = contentScript.css?.find((css) => cs.css?.includes(css));
      return hasJs || hasCss;
    });
    if (matches.length === 0) {
      logger.log(
        "Content script is not registered yet, nothing to reload",
        contentScript
      );
      return;
    }
    await browser.scripting.updateContentScripts(matches);
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadTabsForContentScript(contentScript) {
    const allTabs = await browser.tabs.query({});
    const matchPatterns = contentScript.matches.map(
      (match) => new MatchPattern(match)
    );
    const matchingTabs = allTabs.filter((tab) => {
      const url = tab.url;
      if (!url) return false;
      return !!matchPatterns.find((pattern) => pattern.includes(url));
    });
    await Promise.all(
      matchingTabs.map(async (tab) => {
        try {
          await browser.tabs.reload(tab.id);
        } catch (err) {
          logger.warn("Failed to reload tab:", err);
        }
      })
    );
  }
  async function reloadContentScriptMv2(_payload) {
    throw Error("TODO: reloadContentScriptMv2");
  }
  {
    try {
      const ws2 = getDevServerWebSocket();
      ws2.addWxtEventListener("wxt:reload-extension", () => {
        browser.runtime.reload();
      });
      ws2.addWxtEventListener("wxt:reload-content-script", (event) => {
        reloadContentScript(event.detail);
      });
      if (true) {
        ws2.addEventListener(
          "open",
          () => ws2.sendCustom("wxt:background-initialized")
        );
        keepServiceWorkerAlive();
      }
    } catch (err) {
      logger.error("Failed to setup web socket connection with dev server", err);
    }
    browser.commands.onCommand.addListener((command) => {
      if (command === "wxt:reload-extension") {
        browser.runtime.reload();
      }
    });
  }
  let result;
  try {
    initPlugins();
    result = definition.main();
    if (result instanceof Promise) {
      console.warn(
        "The background's main() function return a promise, but it must be synchronous"
      );
    }
  } catch (err) {
    logger.error("The background crashed on startup!");
    throw err;
  }
  const result$1 = result;
  return result$1;
})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B3eHQtZGV2L2Jyb3dzZXIvc3JjL2luZGV4Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9icm93c2VyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9kZWZpbmUtYmFja2dyb3VuZC5tanMiLCIuLi8uLi9zcmMvYmFja2dyb3VuZC9jb25maWcudHMiLCIuLi8uLi9zcmMvYmFja2dyb3VuZC9hcGkudHMiLCIuLi8uLi9zcmMvYmFja2dyb3VuZC9zaWRlcGFuZWwudHMiLCIuLi8uLi9zcmMvYmFja2dyb3VuZC9tZXNzYWdlSGFuZGxlci50cyIsIi4uLy4uL2VudHJ5cG9pbnRzL2JhY2tncm91bmQudHMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQHdlYmV4dC1jb3JlL21hdGNoLXBhdHRlcm5zL2xpYi9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcbiAgaWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG4gIHJldHVybiBhcmc7XG59XG4iLCIvLyDshJzrsoQgQVBJIOq4sOuzuCBVUkwgKE5lc3RKUyDrsLHsl5Trk5wg7Y+s7Yq4OiAzMDAwKVxuZXhwb3J0IGNvbnN0IEFQSV9CQVNFX1VSTCA9IGltcG9ydC5tZXRhLmVudi5WSVRFX0FQSV9VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCc7XG5cbiIsImltcG9ydCB7IEFQSV9CQVNFX1VSTCB9IGZyb20gJy4vY29uZmlnJztcblxuLy8gQVBJIO2YuOy2nCDtlajsiJggKEJhY2tncm91bmQgU2NyaXB07JeQ7IScIOyLpO2WiSlcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcGlDYWxsPFQ+KFxuICAgIGVuZHBvaW50OiBzdHJpbmcsXG4gICAgb3B0aW9uczogUmVxdWVzdEluaXQgPSB7fVxuKTogUHJvbWlzZTxUPiB7XG4gICAgY29uc3QgdXJsID0gYCR7QVBJX0JBU0VfVVJMfSR7ZW5kcG9pbnR9YDtcblxuICAgIGNvbnN0IGRlZmF1bHRIZWFkZXJzID0ge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgIH07XG5cbiAgICB0cnkge1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAuLi5kZWZhdWx0SGVhZGVycyxcbiAgICAgICAgICAgICAgICAuLi5vcHRpb25zLmhlYWRlcnMsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJvckRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCkuY2F0Y2goKCkgPT4gKHsgZXJyb3I6ICfslYwg7IiYIOyXhuuKlCDsmKTrpZjqsIAg67Cc7IOd7ZaI7Iq164uI64ukLicgfSkpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yRGF0YS5lcnJvciB8fCBgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c306ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBFcnJvcign64Sk7Yq47JuM7YGsIOyYpOulmOqwgCDrsJzsg53tlojsirXri4jri6QuJyk7XG4gICAgfVxufVxuXG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSAnd3h0L2Jyb3dzZXInO1xuXG4vLyDsgqzsnbTrk5wg7Yyo64SQIOyXtOq4sFxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG9wZW5TaWRlUGFuZWwodGFiSWQ/OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgICAvLyB0YWJJZOqwgCDsoJzqs7XrkJjsp4Ag7JWK7Jy866m0IO2YhOyerCDtmZzshLEg7YOtIOyCrOyaqVxuICAgICAgICBjb25zdCB0YXJnZXRUYWJJZCA9IHRhYklkID8/IChhd2FpdCBicm93c2VyLnRhYnMucXVlcnkoeyBhY3RpdmU6IHRydWUsIGN1cnJlbnRXaW5kb3c6IHRydWUgfSkpWzBdPy5pZCA/PyAwO1xuXG4gICAgICAgIGlmICh0YXJnZXRUYWJJZCA9PT0gMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCftg60gSUTrpbwg7LC+7J2EIOyImCDsl4bsirXri4jri6QuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCBicm93c2VyLnNpZGVQYW5lbC5vcGVuKHtcbiAgICAgICAgICAgIHRhYklkOiB0YXJnZXRUYWJJZCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgYXdhaXQgYnJvd3Nlci5zaWRlUGFuZWwuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICB0YWJJZDogdGFyZ2V0VGFiSWQsXG4gICAgICAgICAgICBwYXRoOiAnc2lkZXBhbmVsLmh0bWwnLFxuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcign4p2MIOyCrOydtOuTnCDtjKjrhJAg7Je06riwIOyYpOulmDonLCBlcnJvcik7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbn1cblxuIiwiaW1wb3J0IHsgQmFja2dyb3VuZE1lc3NhZ2UsIEJhY2tncm91bmRSZXNwb25zZSB9IGZyb20gJy4uL2NvbnRlbnRzL2xpYi9iYWNrZ3JvdW5kQXBpJztcbmltcG9ydCB7IGFwaUNhbGwgfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQgeyBvcGVuU2lkZVBhbmVsIH0gZnJvbSAnLi9zaWRlcGFuZWwnO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTWVzc2FnZUhhbmRsZXIoKSB7XG4gICAgcmV0dXJuIChcbiAgICAgICAgbWVzc2FnZTogQmFja2dyb3VuZE1lc3NhZ2UsXG4gICAgICAgIHNlbmRlcjogYW55LFxuICAgICAgICBzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogQmFja2dyb3VuZFJlc3BvbnNlKSA9PiB2b2lkXG4gICAgKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIC8vIOu5hOuPmeq4sCDsnZHri7Ug7LKY66asXG4gICAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxldCByZXN1bHQ6IEJhY2tncm91bmRSZXNwb25zZTtcblxuICAgICAgICAgICAgICAgIHN3aXRjaCAobWVzc2FnZS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0dFVF9DT01NRU5UUyc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OlIEdFVF9DT01NRU5UUyDsmpTssq06JywgbWVzc2FnZS5nYW1lQWRkcmVzcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGFwaUNhbGw8eyBjb21tZW50czogYW55W10gfT4oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYC9hcGkvY29tbWVudHMvJHtlbmNvZGVVUklDb21wb25lbnQobWVzc2FnZS5nYW1lQWRkcmVzcyl9YFxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzcG9uc2UuY29tbWVudHMgfHwgW10gfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTk9URTogQ1JFQVRFX0NPTU1FTlTripQg642UIOydtOyDgSDsgqzsmqntlZjsp4Ag7JWK7J2MIC0g7ZSE66Gg7Yq47JeU65Oc7JeQ7IScIOyngeygkSDsiqTrp4jtirgg7Luo7Yq4656Z7Yq4IO2YuOy2nFxuICAgICAgICAgICAgICAgICAgICAvLyBjYXNlICdDUkVBVEVfQ09NTUVOVCc6IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKCfwn5OdIENSRUFURV9DT01NRU5UIOyalOyyrTonLCBtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYXBpQ2FsbDx7IGNvbW1lbnQ6IGFueSB9PignL2FwaS9jb21tZW50cycsIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgIGNoYWxsZW5nZV9pZDogbWVzc2FnZS5jaGFsbGVuZ2VJZCxcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgcGxheWVyX2FkZHJlc3M6IG1lc3NhZ2UucGxheWVyQWRkcmVzcyxcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgY29udGVudDogbWVzc2FnZS5jb250ZW50LFxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICBzaWduYXR1cmU6IChtZXNzYWdlIGFzIGFueSkuc2lnbmF0dXJlLFxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICBtZXNzYWdlOiAobWVzc2FnZSBhcyBhbnkpLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIHJlc3VsdCA9IHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzcG9uc2UuY29tbWVudCB9O1xuICAgICAgICAgICAgICAgICAgICAvLyAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIC8vIH1cblxuICAgICAgICAgICAgICAgICAgICBjYXNlICdERUxFVEVfQ09NTUVOVCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5eR77iPIERFTEVURV9DT01NRU5UIOyalOyyrTonLCBtZXNzYWdlLmNvbW1lbnRJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBhcGlDYWxsKGAvYXBpL2NvbW1lbnRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG1lc3NhZ2UuY29tbWVudElkKX1gLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB1bmRlZmluZWQgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnSEVBTFRIX0NIRUNLJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/CfkpMgSEVBTFRIX0NIRUNLIOyalOyyrScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBhcGlDYWxsPHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXM6IHN0cmluZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IHN0cmluZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdXBhYmFzZTogc3RyaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfT4oJy9oZWFsdGgnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzcG9uc2UgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgICAgICAgICBjYXNlICdPUEVOX1NJREVfUEFORUwnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TgiBPUEVOX1NJREVfUEFORUwg7JqU7LKtJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IG9wZW5TaWRlUGFuZWwoc2VuZGVyLnRhYj8uaWQgPz8gMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB1bmRlZmluZWQgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwg7IKs7J2065OcIO2MqOuEkCDsl7TquLAg7Jik66WYOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAn7IKs7J2065OcIO2MqOuEkCDsl7TquLAg7Iuk7YyoJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjYXNlICdHRVRfU1RPUkFHRSc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5K+IEdFVF9TVE9SQUdFIOyalOyyrTonLCBtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBicm93c2VyIH0gPSBhd2FpdCBpbXBvcnQoJ3d4dC9icm93c2VyJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RvcmFnZSA9IGJyb3dzZXI/LnN0b3JhZ2UgfHwgKGdsb2JhbFRoaXMgYXMgYW55KS5jaHJvbWU/LnN0b3JhZ2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXJlYSA9IChtZXNzYWdlIGFzIGFueSkuYXJlYSB8fCAnc2Vzc2lvbic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RvcmFnZUFyZWEgPSBhcmVhID09PSAnbG9jYWwnID8gc3RvcmFnZS5sb2NhbCA6IHN0b3JhZ2Uuc2Vzc2lvbjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBuZXcgUHJvbWlzZTxhbnk+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmFnZUFyZWEuZ2V0KFsobWVzc2FnZSBhcyBhbnkpLmtleV0sIChyZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcnVudGltZSA9IGJyb3dzZXI/LnJ1bnRpbWUgfHwgKGdsb2JhbFRoaXMgYXMgYW55KS5jaHJvbWU/LnJ1bnRpbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocnVudGltZT8ubGFzdEVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHRbKG1lc3NhZ2UgYXMgYW55KS5rZXldIHx8IG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHsgc3VjY2VzczogdHJ1ZSwgZGF0YSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBTdG9yYWdlIOydveq4sCDsmKTrpZg6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdTdG9yYWdlIOydveq4sCDsi6TtjKgnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ1NFVF9TVE9SQUdFJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfkr4gU0VUX1NUT1JBR0Ug7JqU7LKtOicsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGJyb3dzZXIgfSA9IGF3YWl0IGltcG9ydCgnd3h0L2Jyb3dzZXInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdG9yYWdlID0gYnJvd3Nlcj8uc3RvcmFnZSB8fCAoZ2xvYmFsVGhpcyBhcyBhbnkpLmNocm9tZT8uc3RvcmFnZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhcmVhID0gKG1lc3NhZ2UgYXMgYW55KS5hcmVhIHx8ICdzZXNzaW9uJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdG9yYWdlQXJlYSA9IGFyZWEgPT09ICdsb2NhbCcgPyBzdG9yYWdlLmxvY2FsIDogc3RvcmFnZS5zZXNzaW9uO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yYWdlQXJlYS5zZXQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IFsobWVzc2FnZSBhcyBhbnkpLmtleV06IChtZXNzYWdlIGFzIGFueSkudmFsdWUgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBydW50aW1lID0gYnJvd3Nlcj8ucnVudGltZSB8fCAoZ2xvYmFsVGhpcyBhcyBhbnkpLmNocm9tZT8ucnVudGltZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocnVudGltZT8ubGFzdEVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IocnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogdW5kZWZpbmVkIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIFN0b3JhZ2Ug7KCA7J6lIOyYpOulmDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1N0b3JhZ2Ug7KCA7J6lIOyLpO2MqCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnR0VUX0dBTUVfQllfVE9LRU4nOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+OriBHRVRfR0FNRV9CWV9UT0tFTiDsmpTssq06JywgbWVzc2FnZS50b2tlbkFkZHJlc3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGFwaUNhbGw8YW55PihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYC92MS9nYW1lcy9ieS10b2tlbi8ke2VuY29kZVVSSUNvbXBvbmVudChtZXNzYWdlLnRva2VuQWRkcmVzcyl9YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiByZXNwb25zZSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDQwNOuKlCDqsozsnoTsnbQg7JeG64qUIOygleyDgSDsvIDsnbTsiqRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IubWVzc2FnZT8uaW5jbHVkZXMoJzQwNCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogbnVsbCB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCDqsozsnoQg7KGw7ZqMIOyYpOulmDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ+qyjOyehCDsobDtmowg7Iuk7YyoJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICfslYwg7IiYIOyXhuuKlCDrqZTsi5zsp4Ag7YOA7J6F7J6F64uI64ukLicsXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIOydkeuLtSDsoITshqFcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChzZW5kRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIOydkeuLtSDsoITshqEg7Iuk7YyoOicsIHNlbmRFcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBCYWNrZ3JvdW5kIEFQSSDsmKTrpZg6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICfslYwg7IiYIOyXhuuKlCDsmKTrpZjqsIAg67Cc7IOd7ZaI7Iq164uI64ukLicsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHNlbmRFcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwg7JeQ65+sIOydkeuLtSDsoITshqEg7Iuk7YyoOicsIHNlbmRFcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIC8vIOu5hOuPmeq4sCDsnZHri7XsnYQg7JyE7ZW0IHRydWUg67CY7ZmYXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG59XG5cbiIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tICd3eHQvYnJvd3Nlcic7XG5pbXBvcnQgeyBkZWZpbmVCYWNrZ3JvdW5kIH0gZnJvbSAnd3h0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kJztcbmltcG9ydCB7IGNyZWF0ZU1lc3NhZ2VIYW5kbGVyIH0gZnJvbSAnLi4vc3JjL2JhY2tncm91bmQvbWVzc2FnZUhhbmRsZXInO1xuaW1wb3J0IHsgb3BlblNpZGVQYW5lbCB9IGZyb20gJy4uL3NyYy9iYWNrZ3JvdW5kL3NpZGVwYW5lbCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUJhY2tncm91bmQoKCkgPT4ge1xuICAgIGNvbnN0IHJ1bnRpbWUgPSBicm93c2VyPy5ydW50aW1lIHx8IChnbG9iYWxUaGlzIGFzIGFueSkuY2hyb21lPy5ydW50aW1lO1xuXG4gICAgYnJvd3Nlci5hY3Rpb24/Lm9uQ2xpY2tlZC5hZGRMaXN0ZW5lcihhc3luYyAodGFiKSA9PiB7XG4gICAgICAgIGF3YWl0IG9wZW5TaWRlUGFuZWwodGFiPy5pZCk7XG4gICAgfSk7XG5cbiAgICAvLyBCYWNrZ3JvdW5kIFNjcmlwdCDrqZTsi5zsp4Ag7ZW465Ok65+sXG4gICAgcnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoY3JlYXRlTWVzc2FnZUhhbmRsZXIoKSk7XG59KTtcbiIsIi8vIHNyYy9pbmRleC50c1xudmFyIF9NYXRjaFBhdHRlcm4gPSBjbGFzcyB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybikge1xuICAgIGlmIChtYXRjaFBhdHRlcm4gPT09IFwiPGFsbF91cmxzPlwiKSB7XG4gICAgICB0aGlzLmlzQWxsVXJscyA9IHRydWU7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IFsuLi5fTWF0Y2hQYXR0ZXJuLlBST1RPQ09MU107XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBncm91cHMgPSAvKC4qKTpcXC9cXC8oLio/KShcXC8uKikvLmV4ZWMobWF0Y2hQYXR0ZXJuKTtcbiAgICAgIGlmIChncm91cHMgPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBcIkluY29ycmVjdCBmb3JtYXRcIik7XG4gICAgICBjb25zdCBbXywgcHJvdG9jb2wsIGhvc3RuYW1lLCBwYXRobmFtZV0gPSBncm91cHM7XG4gICAgICB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpO1xuICAgICAgdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKTtcbiAgICAgIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSk7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IHByb3RvY29sID09PSBcIipcIiA/IFtcImh0dHBcIiwgXCJodHRwc1wiXSA6IFtwcm90b2NvbF07XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBob3N0bmFtZTtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IHBhdGhuYW1lO1xuICAgIH1cbiAgfVxuICBpbmNsdWRlcyh1cmwpIHtcbiAgICBpZiAodGhpcy5pc0FsbFVybHMpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCB1ID0gdHlwZW9mIHVybCA9PT0gXCJzdHJpbmdcIiA/IG5ldyBVUkwodXJsKSA6IHVybCBpbnN0YW5jZW9mIExvY2F0aW9uID8gbmV3IFVSTCh1cmwuaHJlZikgOiB1cmw7XG4gICAgcmV0dXJuICEhdGhpcy5wcm90b2NvbE1hdGNoZXMuZmluZCgocHJvdG9jb2wpID0+IHtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBzXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cHNNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmaWxlXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRmlsZU1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZ0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0Z0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcInVyblwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc1Vybk1hdGNoKHUpO1xuICAgIH0pO1xuICB9XG4gIGlzSHR0cE1hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cDpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSHR0cHNNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHBzOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIb3N0UGF0aE1hdGNoKHVybCkge1xuICAgIGlmICghdGhpcy5ob3N0bmFtZU1hdGNoIHx8ICF0aGlzLnBhdGhuYW1lTWF0Y2gpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgaG9zdG5hbWVNYXRjaFJlZ2V4cyA9IFtcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaCksXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gucmVwbGFjZSgvXlxcKlxcLi8sIFwiXCIpKVxuICAgIF07XG4gICAgY29uc3QgcGF0aG5hbWVNYXRjaFJlZ2V4ID0gdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5wYXRobmFtZU1hdGNoKTtcbiAgICByZXR1cm4gISFob3N0bmFtZU1hdGNoUmVnZXhzLmZpbmQoKHJlZ2V4KSA9PiByZWdleC50ZXN0KHVybC5ob3N0bmFtZSkpICYmIHBhdGhuYW1lTWF0Y2hSZWdleC50ZXN0KHVybC5wYXRobmFtZSk7XG4gIH1cbiAgaXNGaWxlTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZpbGU6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzRnRwTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZ0cDovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNVcm5NYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogdXJuOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBjb252ZXJ0UGF0dGVyblRvUmVnZXgocGF0dGVybikge1xuICAgIGNvbnN0IGVzY2FwZWQgPSB0aGlzLmVzY2FwZUZvclJlZ2V4KHBhdHRlcm4pO1xuICAgIGNvbnN0IHN0YXJzUmVwbGFjZWQgPSBlc2NhcGVkLnJlcGxhY2UoL1xcXFxcXCovZywgXCIuKlwiKTtcbiAgICByZXR1cm4gUmVnRXhwKGBeJHtzdGFyc1JlcGxhY2VkfSRgKTtcbiAgfVxuICBlc2NhcGVGb3JSZWdleChzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbiAgfVxufTtcbnZhciBNYXRjaFBhdHRlcm4gPSBfTWF0Y2hQYXR0ZXJuO1xuTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUyA9IFtcImh0dHBcIiwgXCJodHRwc1wiLCBcImZpbGVcIiwgXCJmdHBcIiwgXCJ1cm5cIl07XG52YXIgSW52YWxpZE1hdGNoUGF0dGVybiA9IGNsYXNzIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4sIHJlYXNvbikge1xuICAgIHN1cGVyKGBJbnZhbGlkIG1hdGNoIHBhdHRlcm4gXCIke21hdGNoUGF0dGVybn1cIjogJHtyZWFzb259YCk7XG4gIH1cbn07XG5mdW5jdGlvbiB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpIHtcbiAgaWYgKCFNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmluY2x1ZGVzKHByb3RvY29sKSAmJiBwcm90b2NvbCAhPT0gXCIqXCIpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgJHtwcm90b2NvbH0gbm90IGEgdmFsaWQgcHJvdG9jb2wgKCR7TWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5qb2luKFwiLCBcIil9KWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKSB7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIjpcIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBgSG9zdG5hbWUgY2Fubm90IGluY2x1ZGUgYSBwb3J0YCk7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIipcIikgJiYgaG9zdG5hbWUubGVuZ3RoID4gMSAmJiAhaG9zdG5hbWUuc3RhcnRzV2l0aChcIiouXCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYElmIHVzaW5nIGEgd2lsZGNhcmQgKCopLCBpdCBtdXN0IGdvIGF0IHRoZSBzdGFydCBvZiB0aGUgaG9zdG5hbWVgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSkge1xuICByZXR1cm47XG59XG5leHBvcnQge1xuICBJbnZhbGlkTWF0Y2hQYXR0ZXJuLFxuICBNYXRjaFBhdHRlcm5cbn07XG4iXSwibmFtZXMiOlsiYnJvd3NlciIsIl9icm93c2VyIiwicmVzdWx0Il0sIm1hcHBpbmdzIjoiOztBQUNPLFFBQU1BLFlBQVUsV0FBVyxTQUFTLFNBQVMsS0FDaEQsV0FBVyxVQUNYLFdBQVc7QUNGUixRQUFNLFVBQVVDOzs7OztBQ0RoQixXQUFTLGlCQUFpQixLQUFLO0FBQ3BDLFFBQUksT0FBTyxRQUFRLE9BQU8sUUFBUSxXQUFZLFFBQU8sRUFBRSxNQUFNLElBQUc7QUFDaEUsV0FBTztBQUFBLEVBQ1Q7QUNGTyxRQUFNLGVBQStDO0FDRTVELGlCQUFzQixRQUNsQixVQUNBLFVBQXVCLElBQ2I7QUFDVixVQUFNLE1BQU0sR0FBRyxZQUFZLEdBQUcs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QWlCLGNBQWMsVUFBVTtBQUNoRCxRQUFJLENBQUMsYUFBYSxVQUFVLFNBQVMsUUFBUSxLQUFLLGFBQWE7QUFDN0QsWUFBTSxJQUFJO0FBQUEsUUFDUjtBQUFBLFFBQ0EsR0FBRyxRQUFRLDBCQUEwQixhQUFhLFVBQVUsS0FBSyxJQUFJLENBQUM7QUFBQSxNQUM1RTtBQUFBLEVBQ0E7QUFDQSxXQUFTLGlCQUFpQixjQUFjLFVBQVU7QUFDaEQsUUFBSSxTQUFTLFNBQVMsR0FBRztBQUN2QixZQUFNLElBQUksb0JBQW9CLGNBQWMsZ0NBQWdDO0FBQzlFLFFBQUksU0FBUyxTQUFTLEdBQUcsS0FBSyxTQUFTLFNBQVMsS0FBSyxDQUFDLFNBQVMsV0FBVyxJQUFJO0FBQzVFLFlBQU0sSUFBSTtBQUFBLFFBQ1I7QUFBQSxRQUNBO0FBQUEsTUFDTjtBQUFBLEVBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsOF19
