/**
 * SessionStorage 접근 유틸리티
 *
 * 웹페이지의 sessionStorage에 접근하기 위해 injected script를 통해야 함
 */

import type { MemexUserInfo } from './chromeStorage';
import { logger } from './injected/logger';
import { injectedApi } from './injectedApi';

const GTM_USER_IDENTIFIER_KEY = 'gtm_user_identifier';

/**
 * gtm_user_identifier에서 MEMEX 로그인 정보 읽기
 */
export async function getMemexUserInfoFromSessionStorage(): Promise<MemexUserInfo | null> {
    try {
        const data = await injectedApi.getSessionStorage(GTM_USER_IDENTIFIER_KEY);

        if (!data || typeof data !== 'object') {
            logger.warn('gtm_user_identifier 데이터가 없거나 형식이 올바르지 않음', { data });
            return null;
        }

        const userInfo = data as Partial<MemexUserInfo>;

        // 타입 검증
        if (typeof userInfo.username === 'string' && typeof userInfo.user_tag === 'string') {
            return {
                username: userInfo.username,
                user_tag: userInfo.user_tag,
            };
        }

        logger.warn('gtm_user_identifier 데이터 형식이 올바르지 않음', { data });
        return null;
    } catch (error) {
        logger.error('SessionStorage에서 사용자 정보 읽기 실패', error);
        return null;
    }
}

