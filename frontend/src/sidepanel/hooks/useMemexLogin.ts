/**
 * MEMEX 로그인 상태 관리 훅
 *
 * 앱 시작 시 sessionStorage.gtm_user_identifier를 확인하여 로그인 상태를 판단합니다.
 */

import { User } from "@/types/response.types";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";
import { backgroundApi } from "../../contents/lib/backgroundApi";
import { clearAllSessionStorage, removeStorage } from "../lib/sessionStorage";

// 모듈 레벨에서 중복 요청 방지 (Strict Mode에서도 유지됨)
let joinRequestInProgress = false;

import { LOGIN_CHECK_COMPLETED_KEY, SESSION_STATE_KEY } from "@/shared/config/constants";
import {
    loginCheckCompletedAtom,
    resetSessionAtom,
    sessionAtom,
    setLoggingInAtom,
    setLoginCheckCompletedAtom,
    setMemexLoggedInAtom,
    setMemexLoginWithProfileAtom,
    setUserAtom,
} from "../atoms/sessionAtoms";

export interface TryLoginOptions {
    walletAddress?: string;
    onSuccess?: (username: string, userTag: string) => void;
    onRefetch?: () => Promise<unknown>;
}

export interface UseMemexLoginReturn {
    isLoggedIn: boolean;
    isLoggingIn: boolean;
    username: string | null;
    userTag: string | null;
    profileImageUrl: string | null;
    tokenSymbol: string | null;
    checkLoginStatus: () => Promise<boolean>;
    logout: () => Promise<void>;
    setLoggedIn: (value: boolean, username?: string, userTag?: string) => void;
    setLoggingIn: (value: boolean) => void;
    setUser: (user: User | null) => void;
    tryLoginWithCachedUserInfo: (cachedUserInfo: { username: string; user_tag: string }, options?: TryLoginOptions) => Promise<boolean>;
}

export function useMemexLogin(): UseMemexLoginReturn {
    const session = useAtomValue(sessionAtom);
    const loginCheckCompleted = useAtomValue(loginCheckCompletedAtom);
    const setMemexLoggedIn = useSetAtom(setMemexLoggedInAtom);
    const setMemexLoginWithProfile = useSetAtom(setMemexLoginWithProfileAtom);
    const setLoggingIn = useSetAtom(setLoggingInAtom);
    const setUser = useSetAtom(setUserAtom);
    const resetSession = useSetAtom(resetSessionAtom);
    const setLoginCheckCompleted = useSetAtom(setLoginCheckCompletedAtom);

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
            console.log("🚀 [useMemexLogin] Join 요청 진행 중, 스킵");
            return;
        }

        joinRequestInProgress = true;

        const TEST_JIWHAANG = "0x0c42bcf0041995fbde65f0a617259cacc8a6cb62";
        const TEST_MIN = "0xdc52a1590982eb5fb784471dfe4c1e7ccee6533c";

        // 테스트 유저인 경우 해당 테스트 지갑 주소 사용
        const lowerUsername = username?.toLowerCase();
        let finalWalletAddress = walletAddress!;
        if (lowerUsername === "squidmeme") {
            finalWalletAddress = TEST_MIN;
        } else if (lowerUsername === "jrbr7282") {
            finalWalletAddress = TEST_JIWHAANG;
        }

        try {
            const response = await backgroundApi.join({
                username: username!,
                userTag: userTag!,
                walletAddress: finalWalletAddress,
                profileImageUrl: profileImageUrl!,
                memeXLink: `https://app.memex.xyz/profile/${username}/${userTag}`,
                myTokenAddr: myTokenAddr!,
                myTokenSymbol: myTokenSymbol!,
                memexWalletAddress: memexWalletAddress!,
                isPolicyAgreed: true,
            });

            setUser(response.user);
            console.log("✅ [useMemexLogin] Join 요청 성공, User 저장:", response.user);
        } catch (joinErr) {
            console.warn("⚠️ [useMemexLogin] Join 요청 실패:", joinErr);
            joinRequestInProgress = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setUser]);

    // MEMEX 로그인 상태 확인 함수
    // gtm_user_identifier에서 username/userTag를 찾으면 바로 백엔드에서 user 정보 조회
    const checkLoginStatus = useCallback(async () => {
        try {
            // Memex 웹사이트의 gtm_user_identifier에서 로그인 정보 확인
            const result = (await backgroundApi.memexLogin()) as {
                success: boolean;
                isLoggedIn?: boolean;
                username?: string;
                userTag?: string;
            };
            console.log("🔐 [useMemexLogin] checkLoginStatus 결과:", result);

            if (result?.isLoggedIn && result.username && result.userTag) {
                // 백엔드에서 사용자 정보 조회 (출석 체크 포함)
                try {
                    const userResult = await backgroundApi.getUserByUsername(result.username, result.userTag);

                    if (userResult.user) {
                        // 백엔드에서 받은 user 데이터로 상태 설정
                        setUser(userResult.user);
                        setMemexLoginWithProfile({
                            isLoggedIn: true,
                            username: userResult.user.userName,
                            userTag: userResult.user.userTag,
                            profileImage: userResult.user.profileImage,
                        });
                        console.log("✅ [useMemexLogin] 백엔드에서 사용자 정보 조회 완료:", userResult.user);
                        return true;
                    }
                } catch (userErr) {
                    console.warn("⚠️ [useMemexLogin] 사용자 정보 조회 실패:", userErr);
                }

                // 백엔드에 유저가 없으면 (신규 사용자) 임시로 username/userTag만 저장
                // Join은 나중에 모든 데이터가 준비되면 자동으로 실행됨
                setMemexLoginWithProfile({
                    isLoggedIn: false,
                    username: result.username,
                    userTag: result.userTag,
                });
                return false;
            }

            setMemexLoginWithProfile({ isLoggedIn: false });
            return false;
        } catch (err) {
            console.error("❌ [useMemexLogin] 로그인 상태 확인 실패:", err);
            setMemexLoginWithProfile({ isLoggedIn: false });
            return false;
        }
    }, [setMemexLoginWithProfile, setUser]);

    // 로그아웃 함수
    const logout = useCallback(async () => {
        try {
            console.log("🚪 [useMemexLogin] 로그아웃 시작");

            // 1. Extension storage 초기화 (gtm_user_identifier 및 지갑 정보 삭제)
            await backgroundApi.logout();

            // 2. MetaMask 지갑 연결 해제
            try {
                await backgroundApi.walletDisconnect();
                console.log("✅ [useMemexLogin] 지갑 연결 해제 완료");
            } catch (walletErr) {
                console.warn("⚠️ [useMemexLogin] 지갑 연결 해제 실패 (무시):", walletErr);
            }

            // 3. 모든 세션 스토리지 클리어 (확실한 초기화)
            try {
                await clearAllSessionStorage();
                console.log("✅ [useMemexLogin] 모든 세션 스토리지 클리어 완료");
            } catch (storageErr) {
                // 클리어 실패 시 개별 삭제 시도
                console.warn("⚠️ [useMemexLogin] 전체 클리어 실패, 개별 삭제 시도:", storageErr);
                try {
                    await removeStorage(SESSION_STATE_KEY);
                    await removeStorage(LOGIN_CHECK_COMPLETED_KEY);
                } catch (e) {
                    console.warn("⚠️ [useMemexLogin] 개별 삭제도 실패:", e);
                }
            }

            // 4. 전체 세션 초기화 (atomWithStorage가 자동으로 저장소에 반영)
            resetSession();

            console.log("✅ [useMemexLogin] 로그아웃 완료");
        } catch (err) {
            console.error("❌ [useMemexLogin] 로그아웃 실패:", err);
        }
    }, [resetSession]);

    // 앱 시작 시 로그인 상태 확인 (Jotai atomWithStorage가 자동으로 저장소에서 불러옴)
    useEffect(() => {
        // 이미 체크 완료되었으면 스킵
        if (loginCheckCompleted) {
            return;
        }

        const performCheck = async () => {
            // 기존 세션에 username/userTag가 있어도 백엔드 통신 필요 (출석 체크)
            if (username && userTag) {
                console.log("🔐 [useMemexLogin] 기존 세션 데이터로 백엔드 조회:", {
                    username,
                    userTag,
                });

                try {
                    const result = await backgroundApi.getUserByUsername(username, userTag);

                    if (result.user) {
                        setUser(result.user);
                        setMemexLoggedIn({
                            isLoggedIn: true,
                            username: result.user.userName,
                            userTag: result.user.userTag,
                            profileImage: result.user.profileImage,
                        });
                        console.log("✅ [useMemexLogin] 기존 세션 사용자 정보 조회 완료:", result.user);
                    } else {
                        // 백엔드에 유저가 없으면 로그인 상태 false
                        setMemexLoggedIn({ isLoggedIn: false });
                    }
                } catch (err) {
                    console.warn("⚠️ [useMemexLogin] 기존 세션 사용자 정보 조회 실패:", err);
                    setMemexLoggedIn({ isLoggedIn: false });
                }
            } else {
                // username/userTag가 없으면 기존 checkLoginStatus 실행
                await checkLoginStatus();
            }

            setLoginCheckCompleted(true);
        };

        performCheck();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loginCheckCompleted, username, userTag, setLoginCheckCompleted]);

    // sessionStore의 모든 필수 데이터가 준비되면 자동으로 Join 요청
    useEffect(() => {
        // 이미 User 정보가 있거나 요청 중이면 스킵
        if (user || joinRequestInProgress) {
            return;
        }

        // 모든 필수 데이터가 있는지 확인
        const allDataReady =
            isLoggedIn && username && userTag && walletAddress && profileImageUrl && myTokenAddr && myTokenSymbol && memexWalletAddress;

        if (allDataReady) {
            console.log("✅ [useMemexLogin] 모든 데이터 준비됨, Join 요청 시작");
            sendJoinRequest();
        }
        // sendJoinRequest는 useCallback으로 메모이제이션되어 있으므로 의존성에서 제외
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isLoggedIn, username, userTag, walletAddress, profileImageUrl, myTokenAddr, myTokenSymbol, memexWalletAddress]);

    // setLoggedIn 래퍼 함수
    const handleSetLoggedIn = useCallback(
        (value: boolean, newUsername?: string, newUserTag?: string) => {
            setMemexLoggedIn({
                isLoggedIn: value,
                username: newUsername,
                userTag: newUserTag,
            });
        },
        [setMemexLoggedIn],
    );

    // GTM 키로 로그인/회원가입 시도하는 함수
    // 성공 시 true, 실패/미완료 시 false 반환
    const tryLoginWithCachedUserInfo = useCallback(
        async (cachedUserInfo: { username: string; user_tag: string }, options?: TryLoginOptions): Promise<boolean> => {
            const { walletAddress: walletAddr, onSuccess, onRefetch } = options || {};

            console.log("✅ GTM 키 발견, 백엔드에서 user 조회:", cachedUserInfo);
            setLoggingIn(true);

            try {
                // 백엔드에서 user 정보 조회
                const checkResult = (await backgroundApi.getUserByUsername(cachedUserInfo.username, cachedUserInfo.user_tag)) as {
                    user: User | null;
                };

                if (checkResult?.user) {
                    console.log("✅ MEMEX 로그인 완료:", checkResult.user.userName);
                    setUser(checkResult.user);
                    setLoggingIn(false);
                    if (onRefetch) await onRefetch();
                    if (onSuccess) onSuccess(cachedUserInfo.username, cachedUserInfo.user_tag);
                    return true;
                }

                // 백엔드에 user가 없으면 신규 사용자 - 자동 회원가입 시도
                console.log("🆕 [cachedUserInfo] 백엔드에 user 없음, 자동 회원가입 시도...");

                // 1. 프로필 정보 fetch
                const profileInfo = await backgroundApi.fetchMemexProfileInfo(cachedUserInfo.username, cachedUserInfo.user_tag);
                console.log("📋 [cachedUserInfo] 프로필 정보:", profileInfo);

                // 2. 지갑 주소 확인
                if (!walletAddr) {
                    console.warn("⚠️ [cachedUserInfo] 지갑 연결 필요");
                    setLoggingIn(false);
                    return false;
                } else if (profileInfo?.profileImageUrl && profileInfo?.tokenAddr && profileInfo?.memexWalletAddress) {
                    // 테스트 유저 지갑 주소 매핑
                    const TEST_WALLET_ADDRESSES: Record<string, Address> = {
                        squidmeme: "0xdc52a1590982eb5fb784471dfe4c1e7ccee6533c",
                        jrbr7282: "0x0c42bcf0041995fbde65f0a617259cacc8a6cb62",
                    };

                    // 테스트 유저인 경우 해당 테스트 지갑 주소 사용
                    const lowerUsername = cachedUserInfo.username?.toLowerCase();
                    let finalWalletAddress = walletAddr;
                    if (lowerUsername && TEST_WALLET_ADDRESSES[lowerUsername]) {
                        finalWalletAddress = TEST_WALLET_ADDRESSES[lowerUsername];
                    }

                    // 3. 필수 정보 확인 후 Join 요청
                    const joinResult = await backgroundApi.join({
                        username: cachedUserInfo.username,
                        userTag: cachedUserInfo.user_tag,
                        walletAddress: finalWalletAddress,
                        profileImageUrl: profileInfo.profileImageUrl,
                        memeXLink: `https://app.memex.xyz/profile/${cachedUserInfo.username}/${cachedUserInfo.user_tag}`,
                        myTokenAddr: profileInfo.tokenAddr,
                        myTokenSymbol: profileInfo.tokenSymbol || "",
                        memexWalletAddress: profileInfo.memexWalletAddress,
                        isPolicyAgreed: true,
                    });

                    if (joinResult?.user) {
                        setUser(joinResult.user);
                        console.log("✅ [cachedUserInfo] 자동 회원가입 완료:", joinResult.user.userName);
                        setLoggingIn(false);
                        if (onRefetch) await onRefetch();
                        if (onSuccess) onSuccess(cachedUserInfo.username, cachedUserInfo.user_tag);
                        return true;
                    }
                } else {
                    console.warn("⚠️ [cachedUserInfo] 프로필 정보 부족, 회원가입 불가:", {
                        profileImageUrl: profileInfo?.profileImageUrl,
                        tokenAddr: profileInfo?.tokenAddr,
                        memexWalletAddress: profileInfo?.memexWalletAddress,
                    });
                }

                // 회원가입 실패
                console.log("⚠️ [cachedUserInfo] 자동 회원가입 실패");
                setLoggingIn(false);
                return false;
            } catch (err) {
                console.error("❌ [cachedUserInfo] 처리 실패:", err);
                setLoggingIn(false);
                throw err; // 에러를 다시 던져서 호출자가 처리하도록
            }
        },
        [setLoggingIn, setUser],
    );

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
        setUser,
        tryLoginWithCachedUserInfo,
    };
}
