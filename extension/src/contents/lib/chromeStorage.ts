/**
 * Chrome Storage 접근 유틸리티
 * 
 * Background Script를 통해 chrome.storage API에 접근
 * 웹페이지의 sessionStorage에서 데이터를 가져와서 chrome.storage에 저장
 */

import type { UserInfo } from '../atoms/userAtoms';
import { backgroundApi } from './backgroundApi';
import { logger } from './injected/logger';

const GTM_USER_IDENTIFIER_KEY = 'gtm_user_identifier';

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

