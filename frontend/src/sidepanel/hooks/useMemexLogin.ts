/**
 * MEMEX 로그인 상태 관리 훅
 *
 * 앱 시작 시 sessionStorage.gtm_user_identifier를 확인하여 로그인 상태를 판단합니다.
 */

import { useAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import { backgroundApi } from '../../contents/lib/backgroundApi';
import {
    isMemexLoggedInAtom,
    isMemexLoggingInAtom,
    memexUsernameAtom,
    memexUserTagAtom,
} from '../atoms/walletAtoms';

export interface UseMemexLoginReturn {
    isLoggedIn: boolean;
    isLoggingIn: boolean;
    username: string | null;
    userTag: string | null;
    checkLoginStatus: () => Promise<boolean>;
    setLoggedIn: (value: boolean) => void;
    setLoggingIn: (value: boolean) => void;
}

export function useMemexLogin(): UseMemexLoginReturn {
    const [isLoggedIn, setIsLoggedIn] = useAtom(isMemexLoggedInAtom);
    const [isLoggingIn, setIsLoggingIn] = useAtom(isMemexLoggingInAtom);
    const [username, setUsername] = useAtom(memexUsernameAtom);
    const [userTag, setUserTag] = useAtom(memexUserTagAtom);

    // MEMEX 로그인 상태 확인 함수
    const checkLoginStatus = useCallback(async () => {
        try {
            const result = await backgroundApi.memexLogin() as {
                success: boolean;
                isLoggedIn?: boolean;
                username?: string;
                userTag?: string;
            };
            console.log('🔐 [useMemexLogin] checkLoginStatus 결과:', result);

            if (result?.isLoggedIn) {
                setIsLoggedIn(true);
                if (result.username) setUsername(result.username);
                if (result.userTag) setUserTag(result.userTag);
                return true;
            }

            setIsLoggedIn(false);
            setUsername(null);
            setUserTag(null);
            return false;
        } catch (err) {
            console.error('❌ [useMemexLogin] 로그인 상태 확인 실패:', err);
            setIsLoggedIn(false);
            setUsername(null);
            setUserTag(null);
            return false;
        }
    }, [setIsLoggedIn, setUsername, setUserTag]);

    // 앱 시작 시 로그인 상태 확인
    useEffect(() => {
        checkLoginStatus();
    }, [checkLoginStatus]);

    return {
        isLoggedIn,
        isLoggingIn,
        username,
        userTag,
        checkLoginStatus,
        setLoggedIn: setIsLoggedIn,
        setLoggingIn: setIsLoggingIn,
    };
}
