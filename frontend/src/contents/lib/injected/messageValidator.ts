/**
 * 메시지 검증 유틸리티
 */

import type { InjectedMessage } from './types';
import { MESSAGE_SOURCE } from './types';

/**
 * MessageEvent가 유효한 InjectedMessage인지 검증
 */
export function isValidInjectedMessage(event: MessageEvent): event is MessageEvent<InjectedMessage> {
    if (!event.data || typeof event.data !== 'object') {
        return false;
    }

    const data = event.data as Partial<InjectedMessage>;

    // source 필드가 필수
    if (!data.source || typeof data.source !== 'string') {
        return false;
    }

    // 알려진 source인지 확인
    const validSources: string[] = Object.values(MESSAGE_SOURCE);
    if (!validSources.includes(data.source)) {
        return false;
    }

    return true;
}

/**
 * Content Script 메시지인지 검증
 */
export function isContentScriptMessage(
    event: MessageEvent
): event is MessageEvent<{ source: typeof MESSAGE_SOURCE.CONTENT_SCRIPT }> {
    return (
        isValidInjectedMessage(event) &&
        event.data.source === MESSAGE_SOURCE.CONTENT_SCRIPT &&
        event.source === window
    );
}

/**
 * Injected Script 응답 메시지인지 검증
 */
export function isInjectedScriptResponse(
    event: MessageEvent,
    expectedId?: string
): event is MessageEvent<{ source: typeof MESSAGE_SOURCE.INJECTED_SCRIPT_RESPONSE; id: string }> {
    if (!isValidInjectedMessage(event)) {
        return false;
    }

    if (event.data.source !== MESSAGE_SOURCE.INJECTED_SCRIPT_RESPONSE) {
        return false;
    }

    const response = event.data as { id?: string };
    if (expectedId && response.id !== expectedId) {
        return false;
    }

    return true;
}

/**
 * Injected Script 준비 메시지인지 검증
 */
export function isInjectedScriptReadyMessage(
    event: MessageEvent
): event is MessageEvent<{ source: typeof MESSAGE_SOURCE.INJECTED_SCRIPT_READY }> {
    return (
        isValidInjectedMessage(event) &&
        event.data.source === MESSAGE_SOURCE.INJECTED_SCRIPT_READY
    );
}

/**
 * 계정 변경 메시지인지 검증
 */
export function isAccountsChangedMessage(
    event: MessageEvent
): event is MessageEvent<{ source: typeof MESSAGE_SOURCE.ACCOUNTS_CHANGED; accounts: string[] }> {
    return (
        isValidInjectedMessage(event) &&
        event.data.source === MESSAGE_SOURCE.ACCOUNTS_CHANGED &&
        Array.isArray((event.data as any).accounts)
    );
}

/**
 * 체인 변경 메시지인지 검증
 */
export function isChainChangedMessage(
    event: MessageEvent
): event is MessageEvent<{ source: typeof MESSAGE_SOURCE.CHAIN_CHANGED; chainId: string }> {
    return (
        isValidInjectedMessage(event) &&
        event.data.source === MESSAGE_SOURCE.CHAIN_CHANGED &&
        typeof (event.data as any).chainId === 'string'
    );
}

/**
 * 토큰 컨트랙트 캐시됨 메시지인지 검증
 */
export function isTokenContractCachedMessage(
    event: MessageEvent
): event is MessageEvent<{
    source: typeof MESSAGE_SOURCE.TOKEN_CONTRACT_CACHED;
    data: {
        id: string;
        contractAddress: string;
        username: string;
        userTag: string;
        timestamp: number;
    };
}> {
    return (
        isValidInjectedMessage(event) &&
        event.data.source === MESSAGE_SOURCE.TOKEN_CONTRACT_CACHED &&
        typeof (event.data as any).data === 'object' &&
        typeof (event.data as any).data?.username === 'string' &&
        typeof (event.data as any).data?.userTag === 'string'
    );
}

