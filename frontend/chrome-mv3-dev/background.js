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
  const API_BASE_URL = "http://localhost:3001";
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
              console.log("📥 GET_COMMENTS 요청:", message.challengeId);
              const response = await apiCall(
                `/api/comments/${encodeURIComponent(message.challengeId)}`
              );
              result2 = { success: true, data: response.comments || [] };
              break;
            }
            case "CREATE_COMMENT": {
              console.log("📝 CREATE_COMMENT 요청:", message);
              const response = await apiCall("/api/comments", {
                method: "POST",
                body: JSON.stringify({
                  challenge_id: message.challengeId,
                  player_address: message.playerAddress,
                  content: message.content,
                  signature: message.signature,
                  message: message.message
                })
              });
              result2 = { success: true, data: response.comment };
              break;
            }
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
      const serverUrl = "ws://localhost:3000";
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL0B3eHQtZGV2L2Jyb3dzZXIvc3JjL2luZGV4Lm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9icm93c2VyLm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9kZWZpbmUtYmFja2dyb3VuZC5tanMiLCIuLi8uLi9zcmMvYmFja2dyb3VuZC9jb25maWcudHMiLCIuLi8uLi9zcmMvYmFja2dyb3VuZC9hcGkudHMiLCIuLi8uLi9zcmMvYmFja2dyb3VuZC9zaWRlcGFuZWwudHMiLCIuLi8uLi9zcmMvYmFja2dyb3VuZC9tZXNzYWdlSGFuZGxlci50cyIsIi4uLy4uL2VudHJ5cG9pbnRzL2JhY2tncm91bmQudHMiLCIuLi8uLi9ub2RlX21vZHVsZXMvQHdlYmV4dC1jb3JlL21hdGNoLXBhdHRlcm5zL2xpYi9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcbiAgaWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG4gIHJldHVybiBhcmc7XG59XG4iLCIvLyDshJzrsoQgQVBJIOq4sOuzuCBVUkxcbmV4cG9ydCBjb25zdCBBUElfQkFTRV9VUkwgPSBpbXBvcnQubWV0YS5lbnYuVklURV9BUElfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjMwMDEnO1xuXG4iLCJpbXBvcnQgeyBBUElfQkFTRV9VUkwgfSBmcm9tICcuL2NvbmZpZyc7XG5cbi8vIEFQSSDtmLjstpwg7ZWo7IiYIChCYWNrZ3JvdW5kIFNjcmlwdOyXkOyEnCDsi6TtlokpXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBpQ2FsbDxUPihcbiAgICBlbmRwb2ludDogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFJlcXVlc3RJbml0ID0ge31cbik6IFByb21pc2U8VD4ge1xuICAgIGNvbnN0IHVybCA9IGAke0FQSV9CQVNFX1VSTH0ke2VuZHBvaW50fWA7XG5cbiAgICBjb25zdCBkZWZhdWx0SGVhZGVycyA9IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICB9O1xuXG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgLi4uZGVmYXVsdEhlYWRlcnMsXG4gICAgICAgICAgICAgICAgLi4ub3B0aW9ucy5oZWFkZXJzLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgICAgY29uc3QgZXJyb3JEYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpLmNhdGNoKCgpID0+ICh7IGVycm9yOiAn7JWMIOyImCDsl4bripQg7Jik66WY6rCAIOuwnOyDne2WiOyKteuLiOuLpC4nIH0pKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvckRhdGEuZXJyb3IgfHwgYEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9OiAke3Jlc3BvbnNlLnN0YXR1c1RleHR9YCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ+uEpO2KuOybjO2BrCDsmKTrpZjqsIAg67Cc7IOd7ZaI7Iq164uI64ukLicpO1xuICAgIH1cbn1cblxuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gJ3d4dC9icm93c2VyJztcblxuLy8g7IKs7J2065OcIO2MqOuEkCDsl7TquLBcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBvcGVuU2lkZVBhbmVsKHRhYklkPzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gdGFiSWTqsIAg7KCc6rO165CY7KeAIOyViuycvOuptCDtmITsnqwg7Zmc7ISxIO2DrSDsgqzsmqlcbiAgICAgICAgY29uc3QgdGFyZ2V0VGFiSWQgPSB0YWJJZCA/PyAoYXdhaXQgYnJvd3Nlci50YWJzLnF1ZXJ5KHsgYWN0aXZlOiB0cnVlLCBjdXJyZW50V2luZG93OiB0cnVlIH0pKVswXT8uaWQgPz8gMDtcblxuICAgICAgICBpZiAodGFyZ2V0VGFiSWQgPT09IDApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcign7YOtIElE66W8IOywvuydhCDsiJgg7JeG7Iq164uI64ukLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgYnJvd3Nlci5zaWRlUGFuZWwub3Blbih7XG4gICAgICAgICAgICB0YWJJZDogdGFyZ2V0VGFiSWQsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGF3YWl0IGJyb3dzZXIuc2lkZVBhbmVsLnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgdGFiSWQ6IHRhcmdldFRhYklkLFxuICAgICAgICAgICAgcGF0aDogJ3NpZGVwYW5lbC5odG1sJyxcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCDsgqzsnbTrk5wg7Yyo64SQIOyXtOq4sCDsmKTrpZg6JywgZXJyb3IpO1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG59XG5cbiIsImltcG9ydCB7IEJhY2tncm91bmRNZXNzYWdlLCBCYWNrZ3JvdW5kUmVzcG9uc2UgfSBmcm9tICcuLi9jb250ZW50cy9saWIvYmFja2dyb3VuZEFwaSc7XG5pbXBvcnQgeyBhcGlDYWxsIH0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHsgb3BlblNpZGVQYW5lbCB9IGZyb20gJy4vc2lkZXBhbmVsJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU1lc3NhZ2VIYW5kbGVyKCkge1xuICAgIHJldHVybiAoXG4gICAgICAgIG1lc3NhZ2U6IEJhY2tncm91bmRNZXNzYWdlLFxuICAgICAgICBzZW5kZXI6IGFueSxcbiAgICAgICAgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IEJhY2tncm91bmRSZXNwb25zZSkgPT4gdm9pZFxuICAgICk6IGJvb2xlYW4gPT4ge1xuICAgICAgICAvLyDruYTrj5nquLAg7J2R64u1IOyymOumrFxuICAgICAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVzdWx0OiBCYWNrZ3JvdW5kUmVzcG9uc2U7XG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG1lc3NhZ2UudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdHRVRfQ09NTUVOVFMnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TpSBHRVRfQ09NTUVOVFMg7JqU7LKtOicsIG1lc3NhZ2UuY2hhbGxlbmdlSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBhcGlDYWxsPHsgY29tbWVudHM6IGFueVtdIH0+KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGAvYXBpL2NvbW1lbnRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG1lc3NhZ2UuY2hhbGxlbmdlSWQpfWBcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHJlc3BvbnNlLmNvbW1lbnRzIHx8IFtdIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0NSRUFURV9DT01NRU5UJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk50gQ1JFQVRFX0NPTU1FTlQg7JqU7LKtOicsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBhcGlDYWxsPHsgY29tbWVudDogYW55IH0+KCcvYXBpL2NvbW1lbnRzJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbGxlbmdlX2lkOiBtZXNzYWdlLmNoYWxsZW5nZUlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGF5ZXJfYWRkcmVzczogbWVzc2FnZS5wbGF5ZXJBZGRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBtZXNzYWdlLmNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpZ25hdHVyZTogKG1lc3NhZ2UgYXMgYW55KS5zaWduYXR1cmUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IChtZXNzYWdlIGFzIGFueSkubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiByZXNwb25zZS5jb21tZW50IH07XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0RFTEVURV9DT01NRU5UJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfl5HvuI8gREVMRVRFX0NPTU1FTlQg7JqU7LKtOicsIG1lc3NhZ2UuY29tbWVudElkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGFwaUNhbGwoYC9hcGkvY29tbWVudHMvJHtlbmNvZGVVUklDb21wb25lbnQobWVzc2FnZS5jb21tZW50SWQpfWAsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHVuZGVmaW5lZCB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjYXNlICdIRUFMVEhfQ0hFQ0snOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+SkyBIRUFMVEhfQ0hFQ0sg7JqU7LKtJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGFwaUNhbGw8e1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1czogc3RyaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogc3RyaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1cGFiYXNlOiBzdHJpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9PignL2hlYWx0aCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiByZXNwb25zZSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ09QRU5fU0lERV9QQU5FTCc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OCIE9QRU5fU0lERV9QQU5FTCDsmpTssq0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgb3BlblNpZGVQYW5lbChzZW5kZXIudGFiPy5pZCA/PyAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHVuZGVmaW5lZCB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCDsgqzsnbTrk5wg7Yyo64SQIOyXtOq4sCDsmKTrpZg6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICfsgqzsnbTrk5wg7Yyo64SQIOyXtOq4sCDsi6TtjKgnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0dFVF9TVE9SQUdFJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfkr4gR0VUX1NUT1JBR0Ug7JqU7LKtOicsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGJyb3dzZXIgfSA9IGF3YWl0IGltcG9ydCgnd3h0L2Jyb3dzZXInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdG9yYWdlID0gYnJvd3Nlcj8uc3RvcmFnZSB8fCAoZ2xvYmFsVGhpcyBhcyBhbnkpLmNocm9tZT8uc3RvcmFnZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhcmVhID0gKG1lc3NhZ2UgYXMgYW55KS5hcmVhIHx8ICdzZXNzaW9uJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdG9yYWdlQXJlYSA9IGFyZWEgPT09ICdsb2NhbCcgPyBzdG9yYWdlLmxvY2FsIDogc3RvcmFnZS5zZXNzaW9uO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IG5ldyBQcm9taXNlPGFueT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yYWdlQXJlYS5nZXQoWyhtZXNzYWdlIGFzIGFueSkua2V5XSwgKHJlc3VsdDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBydW50aW1lID0gYnJvd3Nlcj8ucnVudGltZSB8fCAoZ2xvYmFsVGhpcyBhcyBhbnkpLmNocm9tZT8ucnVudGltZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChydW50aW1lPy5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKHJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdFsobWVzc2FnZSBhcyBhbnkpLmtleV0gfHwgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0geyBzdWNjZXNzOiB0cnVlLCBkYXRhIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIFN0b3JhZ2Ug7J296riwIOyYpOulmDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1N0b3JhZ2Ug7J296riwIOyLpO2MqCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnU0VUX1NUT1JBR0UnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+SviBTRVRfU1RPUkFHRSDsmpTssq06JywgbWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgYnJvd3NlciB9ID0gYXdhaXQgaW1wb3J0KCd3eHQvYnJvd3NlcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0b3JhZ2UgPSBicm93c2VyPy5zdG9yYWdlIHx8IChnbG9iYWxUaGlzIGFzIGFueSkuY2hyb21lPy5zdG9yYWdlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFyZWEgPSAobWVzc2FnZSBhcyBhbnkpLmFyZWEgfHwgJ3Nlc3Npb24nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0b3JhZ2VBcmVhID0gYXJlYSA9PT0gJ2xvY2FsJyA/IHN0b3JhZ2UubG9jYWwgOiBzdG9yYWdlLnNlc3Npb247XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JhZ2VBcmVhLnNldChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgWyhtZXNzYWdlIGFzIGFueSkua2V5XTogKG1lc3NhZ2UgYXMgYW55KS52YWx1ZSB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJ1bnRpbWUgPSBicm93c2VyPy5ydW50aW1lIHx8IChnbG9iYWxUaGlzIGFzIGFueSkuY2hyb21lPy5ydW50aW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChydW50aW1lPy5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB1bmRlZmluZWQgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgU3RvcmFnZSDsoIDsnqUg7Jik66WYOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnU3RvcmFnZSDsoIDsnqUg7Iuk7YyoJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiAn7JWMIOyImCDsl4bripQg66mU7Iuc7KeAIO2DgOyeheyeheuLiOuLpC4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyDsnZHri7Ug7KCE7IahXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoc2VuZEVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCDsnZHri7Ug7KCE7IahIOyLpO2MqDonLCBzZW5kRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgQmFja2dyb3VuZCBBUEkg7Jik66WYOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2Uoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAn7JWMIOyImCDsl4bripQg7Jik66WY6rCAIOuwnOyDne2WiOyKteuLiOuLpC4nLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChzZW5kRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIOyXkOufrCDsnZHri7Ug7KCE7IahIOyLpO2MqDonLCBzZW5kRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcblxuICAgICAgICAvLyDruYTrj5nquLAg7J2R64u17J2EIOychO2VtCB0cnVlIOuwmO2ZmFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xufVxuXG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSAnd3h0L2Jyb3dzZXInO1xuaW1wb3J0IHsgZGVmaW5lQmFja2dyb3VuZCB9IGZyb20gJ3d4dC91dGlscy9kZWZpbmUtYmFja2dyb3VuZCc7XG5pbXBvcnQgeyBjcmVhdGVNZXNzYWdlSGFuZGxlciB9IGZyb20gJy4uL3NyYy9iYWNrZ3JvdW5kL21lc3NhZ2VIYW5kbGVyJztcbmltcG9ydCB7IG9wZW5TaWRlUGFuZWwgfSBmcm9tICcuLi9zcmMvYmFja2dyb3VuZC9zaWRlcGFuZWwnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVCYWNrZ3JvdW5kKCgpID0+IHtcbiAgICBjb25zdCBydW50aW1lID0gYnJvd3Nlcj8ucnVudGltZSB8fCAoZ2xvYmFsVGhpcyBhcyBhbnkpLmNocm9tZT8ucnVudGltZTtcblxuICAgIGJyb3dzZXIuYWN0aW9uPy5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoYXN5bmMgKHRhYikgPT4ge1xuICAgICAgICBhd2FpdCBvcGVuU2lkZVBhbmVsKHRhYj8uaWQpO1xuICAgIH0pO1xuXG4gICAgLy8gQmFja2dyb3VuZCBTY3JpcHQg66mU7Iuc7KeAIO2VuOuTpOufrFxuICAgIHJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGNyZWF0ZU1lc3NhZ2VIYW5kbGVyKCkpO1xufSk7XG4iLCIvLyBzcmMvaW5kZXgudHNcbnZhciBfTWF0Y2hQYXR0ZXJuID0gY2xhc3Mge1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4pIHtcbiAgICBpZiAobWF0Y2hQYXR0ZXJuID09PSBcIjxhbGxfdXJscz5cIikge1xuICAgICAgdGhpcy5pc0FsbFVybHMgPSB0cnVlO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBbLi4uX01hdGNoUGF0dGVybi5QUk9UT0NPTFNdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gXCIqXCI7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZ3JvdXBzID0gLyguKik6XFwvXFwvKC4qPykoXFwvLiopLy5leGVjKG1hdGNoUGF0dGVybik7XG4gICAgICBpZiAoZ3JvdXBzID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgXCJJbmNvcnJlY3QgZm9ybWF0XCIpO1xuICAgICAgY29uc3QgW18sIHByb3RvY29sLCBob3N0bmFtZSwgcGF0aG5hbWVdID0gZ3JvdXBzO1xuICAgICAgdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKTtcbiAgICAgIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSk7XG4gICAgICB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBwcm90b2NvbCA9PT0gXCIqXCIgPyBbXCJodHRwXCIsIFwiaHR0cHNcIl0gOiBbcHJvdG9jb2xdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gaG9zdG5hbWU7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBwYXRobmFtZTtcbiAgICB9XG4gIH1cbiAgaW5jbHVkZXModXJsKSB7XG4gICAgaWYgKHRoaXMuaXNBbGxVcmxzKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgdSA9IHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIgPyBuZXcgVVJMKHVybCkgOiB1cmwgaW5zdGFuY2VvZiBMb2NhdGlvbiA/IG5ldyBVUkwodXJsLmhyZWYpIDogdXJsO1xuICAgIHJldHVybiAhIXRoaXMucHJvdG9jb2xNYXRjaGVzLmZpbmQoKHByb3RvY29sKSA9PiB7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwc1wiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBzTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZmlsZVwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0ZpbGVNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmdHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGdHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJ1cm5cIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNVcm5NYXRjaCh1KTtcbiAgICB9KTtcbiAgfVxuICBpc0h0dHBNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHA6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0h0dHBzTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSG9zdFBhdGhNYXRjaCh1cmwpIHtcbiAgICBpZiAoIXRoaXMuaG9zdG5hbWVNYXRjaCB8fCAhdGhpcy5wYXRobmFtZU1hdGNoKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IGhvc3RuYW1lTWF0Y2hSZWdleHMgPSBbXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gpLFxuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoLnJlcGxhY2UoL15cXCpcXC4vLCBcIlwiKSlcbiAgICBdO1xuICAgIGNvbnN0IHBhdGhuYW1lTWF0Y2hSZWdleCA9IHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMucGF0aG5hbWVNYXRjaCk7XG4gICAgcmV0dXJuICEhaG9zdG5hbWVNYXRjaFJlZ2V4cy5maW5kKChyZWdleCkgPT4gcmVnZXgudGVzdCh1cmwuaG9zdG5hbWUpKSAmJiBwYXRobmFtZU1hdGNoUmVnZXgudGVzdCh1cmwucGF0aG5hbWUpO1xuICB9XG4gIGlzRmlsZU1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmaWxlOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc0Z0cE1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmdHA6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzVXJuTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IHVybjovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgY29udmVydFBhdHRlcm5Ub1JlZ2V4KHBhdHRlcm4pIHtcbiAgICBjb25zdCBlc2NhcGVkID0gdGhpcy5lc2NhcGVGb3JSZWdleChwYXR0ZXJuKTtcbiAgICBjb25zdCBzdGFyc1JlcGxhY2VkID0gZXNjYXBlZC5yZXBsYWNlKC9cXFxcXFwqL2csIFwiLipcIik7XG4gICAgcmV0dXJuIFJlZ0V4cChgXiR7c3RhcnNSZXBsYWNlZH0kYCk7XG4gIH1cbiAgZXNjYXBlRm9yUmVnZXgoc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG4gIH1cbn07XG52YXIgTWF0Y2hQYXR0ZXJuID0gX01hdGNoUGF0dGVybjtcbk1hdGNoUGF0dGVybi5QUk9UT0NPTFMgPSBbXCJodHRwXCIsIFwiaHR0cHNcIiwgXCJmaWxlXCIsIFwiZnRwXCIsIFwidXJuXCJdO1xudmFyIEludmFsaWRNYXRjaFBhdHRlcm4gPSBjbGFzcyBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuLCByZWFzb24pIHtcbiAgICBzdXBlcihgSW52YWxpZCBtYXRjaCBwYXR0ZXJuIFwiJHttYXRjaFBhdHRlcm59XCI6ICR7cmVhc29ufWApO1xuICB9XG59O1xuZnVuY3Rpb24gdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKSB7XG4gIGlmICghTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5pbmNsdWRlcyhwcm90b2NvbCkgJiYgcHJvdG9jb2wgIT09IFwiKlwiKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYCR7cHJvdG9jb2x9IG5vdCBhIHZhbGlkIHByb3RvY29sICgke01hdGNoUGF0dGVybi5QUk9UT0NPTFMuam9pbihcIiwgXCIpfSlgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSkge1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCI6XCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgYEhvc3RuYW1lIGNhbm5vdCBpbmNsdWRlIGEgcG9ydGApO1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCIqXCIpICYmIGhvc3RuYW1lLmxlbmd0aCA+IDEgJiYgIWhvc3RuYW1lLnN0YXJ0c1dpdGgoXCIqLlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGBJZiB1c2luZyBhIHdpbGRjYXJkICgqKSwgaXQgbXVzdCBnbyBhdCB0aGUgc3RhcnQgb2YgdGhlIGhvc3RuYW1lYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpIHtcbiAgcmV0dXJuO1xufVxuZXhwb3J0IHtcbiAgSW52YWxpZE1hdGNoUGF0dGVybixcbiAgTWF0Y2hQYXR0ZXJuXG59O1xuIl0sIm5hbWVzIjpbImJyb3dzZXIiLCJfYnJvd3NlciIsInJlc3VsdCJdLCJtYXBwaW5ncyI6Ijs7QUFDTyxRQUFNQSxZQUFVLFdBQVcsU0FBUyxTQUFTLEtBQ2hELFdBQVcsVUFDWCxXQUFXO0FDRlIsUUFBTSxVQUFVQzs7Ozs7QUNEaEIsV0FBUyxpQkFBaUIsS0FBSztBQUNwQyxRQUFJLE9BQU8sUUFBUSxPQUFPLFFBQVEsV0FBWSxRQUFPLEVBQUUsTUFBTSxJQUFHO0FBQ2hFLFdBQU87QUFBQSxFQUNUO0FDRk8sUUFBTSxlQUErQztBQ0U1RCxpQkFBc0IsUUFDbEIsVUFDQSxVQUF1QixJQUNiO0FBQ1YsVUFBTSxNQUFNLEdBQUcsWUFBWSxHQUFHLFFBQVE7QUFFdEMsVUFBTSxpQkFBaUI7QUFBQSxNQUNuQixnQkFBZ0I7QUFBQSxJQUFBO0FBR3BCLFFBQUk7QUFDQSxZQUFNLFdBQVcsTUFBTSxNQUFNLEtBQUs7QUFBQSxRQUM5QixHQUFHO0FBQUEsUUFDSCxTQUFTO0FBQUEsVUFDTCxHQUFHO0FBQUEsVUFDSCxHQUFHLFFBQVE7QUFBQSxRQUFBO0FBQUEsTUFDZixDQUNIO0FBRUQsVUFBSSxDQUFDLFNBQVMsSUFBSTtBQUNkLGNBQU0sWUFBWSxNQUFNLFNBQVMsS0FBQSxFQUFPLE1BQU0sT0FBTyxFQUFFLE9BQU8scUJBQUEsRUFBdUI7QUFDckYsY0FBTSxJQUFJLE1BQU0sVUFBVSxTQUFTLFFBQVEsU0FBUyxNQUFNLEtBQUssU0FBUyxVQUFVLEVBQUU7QUFBQSxNQUN4RjtBQUVBLGFBQU8sU0FBUyxLQUFBO0FBQUEsSUFDcEIsU0FBUyxPQUFPO0FBQ1osVUFBSSxpQkFBaUIsT0FBTztBQUN4QixjQUFNO0FBQUEsTUFDVjtBQUNBLFlBQU0sSUFBSSxNQUFNLGtCQUFrQjtBQUFBLElBQ3RDO0FBQUEsRUFDSjtBQy9CQSxpQkFBc0IsY0FBYyxPQUErQjtBQUMv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
