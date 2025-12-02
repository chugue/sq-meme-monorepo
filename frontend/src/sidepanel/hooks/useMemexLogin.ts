/**
 * MEMEX 로그인 상태 관리 훅
 *
 * 앱 시작 시 sessionStorage.gtm_user_identifier를 확인하여 로그인 상태를 판단합니다.
 */

import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';
import { backgroundApi } from '../../contents/lib/backgroundApi';
import {
    getUserInfoFromChromeStorage,
    saveUserInfoToChromeStorage,
} from '../../contents/lib/chromeStorage';

// 모듈 레벨에서 중복 요청 방지 (Strict Mode에서도 유지됨)
let joinRequestInProgress = false;
import {
    resetSessionAtom,
    sessionAtom,
    setLoggingInAtom,
    setMemexLoggedInAtom,
    setMemexProfileInfoAtom,
    setUserAtom,
} from '../atoms/sessionAtoms';

export interface UseMemexLoginReturn {
    isLoggedIn: boolean;
    isLoggingIn: boolean;
    username: string | null;
    userTag: string | null;
    profileImageUrl: string | null;
    tokenSymbol: string | null;
    checkLoginStatus: () => Promise<boolean>;
    logout: () => Promise<void>;
    setLoggedIn: (value: boolean) => void;
    setLoggingIn: (value: boolean) => void;
}

export function useMemexLogin(): UseMemexLoginReturn {
    const session = useAtomValue(sessionAtom);
    const setMemexLoggedIn = useSetAtom(setMemexLoggedInAtom);
    const setMemexProfileInfo = useSetAtom(setMemexProfileInfoAtom);
    const setLoggingIn = useSetAtom(setLoggingInAtom);
    const setUser = useSetAtom(setUserAtom);
    const resetSession = useSetAtom(resetSessionAtom);

    // Join 요청 중복 방지 (useRef 대신 모듈 레벨 변수 사용)
    const initialCheckDone = useRef(false);

    const {
        isMemexLoggedIn: isLoggedIn,
        isLoggingIn,
        memexUsername: username,
        memexUserTag: userTag,
        memexProfileImage: profileImageUrl,
        walletAddress,
        // 프로필 정보 (토큰 관련)
        memexWalletAddress,
        myTokenAddr,
        myTokenSymbol,
        // 백엔드 유저 정보 (이미 Join 완료 여부 확인용)
        user,
    } = session;

    // Join 요청 보내기 (호출 시점의 session 값 사용)
    const sendJoinRequest = useCallback(async () => {
        // 이미 요청 중이면 스킵
        if (joinRequestInProgress) {
            console.log('🚀 [useMemexLogin] Join 요청 진행 중, 스킵');
            return;
        }

        joinRequestInProgress = true;

        try {
            const response = await backgroundApi.join({
                username: username!,
                userTag: userTag!,
                walletAddress: walletAddress!,
                profileImageUrl: profileImageUrl!,
                memeXLink: `https://app.memex.xyz/profile/${username}/${userTag}`,
                myTokenAddr: myTokenAddr!,
                myTokenSymbol: myTokenSymbol!,
                memexWalletAddress: memexWalletAddress!,
                isPolicyAgreed: true,
            });

            setUser(response.user);
            console.log('✅ [useMemexLogin] Join 요청 성공, User 저장:', response.user);
        } catch (joinErr) {
            console.warn('⚠️ [useMemexLogin] Join 요청 실패:', joinErr);
            joinRequestInProgress = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setUser]);

    // 프로필 정보 가져오기 (sessionStore에 저장만 함)
    const fetchProfileInfo = useCallback(async (uname: string, utag: string) => {
        try {
            console.log('🖼️ [useMemexLogin] 프로필 정보 가져오기 시작:', { uname, utag });

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

            // 4. 프로필 정보를 sessionStore에 저장
            setMemexProfileInfo({
                profileImage: imageUrl,
                myTokenAddr: tokenAddr,
                myTokenSymbol: tokenSymbol,
                memexWalletAddress: memexWallet,
            });

            // 5. MEMEX 로그인 상태 업데이트
            setMemexLoggedIn({
                isLoggedIn: true,
                username: uname,
                userTag: utag,
                profileImage: imageUrl,
            });

            console.log('✅ [useMemexLogin] 프로필 정보 sessionStore 저장 완료');
        } catch (err) {
            console.error('❌ [useMemexLogin] 프로필 정보 가져오기 실패:', err);
        }
    }, [setMemexLoggedIn, setMemexProfileInfo]);

    // MEMEX 로그인 상태 확인 함수
    const checkLoginStatus = useCallback(async () => {
        try {
            // 1. chrome.storage.session에서 캐시 먼저 확인
            const cachedUserInfo = await getUserInfoFromChromeStorage();

            if (cachedUserInfo) {
                console.log('🔐 [useMemexLogin] 캐시된 사용자 정보 발견:', cachedUserInfo);

                // 캐시된 기본 정보로 상태 업데이트
                setMemexLoggedIn({
                    isLoggedIn: true,
                    username: cachedUserInfo.username,
                    userTag: cachedUserInfo.user_tag,
                });

                // 프로필 정보 가져오기 (이미지, 토큰 등)
                await fetchProfileInfo(cachedUserInfo.username, cachedUserInfo.user_tag);
                return true;
            }

            // 2. 캐시 없으면 기존 로직 (backgroundApi.memexLogin)
            const result = await backgroundApi.memexLogin() as {
                success: boolean;
                isLoggedIn?: boolean;
                username?: string;
                userTag?: string;
            };
            console.log('🔐 [useMemexLogin] checkLoginStatus 결과:', result, 'walletAddress:', walletAddress);

            if (result?.isLoggedIn && result.username && result.userTag) {
                // MEMEX 로그인 상태 업데이트
                setMemexLoggedIn({
                    isLoggedIn: true,
                    username: result.username,
                    userTag: result.userTag,
                });

                // 3. chrome.storage에 캐시 저장
                await saveUserInfoToChromeStorage({
                    username: result.username,
                    user_tag: result.userTag,
                });

                // walletAddress가 없으면 프로필 정보만 가져오기 (Join 요청은 useEffect에서 자동으로)
                if (!walletAddress) {
                    console.warn('⚠️ [useMemexLogin] walletAddress 없음, 프로필 정보만 가져옴');
                }

                // 프로필 정보 가져오기 (sessionStore에 저장)
                await fetchProfileInfo(result.username, result.userTag);
                return true;
            }

            setMemexLoggedIn({ isLoggedIn: false });
            return false;
        } catch (err) {
            console.error('❌ [useMemexLogin] 로그인 상태 확인 실패:', err);
            setMemexLoggedIn({ isLoggedIn: false });
            return false;
        }
    }, [setMemexLoggedIn, fetchProfileInfo, walletAddress]);

    // 로그아웃 함수
    const logout = useCallback(async () => {
        try {
            console.log('🚪 [useMemexLogin] 로그아웃 시작');

            // 1. Extension storage 초기화 (gtm_user_identifier 및 지갑 정보 삭제)
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

    // 앱 시작 시 로그인 상태 확인 (마운트 시 한 번만)
    useEffect(() => {
        if (initialCheckDone.current) {
            return;
        }
        initialCheckDone.current = true;
        checkLoginStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // sessionStore의 모든 필수 데이터가 준비되면 자동으로 Join 요청
    useEffect(() => {
        // 이미 User 정보가 있거나 요청 중이면 스킵
        if (user || joinRequestInProgress) {
            return;
        }

        // 모든 필수 데이터가 있는지 확인
        const allDataReady = isLoggedIn &&
            username &&
            userTag &&
            walletAddress &&
            profileImageUrl &&
            myTokenAddr &&
            myTokenSymbol &&
            memexWalletAddress;

        if (allDataReady) {
            console.log('✅ [useMemexLogin] 모든 데이터 준비됨, Join 요청 시작');
            sendJoinRequest();
        }
    }, [user, isLoggedIn, username, userTag, walletAddress, profileImageUrl, myTokenAddr, myTokenSymbol, memexWalletAddress, sendJoinRequest]);

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
        tokenSymbol: myTokenSymbol,
        checkLoginStatus,
        logout,
        setLoggedIn: handleSetLoggedIn,
        setLoggingIn,
    };
}
