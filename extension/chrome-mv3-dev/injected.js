/**
 * Injected Script - 웹페이지 컨텍스트에서 실행
 * 
 * - 보안 강화
 * - 에러 처리 개선
 * - 구조화된 로깅
 * - 확장 가능한 구조
 */

(function () {
    'use strict';

    // 고유 식별자
    const SCRIPT_ID = '__SQUID_MEME_INJECTED__';
    const MESSAGE_SOURCE = {
        CONTENT_SCRIPT: 'CONTENT_SCRIPT',
        INJECTED_SCRIPT_RESPONSE: 'INJECTED_SCRIPT_RESPONSE',
        INJECTED_SCRIPT_READY: 'INJECTED_SCRIPT_READY',
        ACCOUNTS_CHANGED: 'ACCOUNTS_CHANGED',
        CHAIN_CHANGED: 'CHAIN_CHANGED',
        TOKEN_CONTRACT_CACHED: 'TOKEN_CONTRACT_CACHED',
    };

    // 이미 주입되었는지 확인
    if (window[SCRIPT_ID]) {
        console.warn('🦑 [SQUID_MEME] Injected script already exists');
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
    const TOKEN_STORAGE_KEY = '__SQUID_MEME_AUTH_TOKEN__';

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

    // 원본 fetch 저장
    const originalFetch = window.fetch;

    // fetch를 즉시 intercept (다른 코드보다 먼저)
    if (typeof originalFetch === 'function') {
        window.fetch = function (...args) {
            const [url, options = {}] = args;
            const urlString = typeof url === 'string' ? url : url?.url || '';


            // /api/service/public/price/latest/{id}/{contractAddress} 요청 감지
            const priceMatch = urlString.match(/\/api\/service\/public\/price\/latest\/([^\/]+)\/(0x[a-fA-F0-9]+)/);
            if (priceMatch) {
                const [, id, contractAddress] = priceMatch;

                // 현재 브라우저 URL에서 profile/{username}/{usertag} 추출
                const currentUrl = window.location.href;
                const profileMatch = currentUrl.match(/\/profile\/([^\/]+)\/([^\/]+)/);

                if (profileMatch) {
                    const [, username, userTag] = profileMatch;
                    const cacheKey = `${username}#${userTag}`;

                    // 캐시에 저장
                    tokenContractCache.set(cacheKey, {
                        id,
                        contractAddress,
                        username,
                        userTag,
                        timestamp: Date.now()
                    });

                    // window에도 저장 (Content Script와 공유)
                    try {
                        if (!window.__SQUID_MEME_TOKEN_CONTRACTS__) {
                            window.__SQUID_MEME_TOKEN_CONTRACTS__ = {};
                        }
                        window.__SQUID_MEME_TOKEN_CONTRACTS__[cacheKey] = {
                            id,
                            contractAddress,
                            username,
                            userTag,
                            timestamp: Date.now()
                        };
                    } catch (e) {
                        // 저장 실패는 무시
                    }

                    log.info('✅ 토큰 컨트랙트 주소 캐시됨', {
                        username,
                        userTag,
                        id,
                        contractAddress,
                        cacheKey
                    });

                    // Content Script에 토큰 컨트랙트 캐시 알림
                    window.postMessage(
                        {
                            source: MESSAGE_SOURCE.TOKEN_CONTRACT_CACHED,
                            data: {
                                id,
                                contractAddress,
                                username,
                                userTag,
                                timestamp: Date.now()
                            },
                        },
                        '*'
                    );
                }
            }

            return originalFetch.apply(this, args);
        };
    }

    // 로깅 헬퍼
    const log = {
        info: (message, ...args) => console.log(`🦑 [SQUID_MEME] ${message}`, ...args),
        warn: (message, ...args) => console.warn(`🦑 [SQUID_MEME] ${message}`, ...args),
        error: (message, ...args) => console.error(`🦑 [SQUID_MEME] ${message}`, ...args),
    };

    log.info('Injected script loaded');

    // XMLHttpRequest도 intercept (일부 앱은 fetch 대신 XMLHttpRequest 사용)
    if (typeof window.XMLHttpRequest !== 'undefined') {
        const OriginalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function () {
            const xhr = new OriginalXHR();
            const originalSetRequestHeader = xhr.setRequestHeader;
            const originalOpen = xhr.open;
            const originalSend = xhr.send;

            let requestUrl = '';
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
                if (requestUrl.includes('/api/service/public/user/info')) {
                    log.info('🔍 XHR 사용자 정보 API 요청', {
                        url: requestUrl.substring(0, 150),
                        headers: Object.keys(requestHeaders)
                    });
                }
                return originalSend.apply(this, args);
            };

            return xhr;
        };

        log.info('✅ XMLHttpRequest intercept 설정 완료');
    }


    // MetaMask provider 확인
    if (typeof window.ethereum === 'undefined') {
        log.warn('MetaMask provider not found in the window');
    } else {
        log.info('MetaMask provider found. Setting up message listeners');
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
        if (!event.data || typeof event.data !== 'object') {
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
                throw new Error('Ethereum provider not available');
            }

            log.info('Processing Ethereum request', {
                method: payload.method,
                id: payload.id,
            });

            let result = await window.ethereum.request({
                method: payload.method,
                params: payload.params || [],
            });

            // wallet_switchEthereumChain은 null을 반환할 수 있음
            if (payload.method === 'wallet_switchEthereumChain' && result === null) {
                result = { success: true };
            }

            // 결과 전송
            window.postMessage(
                {
                    source: MESSAGE_SOURCE.INJECTED_SCRIPT_RESPONSE,
                    id: payload.id,
                    result: result,
                },
                '*'
            );

            log.info('Ethereum request completed', {
                method: payload.method,
                id: payload.id,
            });
        } catch (error) {
            log.error('Ethereum request failed', error, {
                method: payload.method,
                id: payload.id,
            });

            // MetaMask 에러 코드 추출
            let errorMessage = error?.message || 'Injection request failed';
            let errorCode = null;

            if (error?.code) {
                errorCode = error.code;
                // 4902는 체인이 추가되지 않았다는 의미
                if (error.code === 4902) {
                    errorMessage = 'Chain not added. Please add chain manually.';
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
                '*'
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
            log.error('SessionStorage 읽기 실패', error, { key });
            return null;
        }
    }

    /**
     * 메시지 리스너
     */
    window.addEventListener('message', async (event) => {
        // Content Script로부터의 메시지만 처리
        if (!isValidMessage(event, MESSAGE_SOURCE.CONTENT_SCRIPT)) {
            return;
        }

        const { method, payload } = event.data;

        // ETH_REQUEST 메서드 처리
        if (method === 'ETH_REQUEST') {
            await handleEthereumRequest(payload);
        }

        // GET_SESSION_STORAGE 메서드 처리
        if (method === 'GET_SESSION_STORAGE') {
            try {
                const key = payload.key;
                if (!key) {
                    throw new Error('Key is required');
                }

                const value = getSessionStorage(key);
                window.postMessage(
                    {
                        source: MESSAGE_SOURCE.INJECTED_SCRIPT_RESPONSE,
                        id: payload.id,
                        result: value,
                    },
                    '*'
                );
            } catch (error) {
                log.error('SessionStorage 읽기 실패', error, { key: payload?.key });
                window.postMessage(
                    {
                        source: MESSAGE_SOURCE.INJECTED_SCRIPT_RESPONSE,
                        id: payload.id,
                        error: error?.message || 'Failed to read sessionStorage',
                    },
                    '*'
                );
            }
        }

    });

    /**
     * Authorization 토큰 가져오기
     * 저장된 토큰만 사용 (window 또는 localStorage의 Mock 토큰)
     */
    function getAuthorizationToken() {
        // 1. 캐시된 토큰 사용
        if (cachedAuthToken) {
            return cachedAuthToken;
        }

        // 2. window에 저장된 토큰 확인 (Content Script가 저장한 것 또는 Mock 토큰)
        const storedToken = getStoredToken();
        if (storedToken) {
            cachedAuthToken = storedToken; // 캐시에 저장
            return storedToken;
        }

        // 3. localStorage에서 Mock 토큰 확인 (개발/테스트 환경)
        try {
            const mockToken = localStorage.getItem('__SQUID_MEME_MOCK_TOKEN__');
            if (mockToken) {
                // Bearer 접두사 확인 및 추가
                let normalizedToken = mockToken;
                if (!normalizedToken.startsWith('Bearer ')) {
                    normalizedToken = `Bearer ${normalizedToken}`;
                }
                cachedAuthToken = normalizedToken; // 캐시에 저장
                return normalizedToken;
            }
        } catch (e) {
            // localStorage 접근 실패는 무시
        }

        return null;
    }


    /**
     * MetaMask 이벤트 리스너 설정
     */
    function setupEthereumEventListeners() {
        if (!window.ethereum) {
            return;
        }

        // 계정 변경 이벤트 (연결/해제 감지)
        window.ethereum.on('accountsChanged', (accounts) => {
            log.info('Accounts changed', { accounts });
            window.postMessage(
                {
                    source: MESSAGE_SOURCE.ACCOUNTS_CHANGED,
                    accounts: accounts || [],
                },
                '*'
            );
        });

        // 체인 변경 이벤트
        window.ethereum.on('chainChanged', (chainId) => {
            log.info('Chain changed', { chainId });
            window.postMessage(
                {
                    source: MESSAGE_SOURCE.CHAIN_CHANGED,
                    chainId: chainId,
                },
                '*'
            );
        });

        // 연결 이벤트 (EIP-1193)
        if (window.ethereum.on) {
            window.ethereum.on('connect', (connectInfo) => {
                log.info('Provider connected', { chainId: connectInfo.chainId });
            });

            window.ethereum.on('disconnect', (error) => {
                log.warn('Provider disconnected', error);
                // 연결 해제 시 계정도 비워짐
                window.postMessage(
                    {
                        source: MESSAGE_SOURCE.ACCOUNTS_CHANGED,
                        accounts: [],
                    },
                    '*'
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

    // 준비 완료 알림
    window.postMessage(
        {
            source: MESSAGE_SOURCE.INJECTED_SCRIPT_READY,
        },
        '*'
    );

    log.info('Injected script ready');
})();
