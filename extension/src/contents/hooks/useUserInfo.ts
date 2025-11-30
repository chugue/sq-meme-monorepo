/**
 * 사용자 정보 훅
 * 
 * 웹페이지의 sessionStorage에서 사용자 정보를 읽어와
 * Chrome Extension의 chrome.storage에 저장하고 전역 상태로 관리
 */

import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { isUserInfoLoadingAtom, userInfoAtom, userInfoErrorAtom } from '../atoms/userAtoms';
import { getUserInfoFromChromeStorage, saveUserInfoToChromeStorage } from '../lib/chromeStorage';
import { logger } from '../lib/injected/logger';
import { waitForInjectedScript } from '../lib/injectedApi';
import { getUserInfoFromSessionStorage } from '../lib/sessionStorage';

/**
 * 사용자 정보 훅
 */
export function useUserInfo() {
    const [userInfo, setUserInfo] = useAtom(userInfoAtom);
    const [isLoading, setIsLoading] = useAtom(isUserInfoLoadingAtom);
    const [error, setError] = useAtom(userInfoErrorAtom);

    /**
     * 사용자 정보 로드 (내 정보)
     * 
     * 우선순위:
     * 1. chrome.storage.session에서 읽기 (내 정보)
     * 2. sessionStorage에서 읽기
     * 
     * 참고: fetchUserInfo는 별도 함수로 다른 유저 정보도 가져올 수 있음
     */
    const loadUserInfo = async () => {
        try {
            setIsLoading(true);
            setError(null);
            logger.debug('🦑 loadUserInfo 시작 (내 정보)');

            // 1. Chrome Storage에서 사용자 정보 읽기 시도 (내 정보)
            let info = await getUserInfoFromChromeStorage();

            if (info) {
                logger.info('chrome.storage에서 사용자 정보 로드 완료', { username: info.username, user_tag: info.user_tag });
                setUserInfo(info);
                return;
            }

            // 2. 웹페이지의 sessionStorage에서 읽기
            logger.info('chrome.storage에 데이터 없음, 웹페이지 sessionStorage에서 읽기 시도');

            // Injected script 준비 대기
            const isReady = await waitForInjectedScript(3000);
            if (!isReady) {
                logger.warn('Injected script가 준비되지 않아 sessionStorage 읽기 불가');
                setUserInfo(null);
                return;
            }

            const sessionStorageData = await getUserInfoFromSessionStorage();

            if (sessionStorageData) {
                logger.info(`웹페이지 sessionStorage에서 사용자 정보 읽기 성공, chrome.storage에 저장 ${sessionStorageData.username} ${sessionStorageData.user_tag}`);
                // chrome.storage에 저장 (내 정보)
                await saveUserInfoToChromeStorage(sessionStorageData);
                setUserInfo(sessionStorageData);
                return;
            }

            logger.warn('모든 저장소에서 사용자 정보를 찾을 수 없음');
            setUserInfo(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            logger.error('사용자 정보 로드 실패', err);
            setUserInfo(null);
        } finally {
            setIsLoading(false);
        }
    };

    // 초기 로드
    useEffect(() => {
        loadUserInfo();
    }, []);

    return {
        userInfo,
        isLoading,
        error,
        refetch: loadUserInfo,
    };
}

