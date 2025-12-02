/**
 * Chrome Storage 접근 유틸리티
 *
 * Background Script를 통해 chrome.storage API에 접근
 */

import type { User } from '../../types/response.types';
import { backgroundApi } from './backgroundApi';
import { logger } from './injected/logger';

// Storage Keys
const GTM_USER_IDENTIFIER_KEY = 'gtm_user_identifier';
const SQUID_USER_KEY = 'squid_user';

// ========================================
// MEMEX 로그인 정보 (gtm_user_identifier)
// SidePanel의 useMemexLogin에서 사용
// ========================================

/**
 * MEMEX 로그인 정보 타입
 */
export interface MemexUserInfo {
    username: string;
    user_tag: string;
}

/**
 * MEMEX 로그인 정보 읽기 (gtm_user_identifier)
 */
export async function getMemexUserInfo(): Promise<MemexUserInfo | null> {
    try {
        const data = await backgroundApi.getStorage<MemexUserInfo>(GTM_USER_IDENTIFIER_KEY, 'session');

        if (!data || typeof data !== 'object') {
            return null;
        }

        if (typeof data.username === 'string' && typeof data.user_tag === 'string') {
            return { username: data.username, user_tag: data.user_tag };
        }

        return null;
    } catch (error) {
        logger.debug('MEMEX 로그인 정보 읽기 실패', { error });
        return null;
    }
}

/**
 * MEMEX 로그인 정보 저장 (gtm_user_identifier)
 */
export async function saveMemexUserInfo(info: MemexUserInfo): Promise<void> {
    try {
        await backgroundApi.setStorage(GTM_USER_IDENTIFIER_KEY, info, 'session');
        logger.info('MEMEX 로그인 정보 저장 완료', { username: info.username, user_tag: info.user_tag });
    } catch (error) {
        logger.error('MEMEX 로그인 정보 저장 실패', error);
        throw error;
    }
}

// ========================================
// User (DB에 저장된 전체 사용자 정보)
// Content Script, SidePanel 모두 사용
// ========================================

/**
 * User 정보 읽기 (squid_user)
 * Join 성공 후 Background Script가 저장함
 */
export async function getSquidUserFromStorage(): Promise<User | null> {
    try {
        const data = await backgroundApi.getStorage<User>(SQUID_USER_KEY, 'session');
        return validateUser(data);
    } catch (error) {
        logger.debug('User 조회 실패', { error });
        return null;
    }
}

/**
 * User 정보 저장 (squid_user)
 */
export async function saveSquidUserToStorage(user: User): Promise<void> {
    try {
        await backgroundApi.setStorage(SQUID_USER_KEY, user, 'session');
        logger.info('User 저장 완료', { id: user.id, userName: user.userName });
    } catch (error) {
        logger.error('User 저장 실패', error);
        throw error;
    }
}

/**
 * User 정보 삭제 (squid_user)
 */
export async function clearSquidUserFromStorage(): Promise<void> {
    try {
        await backgroundApi.removeStorage(SQUID_USER_KEY, 'session');
        logger.info('User 삭제 완료');
    } catch (error) {
        logger.error('User 삭제 실패', error);
    }
}

/**
 * User 데이터 검증
 */
function validateUser(data: unknown): User | null {
    if (!data || typeof data !== 'object') {
        return null;
    }

    const user = data as Partial<User>;

    // 필수 필드 검증
    if (typeof user.id === 'number' && typeof user.walletAddress === 'string') {
        return user as User;
    }

    logger.warn('User 데이터 형식이 올바르지 않음', { data });
    return null;
}
