/**
 * 사용자 정보 훅
 *
 * chrome.storage.session에서 DB에 저장된 전체 사용자 정보를 읽어옴
 * Join 성공 후 Background Script가 자동으로 저장함
 */

import { useAtom } from 'jotai';
import { useEffect } from 'react';
import type { User } from '../../types/response.types';
import {
    isUserLoadingAtom,
    userAtom,
    userErrorAtom,
} from '../atoms/userAtoms';
import { getSquidUserFromStorage } from '../lib/chromeStorage';
import { logger } from '../lib/injected/logger';

/**
 * 사용자 정보 훅
 *
 * chrome.storage.session에서 User 정보를 읽어옴
 * Join 성공 후 Background Script가 squid_user로 저장함
 */
export function useUserInfo() {
    const [user, setUser] = useAtom(userAtom);
    const [isLoading, setIsLoading] = useAtom(isUserLoadingAtom);
    const [error, setError] = useAtom(userErrorAtom);

    /**
     * 사용자 정보 로드
     * chrome.storage.session에서 squid_user 읽기
     */
    const loadUser = async (): Promise<User | null> => {
        try {
            setIsLoading(true);
            setError(null);
            logger.debug('🦑 loadUser 시작');

            const userData = await getSquidUserFromStorage();

            if (userData) {
                logger.info('User 로드 완료', { id: userData.id, userName: userData.userName });
                setUser(userData);
                return userData;
            }

            logger.debug('User 없음 (Join 필요)');
            setUser(null);
            return null;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            logger.error('User 로드 실패', err);
            setUser(null);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    // 초기 로드
    useEffect(() => {
        loadUser();
    }, []);

    return {
        user,
        isLoading,
        error,
        refetch: loadUser,
    };
}
