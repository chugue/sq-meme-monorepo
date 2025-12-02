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
    isWalletConnectedAtom,
    memexProfileImageAtom,
    memexUsernameAtom,
    memexUserTagAtom,
    walletAddressAtom,
} from '../atoms/walletAtoms';

export interface UseMemexLoginReturn {
    isLoggedIn: boolean;
    isLoggingIn: boolean;
    username: string | null;
    userTag: string | null;
    profileImageUrl: string | null;
    checkLoginStatus: () => Promise<boolean>;
    logout: () => Promise<void>;
    setLoggedIn: (value: boolean) => void;
    setLoggingIn: (value: boolean) => void;
}

export function useMemexLogin(): UseMemexLoginReturn {
    const [isLoggedIn, setIsLoggedIn] = useAtom(isMemexLoggedInAtom);
    const [isLoggingIn, setIsLoggingIn] = useAtom(isMemexLoggingInAtom);
    const [username, setUsername] = useAtom(memexUsernameAtom);
    const [userTag, setUserTag] = useAtom(memexUserTagAtom);
    const [profileImageUrl, setProfileImageUrl] = useAtom(memexProfileImageAtom);
    const [walletAddress, setWalletAddress] = useAtom(walletAddressAtom);
    const [, setIsWalletConnected] = useAtom(isWalletConnectedAtom);

    // 프로필 정보 가져오기 및 LogIn 요청
    const fetchProfileAndLogIn = useCallback(async (uname: string, utag: string) => {
        try {
            console.log('🖼️ [useMemexLogin] 프로필 정보 가져오기 시작:', uname, utag);

            // 1. 프로필 페이지로 이동 (DOM에서 정보를 가져오기 위해)
            const memeXLink = `https://app.memex.xyz/profile/${uname}/${utag}`;
            console.log('🖼️ [useMemexLogin] 프로필 페이지로 이동:', memeXLink);
            await backgroundApi.navigateToUrl(memeXLink);

            // 2. 페이지 로딩 대기 (DOM 렌더링 시간)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 3. 프로필 정보 가져오기 (이미지, 토큰 주소, 토큰 심볼, MEMEX 지갑 주소)
            const profileInfo = await backgroundApi.fetchMemexProfileInfo(uname, utag);
            const imageUrl = profileInfo?.profileImageUrl || null;
            const tokenAddr = profileInfo?.tokenAddr || null;
            const tokenSymbol = profileInfo?.tokenSymbol || null;
            const memexWallet = profileInfo?.memexWalletAddress || null;

            setProfileImageUrl(imageUrl);
            console.log('🖼️ [useMemexLogin] 프로필 정보:', { imageUrl, tokenAddr, tokenSymbol, memexWallet });

            // 4. LogIn 요청 (백엔드에 사용자 등록)
            if (walletAddress) {
                console.log('🚀 [useMemexLogin] LogIn 요청 시작');
                try {
                    await backgroundApi.logIn({
                        username: uname,
                        userTag: utag,
                        walletAddress,
                        profileImageUrl: imageUrl || '',
                        memeXLink,
                        myTokenAddr: tokenAddr,
                        myTokenSymbol: tokenSymbol,
                        memexWalletAddress: memexWallet,
                        isPolicyAgreed: true, // Terms 동의 후 호출되므로 true
                    });
                    console.log('✅ [useMemexLogin] LogIn 요청 성공');
                } catch (loginErr) {
                    // 백엔드 미구현 상태에서는 에러가 발생할 수 있으므로 로그만 남김
                    console.warn('⚠️ [useMemexLogin] LogIn 요청 실패 (백엔드 미구현 가능):', loginErr);
                }
            }
        } catch (err) {
            console.error('❌ [useMemexLogin] 프로필 정보 가져오기 실패:', err);
        }
    }, [setProfileImageUrl, walletAddress]);

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

                // 로그인 성공 시 프로필 이미지 가져오기 및 LogIn 요청
                if (result.username && result.userTag) {
                    fetchProfileAndLogIn(result.username, result.userTag);
                }
                return true;
            }

            setIsLoggedIn(false);
            setUsername(null);
            setUserTag(null);
            setProfileImageUrl(null);
            return false;
        } catch (err) {
            console.error('❌ [useMemexLogin] 로그인 상태 확인 실패:', err);
            setIsLoggedIn(false);
            setUsername(null);
            setUserTag(null);
            setProfileImageUrl(null);
            return false;
        }
    }, [setIsLoggedIn, setUsername, setUserTag, setProfileImageUrl, fetchProfileAndLogIn]);

    // 로그아웃 함수
    const logout = useCallback(async () => {
        try {
            console.log('🚪 [useMemexLogin] 로그아웃 시작');

            // 1. Extension storage 초기화
            await backgroundApi.logout();

            // 2. MetaMask 지갑 연결 해제
            try {
                await backgroundApi.walletDisconnect();
                console.log('✅ [useMemexLogin] 지갑 연결 해제 완료');
            } catch (walletErr) {
                console.warn('⚠️ [useMemexLogin] 지갑 연결 해제 실패 (무시):', walletErr);
            }

            // 3. 모든 상태 초기화
            setIsLoggedIn(false);
            setUsername(null);
            setUserTag(null);
            setProfileImageUrl(null);
            setWalletAddress(null);
            setIsWalletConnected(false);

            console.log('✅ [useMemexLogin] 로그아웃 완료');
        } catch (err) {
            console.error('❌ [useMemexLogin] 로그아웃 실패:', err);
        }
    }, [setIsLoggedIn, setUsername, setUserTag, setProfileImageUrl, setWalletAddress, setIsWalletConnected]);

    // 앱 시작 시 로그인 상태 확인
    useEffect(() => {
        checkLoginStatus();
    }, [checkLoginStatus]);

    return {
        isLoggedIn,
        isLoggingIn,
        username,
        userTag,
        profileImageUrl,
        checkLoginStatus,
        logout,
        setLoggedIn: setIsLoggedIn,
        setLoggingIn: setIsLoggingIn,
    };
}
