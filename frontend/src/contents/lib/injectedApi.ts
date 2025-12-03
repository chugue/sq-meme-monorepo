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
 * 현재 블록 번호 조회
 */
export async function getBlockNumber(): Promise<bigint> {
    const result = await sendEthereumRequest<string>('eth_blockNumber');
    return BigInt(result);
}

/**
 * 블록 정보 조회 (타임스탬프 포함)
 * @param blockTag - 'latest' | 'pending' | 'earliest' | block number (hex)
 * @returns 블록 정보 (timestamp는 bigint로 변환)
 */
export async function getBlock(blockTag: 'latest' | 'pending' | 'earliest' | string = 'latest'): Promise<{
    timestamp: bigint;
    number: bigint;
}> {
    const result = await sendEthereumRequest<{
        timestamp: string;
        number: string;
    }>('eth_getBlockByNumber', [blockTag, false]);

    return {
        timestamp: BigInt(result.timestamp),
        number: BigInt(result.number),
    };
}

/**
 * 현재 블록 타임스탬프 조회
 * @returns 현재 블록의 타임스탬프 (초 단위)
 */
export async function getBlockTimestamp(): Promise<bigint> {
    const block = await getBlock('latest');
    return block.timestamp;
}

/**
 * Next.js __next_f 데이터에서 프로필 정보 가져오기
 * MEMEX 프로필 페이지에서 tokenAddress, tokenSymbol, profileImageUrl, memexWalletAddress를 추출
 */
export interface NextFProfileData {
    profileImageUrl: string | null;
    tokenAddr: string | null;
    tokenSymbol: string | null;
    memexWalletAddress: string | null;
}

export async function getNextFData(): Promise<NextFProfileData> {
    return sendNextFDataRequest();
}

/**
 * __next_f 데이터 요청 전송
 */
function sendNextFDataRequest(): Promise<NextFProfileData> {
    return new Promise((resolve, reject) => {
        const id = requestIdManager.generateId();
        const timeout = INJECTED_CONFIG.REQUEST_TIMEOUT;
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
            logger.warn('GET_NEXT_F_DATA 타임아웃', { id });
            reject(new InjectedScriptErrorClass('GET_NEXT_F_DATA timeout', ERROR_CODES.TIMEOUT));
        }, timeout);

        // 응답 리스너
        messageListener = (event: MessageEvent) => {
            if (!isInjectedScriptResponse(event, id)) {
                return;
            }

            cleanup();

            const response = event.data as InjectedScriptResponse;
            if (response.error) {
                reject(new InjectedScriptErrorClass(response.error, ERROR_CODES.UNKNOWN_ERROR));
            } else {
                resolve(response.result as NextFProfileData);
            }
        };

        window.addEventListener('message', messageListener);

        // 메시지 전송
        try {
            window.postMessage(
                {
                    source: 'CONTENT_SCRIPT',
                    method: 'GET_NEXT_F_DATA',
                    payload: { id },
                },
                '*'
            );

            logger.debug('GET_NEXT_F_DATA 요청 전송', { id });
        } catch (error) {
            cleanup();
            reject(new InjectedScriptErrorClass('Failed to send GET_NEXT_F_DATA message', ERROR_CODES.UNKNOWN_ERROR, error));
        }
    });
}

/**
 * MetaMask 지갑 연결 해제 (권한 해제)
 * wallet_revokePermissions를 호출하여 모든 권한을 해제합니다.
 */
export async function revokePermissions(): Promise<void> {
    try {
        await sendEthereumRequest<null>('wallet_revokePermissions', [
            { eth_accounts: {} }
        ]);
        logger.info('지갑 권한 해제 성공');
    } catch (error) {
        // 일부 지갑은 이 메서드를 지원하지 않을 수 있음
        logger.warn('지갑 권한 해제 실패 (미지원 가능)', { error: String(error) });
        throw error;
    }
}

/**
 * 트랜잭션 로그 항목
 */
export interface TransactionLog {
    address: string;
    topics: string[];
    data: string;
    blockNumber: string;
    transactionHash: string;
    logIndex: string;
}

/**
 * 트랜잭션 영수증 조회
 */
export interface TransactionReceipt {
    transactionHash: string;
    blockNumber: string;
    blockHash: string;
    status: '0x1' | '0x0'; // 0x1 = success, 0x0 = failure
    gasUsed: string;
    logs: TransactionLog[];
}

export async function getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    const result = await sendEthereumRequest<TransactionReceipt | null>('eth_getTransactionReceipt', [txHash]);
    return result;
}

/**
 * 트랜잭션 확정 대기
 * @param txHash - 트랜잭션 해시
 * @param options - 폴링 옵션
 * @returns 트랜잭션 영수증 (성공 시) 또는 에러 throw
 */
export interface WaitForTransactionOptions {
    pollingInterval?: number; // 폴링 간격 (ms), 기본 2000ms
    timeout?: number; // 타임아웃 (ms), 기본 60000ms (1분)
}

export async function waitForTransaction(
    txHash: string,
    options: WaitForTransactionOptions = {}
): Promise<TransactionReceipt> {
    const { pollingInterval = 2000, timeout = 60000 } = options;
    const startTime = Date.now();

    logger.info('트랜잭션 확정 대기 시작', { txHash });

    while (true) {
        // 타임아웃 체크
        if (Date.now() - startTime > timeout) {
            throw new InjectedScriptErrorClass(
                `Transaction confirmation timeout after ${timeout}ms`,
                ERROR_CODES.TIMEOUT
            );
        }

        try {
            const receipt = await getTransactionReceipt(txHash);

            if (receipt) {
                // 트랜잭션이 확정됨
                if (receipt.status === '0x1') {
                    logger.info('트랜잭션 확정 성공', { txHash, blockNumber: receipt.blockNumber });
                    return receipt;
                } else {
                    // 트랜잭션 실패
                    throw new InjectedScriptErrorClass(
                        'Transaction failed (reverted)',
                        ERROR_CODES.UNKNOWN_ERROR
                    );
                }
            }
        } catch (error) {
            // getTransactionReceipt 에러는 무시하고 재시도
            if (error instanceof InjectedScriptErrorClass && error.code !== ERROR_CODES.TIMEOUT) {
                throw error;
            }
            logger.debug('트랜잭션 영수증 조회 실패, 재시도', { txHash });
        }

        // 폴링 간격 대기
        await new Promise((resolve) => setTimeout(resolve, pollingInterval));
    }
}

/**
 * Injected script에 로그아웃 요청 전송
 * 토큰 캐시 및 세션 데이터를 초기화합니다.
 */
export async function sendLogoutToInjectedScript(): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
        const id = requestIdManager.generateId();
        const timeout = INJECTED_CONFIG.REQUEST_TIMEOUT;
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
            logger.warn('LOGOUT 타임아웃', { id });
            // 타임아웃이어도 성공으로 처리 (injected script가 없을 수 있음)
            resolve({ success: true });
        }, timeout);

        // 응답 리스너
        messageListener = (event: MessageEvent) => {
            if (!isInjectedScriptResponse(event, id)) {
                return;
            }

            cleanup();

            const response = event.data as InjectedScriptResponse;
            if (response.error) {
                logger.warn('LOGOUT 응답 에러', { error: response.error });
                // 에러가 있어도 성공으로 처리
                resolve({ success: true });
            } else {
                logger.info('✅ Injected script 로그아웃 완료');
                resolve(response.result as { success: boolean });
            }
        };

        window.addEventListener('message', messageListener);

        // 메시지 전송
        try {
            window.postMessage(
                {
                    source: 'CONTENT_SCRIPT',
                    method: 'LOGOUT',
                    payload: { id },
                },
                '*'
            );

            logger.info('🚪 LOGOUT 요청 전송', { id });
        } catch (error) {
            cleanup();
            logger.warn('LOGOUT 메시지 전송 실패', { error: String(error) });
            // 전송 실패해도 성공으로 처리
            resolve({ success: true });
        }
    });
}

/**
 * 이벤트 로그 조회 (eth_getLogs)
 * @param params - 로그 필터 파라미터
 * @returns 로그 배열
 */
export interface GetLogsParams {
    address?: string | string[];
    topics?: (string | string[] | null)[];
    fromBlock?: string | 'latest' | 'earliest' | 'pending';
    toBlock?: string | 'latest' | 'earliest' | 'pending';
}

export async function getLogs(params: GetLogsParams): Promise<TransactionLog[]> {
    const result = await sendEthereumRequest<TransactionLog[]>('eth_getLogs', [params]);
    return result;
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
    getBlockNumber,
    getBlock,
    getBlockTimestamp,
    getTransactionReceipt,
    waitForTransaction,
    revokePermissions,
    getNextFData,
    sendLogoutToInjectedScript,
    getLogs,
} as const;

// 타입 export
export { ERROR_CODES, InjectedScriptError as InjectedScriptErrorClass } from './injected/types';
export type { InjectedScriptError, InjectedScriptResponse, SignMessageParams, TransactionParams };

