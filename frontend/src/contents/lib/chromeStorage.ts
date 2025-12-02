/**
 * Chrome Storage 접근 유틸리티
 *
 * Background Script를 통해 chrome.storage API에 접근
 * 웹페이지의 sessionStorage에서 데이터를 가져와서 chrome.storage에 저장
 */

import type { UserInfo } from '../atoms/userAtoms';
import type { User } from '../../types/response.types';
import { backgroundApi } from './backgroundApi';
import { logger } from './injected/logger';

// Storage Keys
const GTM_USER_IDENTIFIER_KEY = 'gtm_user_identifier';
const SQUID_USER_KEY = 'squid_user';

/**
 * Chrome Storage에서 사용자 정보 읽기
 * 
 * chrome.storage.session에서만 읽기 (Background Script를 통해)
 * API 호출이나 sessionStorage 읽기는 useUserInfo에서 처리
 */
export async function getUserInfoFromChromeStorage(): Promise<UserInfo | null> {
    try {
        // chrome.storage.session에서 읽기 시도 (Background Script를 통해)
        const sessionData = await backgroundApi.getStorage<UserInfo>(GTM_USER_IDENTIFIER_KEY, 'session');
        const parsedData = parseUserInfo(sessionData);

        if (parsedData) {
            logger.debug('chrome.storage.session에서 사용자 정보 읽기 성공');
            return parsedData;
        }

        return null;
    } catch (error) {
        logger.debug('chrome.storage.session 읽기 실패', { error });
        return null;
    }
}

/**
 * 사용자 정보 파싱 및 검증
 */
function parseUserInfo(data: unknown): UserInfo | null {
    if (!data || typeof data !== 'object') {
        logger.warn('gtm_user_identifier 데이터가 없거나 형식이 올바르지 않음', { data });
        return null;
    }

    const userInfo = data as Partial<UserInfo>;

    // 타입 검증
    if (typeof userInfo.username === 'string' && typeof userInfo.user_tag === 'string') {
        return {
            username: userInfo.username,
            user_tag: userInfo.user_tag,
        };
    }

    logger.warn('gtm_user_identifier 데이터 형식이 올바르지 않음', { data });
    return null;
}

/**
 * Chrome Storage에 사용자 정보 저장
 * Background Script를 통해 저장
 */
export async function saveUserInfoToChromeStorage(userInfo: UserInfo): Promise<void> {
    try {
        await backgroundApi.setStorage(GTM_USER_IDENTIFIER_KEY, userInfo, 'session');
        logger.info('사용자 정보 저장 완료', { username: userInfo.username, user_tag: userInfo.user_tag });
    } catch (error) {
        logger.error('Chrome Storage에 사용자 정보 저장 실패', error);
        throw error;
    }
}

/**
 * Chrome Storage에서 사용자 정보 삭제
 * 로그아웃 시 캐시 정리용
 */
export async function clearUserInfoFromChromeStorage(): Promise<void> {
    try {
        await backgroundApi.removeStorage(GTM_USER_IDENTIFIER_KEY, 'session');
        logger.info('Chrome Storage 사용자 정보 삭제 완료');
    } catch (error) {
        logger.error('Chrome Storage 사용자 정보 삭제 실패', error);
    }
}

// ========================================
// Squid User (DB 저장된 전체 사용자 정보)
// ========================================

/**
 * DB에 저장된 User 정보를 chrome.storage에서 조회
 * Content Script, SidePanel 모두 사용 가능
 */
export async function getSquidUserFromStorage(): Promise<User | null> {
    try {
        const data = await backgroundApi.getStorage<User>(SQUID_USER_KEY, 'session');
        return validateSquidUser(data);
    } catch (error) {
        logger.debug('Squid User 조회 실패', { error });
        return null;
    }
}

/**
 * Join 성공 후 User 정보를 chrome.storage에 캐시
 */
export async function saveSquidUserToStorage(user: User): Promise<void> {
    try {
        await backgroundApi.setStorage(SQUID_USER_KEY, user, 'session');
        logger.info('Squid User 저장 완료', { id: user.id, userName: user.userName });
    } catch (error) {
        logger.error('Squid User 저장 실패', error);
        throw error;
    }
}

/**
 * 로그아웃 시 Squid User 캐시 삭제
 */
export async function clearSquidUserFromStorage(): Promise<void> {
    try {
        await backgroundApi.removeStorage(SQUID_USER_KEY, 'session');
        logger.info('Squid User 삭제 완료');
    } catch (error) {
        logger.error('Squid User 삭제 실패', error);
    }
}

/**
 * User 데이터 검증
 */
function validateSquidUser(data: unknown): User | null {
    if (!data || typeof data !== 'object') {
        return null;
    }

    const user = data as Partial<User>;

    // 필수 필드 검증
    if (typeof user.id === 'number' && typeof user.walletAddress === 'string') {
        return user as User;
    }

    logger.warn('Squid User 데이터 형식이 올바르지 않음', { data });
    return null;
}

