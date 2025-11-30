/**
 * Injected Script 통신 관련 타입 정의
 */

/**
 * 메시지 소스 식별자
 */
export const MESSAGE_SOURCE = {
    CONTENT_SCRIPT: 'CONTENT_SCRIPT',
    INJECTED_SCRIPT_RESPONSE: 'INJECTED_SCRIPT_RESPONSE',
    INJECTED_SCRIPT_READY: 'INJECTED_SCRIPT_READY',
    ACCOUNTS_CHANGED: 'ACCOUNTS_CHANGED',
    CHAIN_CHANGED: 'CHAIN_CHANGED',
    TOKEN_CONTRACT_CACHED: 'TOKEN_CONTRACT_CACHED',
} as const;

export type MessageSource = typeof MESSAGE_SOURCE[keyof typeof MESSAGE_SOURCE];

/**
 * Ethereum RPC 메서드 타입
 */
export type EthereumMethod =
    | 'eth_requestAccounts'
    | 'eth_accounts'
    | 'eth_chainId'
    | 'eth_sendTransaction'
    | 'personal_sign'
    | 'eth_sign'
    | 'eth_signTypedData'
    | 'eth_getBalance'
    | 'eth_call'
    | string; // 확장성을 위해 string도 허용

/**
 * Content Script에서 Injected Script로 보내는 메시지
 */
export interface ContentScriptMessage {
    source: typeof MESSAGE_SOURCE.CONTENT_SCRIPT;
    method: 'ETH_REQUEST';
    payload: {
        id: string;
        method: EthereumMethod;
        params: unknown[];
    };
}

/**
 * Injected Script에서 Content Script로 보내는 응답 메시지
 */
export interface InjectedScriptResponse {
    source: typeof MESSAGE_SOURCE.INJECTED_SCRIPT_RESPONSE;
    id: string;
    result?: unknown;
    error?: string;
    errorCode?: number | string;
}

/**
 * Injected Script 준비 완료 메시지
 */
export interface InjectedScriptReadyMessage {
    source: typeof MESSAGE_SOURCE.INJECTED_SCRIPT_READY;
}

/**
 * 계정 변경 메시지
 */
export interface AccountsChangedMessage {
    source: typeof MESSAGE_SOURCE.ACCOUNTS_CHANGED;
    accounts: string[];
}

/**
 * 체인 변경 메시지
 */
export interface ChainChangedMessage {
    source: typeof MESSAGE_SOURCE.CHAIN_CHANGED;
    chainId: string;
}

/**
 * 토큰 컨트랙트 캐시됨 메시지
 */
export interface TokenContractCachedMessage {
    source: typeof MESSAGE_SOURCE.TOKEN_CONTRACT_CACHED;
    data: {
        id: string;
        contractAddress: string;
        username: string;
        userTag: string;
        timestamp: number;
    };
}

/**
 * 모든 메시지 타입의 유니온
 */
export type InjectedMessage =
    | ContentScriptMessage
    | InjectedScriptResponse
    | InjectedScriptReadyMessage
    | AccountsChangedMessage
    | ChainChangedMessage
    | TokenContractCachedMessage;

/**
 * 트랜잭션 파라미터
 */
export interface TransactionParams {
    from: string;
    to?: string;
    value?: string;
    data?: string;
    gas?: string;
    gasPrice?: string;
    gasLimit?: string;
    nonce?: string;
    chainId?: string;
}

/**
 * 서명 파라미터
 */
export interface SignMessageParams {
    message: string;
    address: string;
}

/**
 * 에러 타입
 */
export class InjectedScriptError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly originalError?: unknown
    ) {
        super(message);
        this.name = 'InjectedScriptError';
    }
}

/**
 * 에러 코드 상수
 */
export const ERROR_CODES = {
    TIMEOUT: 'TIMEOUT',
    PROVIDER_NOT_AVAILABLE: 'PROVIDER_NOT_AVAILABLE',
    USER_REJECTED: 'USER_REJECTED',
    INVALID_MESSAGE: 'INVALID_MESSAGE',
    SCRIPT_NOT_READY: 'SCRIPT_NOT_READY',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

