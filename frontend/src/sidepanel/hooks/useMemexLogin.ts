/**
 * MEMEX 로그인 상태 관리 훅
 *
 * 앱 시작 시 sessionStorage.gtm_user_identifier를 확인하여 로그인 상태를 판단합니다.
 */

import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import { backgroundApi } from '../../contents/lib/backgroundApi';
import {
    resetSessionAtom,
    sessionAtom,
    setLoggingInAtom,
    setMemexLoggedInAtom,
    setUserAtom,
} from '../atoms/sessionAtoms';

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
    const session = useAtomValue(sessionAtom);
    const setMemexLoggedIn = useSetAtom(setMemexLoggedInAtom);
    const setLoggingIn = useSetAtom(setLoggingInAtom);
    const setUser = useSetAtom(setUserAtom);
    const resetSession = useSetAtom(resetSessionAtom);

    const {
        isMemexLoggedIn: isLoggedIn,
        isLoggingIn,
        memexUsername: username,
        memexUserTag: userTag,
        memexProfileImage: profileImageUrl,
        walletAddress,
    } = session;

    // 프로필 정보 가져오기 및 Join 요청
    const fetchProfileAndJoin = useCallback(async (uname: string, utag: string) => {
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

            console.log('🖼️ [useMemexLogin] 프로필 정보:', { imageUrl, tokenAddr, tokenSymbol, memexWallet });

            // 4. Join 요청 (백엔드에 사용자 등록) 및 User 상태 저장
            if (walletAddress) {
                console.log('🚀 [useMemexLogin] Join 요청 시작');
                try {
                    const response = await backgroundApi.join({
                        username: uname,
                        userTag: utag,
                        walletAddress,
                        profileImageUrl: imageUrl || '',
                        memeXLink,
                        myTokenAddr: tokenAddr,
                        myTokenSymbol: tokenSymbol,
                        memexWalletAddress: memexWallet,
                        isPolicyAgreed: true,
                    });

                    // User 정보를 세션에 저장
                    setUser(response.user);
                    console.log('✅ [useMemexLogin] Join 요청 성공, User 저장:', response.user);
                } catch (joinErr) {
                    console.warn('⚠️ [useMemexLogin] Join 요청 실패:', joinErr);
                }
            }

            // MEMEX 로그인 상태 업데이트 (프로필 이미지 포함)
            setMemexLoggedIn({
                isLoggedIn: true,
                username: uname,
                userTag: utag,
                profileImage: imageUrl,
            });
        } catch (err) {
            console.error('❌ [useMemexLogin] 프로필 정보 가져오기 실패:', err);
        }
    }, [walletAddress, setMemexLoggedIn, setUser]);

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

            if (result?.isLoggedIn && result.username && result.userTag) {
                // 로그인 성공 시 프로필 정보 가져오기 및 Join 요청
                await fetchProfileAndJoin(result.username, result.userTag);
                return true;
            }

            setMemexLoggedIn({ isLoggedIn: false });
            return false;
        } catch (err) {
            console.error('❌ [useMemexLogin] 로그인 상태 확인 실패:', err);
            setMemexLoggedIn({ isLoggedIn: false });
            return false;
        }
    }, [setMemexLoggedIn, fetchProfileAndJoin]);

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

            // 3. 전체 세션 초기화
            resetSession();

            console.log('✅ [useMemexLogin] 로그아웃 완료');
        } catch (err) {
            console.error('❌ [useMemexLogin] 로그아웃 실패:', err);
        }
    }, [resetSession]);

    // 앱 시작 시 로그인 상태 확인
    useEffect(() => {
        checkLoginStatus();
    }, [checkLoginStatus]);

    // setLoggedIn 래퍼 함수
    const handleSetLoggedIn = useCallback((value: boolean) => {
        setMemexLoggedIn({ isLoggedIn: value });
    }, [setMemexLoggedIn]);

    return {
        isLoggedIn,
        isLoggingIn,
        username,
        userTag,
        profileImageUrl,
        checkLoginStatus,
        logout,
        setLoggedIn: handleSetLoggedIn,
        setLoggingIn,
    };
}
