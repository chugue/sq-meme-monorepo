/**
 * Injected Script와 통신하기 위한 API
 * 
 * 시니어급 기준으로 재설계:
 * - 타입 안정성 강화
 * - 에러 처리 개선
 * - 확장성 고려
 * - 테스트 가능한 구조
 */

import { encodeFunctionData, decodeFunctionResult, type Abi } from 'viem';
import { INJECTED_CONFIG } from './injected/config';
import { logger } from './injected/logger';
import { isInjectedScriptReadyMessage, isInjectedScriptResponse } from './injected/messageValidator';
import { requestIdManager } from './injected/requestManager';
import type {
    EthereumMethod,
    InjectedScriptError,
    InjectedScriptResponse,
    SignMessageParams,
    TransactionParams,
} from './injected/types';
import { ERROR_CODES, InjectedScriptError as InjectedScriptErrorClass } from './injected/types';

/**
 * 요청 옵션
 */
export interface RequestOptions {
    timeout?: number;
    retry?: {
        maxAttempts?: number;
        delay?: number;
    };
}

/**
 * Injected script로 Ethereum 요청 전송
 * 
 * @param method - Ethereum RPC 메서드
 * @param params - 메서드 파라미터
 * @param options - 요청 옵션
 * @returns Promise<T> - 요청 결과
 * @throws {InjectedScriptError} 요청 실패 시
 */
export async function sendEthereumRequest<T = unknown>(
    method: EthereumMethod,
    params: unknown[] = [],
    options: RequestOptions = {}
): Promise<T> {
    const timeout = options.timeout ?? INJECTED_CONFIG.REQUEST_TIMEOUT;
    const maxAttempts = options.retry?.maxAttempts ?? INJECTED_CONFIG.RETRY.MAX_ATTEMPTS;
    const retryDelay = options.retry?.delay ?? INJECTED_CONFIG.RETRY.DELAY;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await attemptRequest<T>(method, params, timeout);
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // 재시도 불가능한 에러는 즉시 throw
            if (error instanceof InjectedScriptErrorClass) {
                if (
                    error.code === ERROR_CODES.USER_REJECTED ||
                    error.code === ERROR_CODES.INVALID_MESSAGE
                ) {
                    throw error;
                }
            }

            // 마지막 시도면 에러 throw
            if (attempt === maxAttempts) {
                logger.warn('요청 실패 (재시도 소진)', {
                    method,
                    attempts: attempt,
                    error: lastError.message,
                });
                throw lastError;
            }

            // 재시도 전 대기
            logger.debug('요청 재시도', { method, attempt, maxAttempts });
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
    }

    throw lastError || new Error('Unknown error');
}

/**
 * 단일 요청 시도
 */
function attemptRequest<T>(
    method: EthereumMethod,
    params: unknown[],
    timeout: number
): Promise<T> {
    return new Promise((resolve, reject) => {
        const id = requestIdManager.generateId();
        let timeoutId: NodeJS.Timeout | null = null;
        let messageListener: ((event: MessageEvent) => void) | null = null;

        const cleanup = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            if (messageListener) {
                window.removeEventListener('message', messageListener);
                messageListener = null;
            }
        };

        // 타임아웃 설정
        timeoutId = setTimeout(() => {
            cleanup();
            const errorMessage = `Ethereum request timeout after ${timeout}ms. Injected script may not be ready.`;
            logger.warn(errorMessage, { method, id });
            reject(
                new InjectedScriptErrorClass(
                    errorMessage,
                    ERROR_CODES.TIMEOUT
                )
            );
        }, timeout);

        // 응답 리스너
        messageListener = (event: MessageEvent) => {
            if (!isInjectedScriptResponse(event, id)) {
                return;
            }

            cleanup();

            const response = event.data as InjectedScriptResponse;
            if (response.error) {
                // 에러 코드 확인
                const errorCode = response.errorCode;

                // 4902는 체인이 추가되지 않았다는 의미
                if (errorCode === 4902 || errorCode === '4902') {
                    reject(
                        new InjectedScriptErrorClass(
                            response.error,
                            ERROR_CODES.PROVIDER_NOT_AVAILABLE
                        )
                    );
                }
                // 사용자 거부 에러 처리
                else if (
                    response.error.includes('User rejected') ||
                    response.error.includes('denied') ||
                    response.error.includes('user rejected') ||
                    errorCode === 4001 ||
                    errorCode === '4001'
                ) {
                    reject(
                        new InjectedScriptErrorClass(
                            response.error,
                            ERROR_CODES.USER_REJECTED
                        )
                    );
                } else {
                    reject(
                        new InjectedScriptErrorClass(
                            response.error,
                            ERROR_CODES.UNKNOWN_ERROR
                        )
                    );
                }
            } else {
                resolve(response.result as T);
            }
        };

        window.addEventListener('message', messageListener);

        // 메시지 전송
        try {
            // GET_SESSION_STORAGE는 특별 처리
            const messageMethod = method === 'GET_SESSION_STORAGE' ? 'GET_SESSION_STORAGE' : 'ETH_REQUEST';

            const payload: any = {
                id,
                method: method === 'GET_SESSION_STORAGE' ? undefined : method,
                params: params || [],
            };

            if (method === 'GET_SESSION_STORAGE' && params && params.length > 0) {
                const firstParam = params[0] as any;
                if (firstParam && typeof firstParam === 'object' && 'key' in firstParam) {
                    payload.key = firstParam.key;
                }
            }

            window.postMessage(
                {
                    source: 'CONTENT_SCRIPT',
                    method: messageMethod,
                    payload,
                },
                '*'
            );

            logger.debug('요청 전송', { method, id, params });
        } catch (error) {
            cleanup();
            reject(
                new InjectedScriptErrorClass(
                    'Failed to send message',
                    ERROR_CODES.UNKNOWN_ERROR,
                    error
                )
            );
        }
    });
}

/**
 * MetaMask 계정 연결 요청
 */
export async function requestAccounts(): Promise<string[]> {
    return sendEthereumRequest<string[]>('eth_requestAccounts');
}

/**
 * 현재 연결된 계정 조회
 */
export async function getAccounts(): Promise<string[]> {
    return sendEthereumRequest<string[]>('eth_accounts');
}

/**
 * 현재 체인 ID 조회
 */
export async function getChainId(): Promise<string> {
    return sendEthereumRequest<string>('eth_chainId');
}

/**
 * 트랜잭션 전송
 */
export async function sendTransaction(transaction: TransactionParams): Promise<string> {
    return sendEthereumRequest<string>('eth_sendTransaction', [transaction]);
}

/**
 * 메시지 서명
 */
export async function signMessage({ message, address }: SignMessageParams): Promise<string> {
    return sendEthereumRequest<string>('personal_sign', [message, address]);
}

/**
 * 네트워크 전환 (필요시 체인 추가 후 전환)
 */
export async function switchNetwork(chainId: number): Promise<void> {
    const chainIdHex = `0x${chainId.toString(16)}`;

    try {
        // 먼저 전환 시도
        await sendEthereumRequest<void>('wallet_switchEthereumChain', [{ chainId: chainIdHex }]);
        logger.info('네트워크 전환 성공', { chainId, chainIdHex });
    } catch (error) {
        // 4902 에러는 체인이 추가되지 않았다는 의미
        if (
            error instanceof Error &&
            (error.message.includes('4902') || error.message.includes('Unrecognized chain'))
        ) {
            logger.info('체인 추가 필요', { chainId, chainIdHex });
            // 체인 추가는 injected script에서 처리하도록 메시지 전송
            // (체인 정보는 injected script에서 가져와야 함)
            throw new InjectedScriptErrorClass(
                'Chain not added. Please add chain manually.',
                ERROR_CODES.PROVIDER_NOT_AVAILABLE,
                error
            );
        }
        throw error;
    }
}

/**
 * 체인 추가 및 전환
 */
export async function addAndSwitchNetwork(chainConfig: {
    chainId: string;
    chainName: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrls: string[];
    blockExplorerUrls?: string[];
}): Promise<void> {
    try {
        // 체인 추가
        await sendEthereumRequest<void>('wallet_addEthereumChain', [chainConfig]);
        logger.info('체인 추가 성공', { chainId: chainConfig.chainId });
    } catch (error) {
        logger.error('체인 추가 실패', error);
        throw error;
    }
}

/**
 * 현재 체인 ID 확인 및 필요시 전환
 */
export async function ensureNetwork(chainId: number): Promise<void> {
    try {
        const currentChainId = await getChainId();
        const currentChainIdNumber = parseInt(currentChainId, 16);

        if (currentChainIdNumber === chainId) {
            logger.debug('이미 올바른 네트워크에 연결됨', { chainId });
            return;
        }

        logger.info('네트워크 전환 필요', {
            current: currentChainIdNumber,
            target: chainId,
        });

        await switchNetwork(chainId);
    } catch (error) {
        logger.error('네트워크 전환 실패', error);
        throw error;
    }
}

/**
 * Injected script가 준비되었는지 확인
 * 
 * 이미 준비되었는지 즉시 확인하고, 없으면 메시지를 기다립니다.
 */
export function waitForInjectedScript(timeout: number = INJECTED_CONFIG.READY_TIMEOUT): Promise<boolean> {
    return new Promise((resolve) => {
        // 먼저 script 태그로 injected script가 주입되었는지 확인
        const existingScript = document.querySelector('script[data-squid-meme-injected="true"]');
        if (existingScript) {
            logger.debug('Injected script 태그 확인됨, 메시지 대기');
        }

        let timeoutId: NodeJS.Timeout | null = null;
        let messageListener: ((event: MessageEvent) => void) | null = null;
        let checkInterval: NodeJS.Timeout | null = null;

        const cleanup = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            if (messageListener) {
                window.removeEventListener('message', messageListener);
                messageListener = null;
            }
            if (checkInterval) {
                clearInterval(checkInterval);
                checkInterval = null;
            }
        };

        messageListener = (event: MessageEvent) => {
            if (isInjectedScriptReadyMessage(event)) {
                cleanup();
                logger.debug('Injected script 준비 완료 (메시지 수신)');
                resolve(true);
            }
        };

        window.addEventListener('message', messageListener);

        // 주기적으로 script 태그 확인 (이미 주입되었지만 메시지를 놓쳤을 수 있음)
        checkInterval = setInterval(() => {
            const script = document.querySelector('script[data-squid-meme-injected="true"]');
            if (script) {
                // script가 있으면 준비된 것으로 간주 (메시지를 놓쳤을 수 있음)
                logger.debug('Injected script 태그 확인, 준비된 것으로 간주');
                cleanup();
                resolve(true);
            }
        }, 100); // 100ms마다 확인

        timeoutId = setTimeout(() => {
            cleanup();
            logger.warn('Injected script 준비 타임아웃', { timeout });
            resolve(false);
        }, timeout);
    });
}

/**
 * SessionStorage 읽기
 * 
 * @param key - SessionStorage 키
 * @returns Promise<unknown> - 저장된 값 (JSON 파싱됨)
 */
export async function getSessionStorage(key: string): Promise<unknown> {
    return sendEthereumRequest<unknown>('GET_SESSION_STORAGE', [{ key }]);
}

/**
 * 컨트랙트 읽기 (eth_call)
 */
export interface ReadContractParams {
    address: string;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
}

export async function readContract<T = unknown>(params: ReadContractParams): Promise<T> {
    const { address, abi, functionName, args = [] } = params;

    // ABI에서 함수 찾기
    const abiItem = abi.find(
        (item) => item.type === 'function' && item.name === functionName
    );

    if (!abiItem || abiItem.type !== 'function') {
        throw new InjectedScriptErrorClass(
            `Function ${functionName} not found in ABI`,
            ERROR_CODES.INVALID_MESSAGE
        );
    }

    // calldata 인코딩
    const data = encodeFunctionData({
        abi,
        functionName,
        args: args as unknown[],
    });

    logger.debug('readContract 호출', { address, functionName, args });

    // eth_call 실행
    const result = await sendEthereumRequest<string>('eth_call', [
        { to: address, data },
        'latest',
    ]);

    // 결과 디코딩
    const decoded = decodeFunctionResult({
        abi,
        functionName,
        data: result as `0x${string}`,
    });

    logger.debug('readContract 결과', { functionName, decoded });

    return decoded as T;
}

/**
 * 컨트랙트 쓰기 (eth_sendTransaction)
 */
export interface WriteContractParams {
    address: string;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
}

export async function writeContract(params: WriteContractParams): Promise<string> {
    const { address, abi, functionName, args = [], value } = params;

    // 현재 연결된 계정 가져오기
    const accounts = await getAccounts();
    if (accounts.length === 0) {
        throw new InjectedScriptErrorClass(
            'No connected account',
            ERROR_CODES.PROVIDER_NOT_AVAILABLE
        );
    }
    const from = accounts[0];

    // calldata 인코딩
    const data = encodeFunctionData({
        abi,
        functionName,
        args: args as unknown[],
    });

    logger.debug('writeContract 호출', { address, functionName, args, value, from });

    // 트랜잭션 파라미터 구성
    const txParams: TransactionParams = {
        from,
        to: address,
        data,
    };

    if (value !== undefined && value > 0n) {
        txParams.value = `0x${value.toString(16)}`;
    }

    // eth_sendTransaction 실행
    const txHash = await sendTransaction(txParams);

    logger.info('writeContract 트랜잭션 전송', { functionName, txHash });

    return txHash;
}

/**
 * Injected API 객체
 */
export const injectedApi = {
    requestAccounts,
    getAccounts,
    getChainId,
    sendTransaction,
    signMessage,
    sendEthereumRequest,
    waitForInjectedScript,
    switchNetwork,
    addAndSwitchNetwork,
    ensureNetwork,
    getSessionStorage,
    readContract,
    writeContract,
} as const;

// 타입 export
export { ERROR_CODES, InjectedScriptError as InjectedScriptErrorClass } from './injected/types';
export type { InjectedScriptError, InjectedScriptResponse, SignMessageParams, TransactionParams };

