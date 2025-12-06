import { User } from "@/types/response.types";
import { useState } from "react";
import { backgroundApi } from "../contents/lib/backgroundApi";
import { Snackbar, TermsModal } from "./components";
import { useMemexLogin } from "./hooks/useMemexLogin";
import { useSidepanelWallet } from "./hooks/useSidepanelWallet";
import { getMemexUserInfo } from "./lib/memexStorage";

// Assets imports
import homeBg from "@/assets/home.png";
import homeFloor from "@/assets/home_floor.png";
import moneyLogo from "@/assets/money_logo.png";
import squareBrackets from "@/assets/square_brackets.png";

// Content script 연결 오류인지 확인
function isContentScriptError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes("receiving end does not exist") ||
            message.includes("could not establish connection")
        );
    }
    return false;
}

interface ComingSoonProps {
    onMemexLoginComplete?: (username: string, userTag: string) => void;
}

export function ComingSoon({ onMemexLoginComplete }: ComingSoonProps) {
    const { isConnected, address, isLoading, error, connect, refetch } =
        useSidepanelWallet();
    const { setLoggingIn, setUser, isLoggingIn } = useMemexLogin();
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [snackbar, setSnackbar] = useState<{
        isVisible: boolean;
        message: string;
        type: "error" | "warning" | "info" | "success";
    }>({
        isVisible: false,
        message: "",
        type: "error",
    });

    const showRefreshSnackbar = () => {
        setSnackbar({
            isVisible: true,
            message: "MEMEX에서 실행해주세요",
            type: "warning",
        });
    };

    const closeSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, isVisible: false }));
    };
    const handleRefreshMemexTab = async () => {
        try {
            await backgroundApi.refreshMemexTab();
            closeSnackbar();
        } catch (err) {
            console.error("Failed to refresh MEMEX tab:", err);
        }
    };

    const handleConnect = () => {
        // 약관 동의 모달 표시
        setIsTermsModalOpen(true);
    };

    const handleCloseTermsModal = () => {
        setIsTermsModalOpen(false);
    };

    const handleAgreeTerms = async () => {
        setIsTermsModalOpen(false);
        try {
            // 1. 지갑 연결
            if (!isConnected) {
                await connect();
            }

            // 2. 지갑 연결 후 MEMEX 로그인 시작
            await handleMemexLogin();
        } catch (err) {
            console.error("Connection failed:", err);
            if (isContentScriptError(err)) {
                showRefreshSnackbar();
            }
        }
    };

    const handleMemexLogin = async () => {
        try {
            console.log("🔐 MEMEX login started...");

            // 1. GTM 키 먼저 체크
            const cachedUserInfo = await getMemexUserInfo();

            if (cachedUserInfo) {
                // GTM 키가 있으면 바로 백엔드에서 user 정보 조회
                console.log("✅ GTM 키 발견, 백엔드에서 user 조회:", cachedUserInfo);
                setLoggingIn(true);

                try {
                    // 백엔드에서 user 정보 조회
                    const checkResult = (await backgroundApi.getUserByUsername(
                        cachedUserInfo.username,
                        cachedUserInfo.user_tag
                    )) as { user: User | null };

                    if (checkResult?.user && onMemexLoginComplete) {
                        console.log("✅ MEMEX 로그인 완료:", checkResult.user.userName);
                        setUser(checkResult.user);
                        setLoggingIn(false);
                        await refetch();
                        onMemexLoginComplete(cachedUserInfo.username, cachedUserInfo.user_tag);
                        return;
                    }

                    // 백엔드에 user가 없으면 신규 사용자 - 자동 회원가입 시도
                    console.log("🆕 [cachedUserInfo] 백엔드에 user 없음, 자동 회원가입 시도...");

                    // 1. 프로필 정보 fetch
                    const profileInfo = await backgroundApi.fetchMemexProfileInfo(
                        cachedUserInfo.username,
                        cachedUserInfo.user_tag
                    );
                    console.log("📋 [cachedUserInfo] 프로필 정보:", profileInfo);

                    // 2. 지갑 주소 확인
                    if (!address) {
                        console.warn("⚠️ [cachedUserInfo] 지갑 연결 필요");
                        setLoggingIn(false);
                        // 지갑 미연결 상태에서는 memexLogin으로 계속 진행
                    } else if (profileInfo?.profileImageUrl && profileInfo?.tokenAddr && profileInfo?.memexWalletAddress) {
                        // 3. 필수 정보 확인 후 Join 요청
                        const joinResult = await backgroundApi.join({
                            username: cachedUserInfo.username,
                            userTag: cachedUserInfo.user_tag,
                            walletAddress: address,
                            profileImageUrl: profileInfo.profileImageUrl,
                            memeXLink: `https://app.memex.xyz/profile/${cachedUserInfo.username}/${cachedUserInfo.user_tag}`,
                            myTokenAddr: profileInfo.tokenAddr,
                            myTokenSymbol: profileInfo.tokenSymbol || "",
                            memexWalletAddress: profileInfo.memexWalletAddress,
                            isPolicyAgreed: true,
                        });

                        if (joinResult?.user && onMemexLoginComplete) {
                            setUser(joinResult.user);
                            console.log("✅ [cachedUserInfo] 자동 회원가입 완료:", joinResult.user.userName);
                            setLoggingIn(false);
                            await refetch();
                            onMemexLoginComplete(cachedUserInfo.username, cachedUserInfo.user_tag);
                            return;
                        }
                    } else {
                        console.warn("⚠️ [cachedUserInfo] 프로필 정보 부족, 회원가입 불가:", {
                            profileImageUrl: profileInfo?.profileImageUrl,
                            tokenAddr: profileInfo?.tokenAddr,
                            memexWalletAddress: profileInfo?.memexWalletAddress,
                        });
                    }

                    // 회원가입 실패 시 memexLogin으로 계속 진행
                    console.log("⚠️ [cachedUserInfo] 자동 회원가입 실패, memexLogin으로 계속 진행...");
                    setLoggingIn(false);
                } catch (err) {
                    console.error("❌ [cachedUserInfo] 처리 실패:", err);
                    setLoggingIn(false);
                    if (isContentScriptError(err)) {
                        showRefreshSnackbar();
                        return;
                    }
                }
            } else {
                // GTM 키가 없으면 app.memex.xyz로 이동하여 Google 로그인 버튼 클릭
                console.log("🔐 GTM 키 없음, Google 로그인 시작...");
            }

            // 2. GTM 키가 없거나, 있어도 프로필에서 로그인 확인 실패 시 Google 로그인 시도
            const result = (await backgroundApi.memexLogin(true)) as {
                success: boolean;
                isLoggedIn?: boolean;
                loginStarted?: boolean;
                username?: string;
                userTag?: string;
                error?: string;
            };
            console.log("🔐 MEMEX login result:", result);

            // Content script 연결 오류 체크 (응답에 error 필드가 있는 경우)
            if (
                result?.error &&
                (result.error.toLowerCase().includes("receiving end does not exist") ||
                    result.error.toLowerCase().includes("could not establish connection"))
            ) {
                console.log("⚠️ Content script 연결 오류, 스낵바 표시");
                showRefreshSnackbar();
                return;
            }

            // 이미 로그인되어 있으면 백엔드에서 user 정보 조회 후 완료
            if (result?.isLoggedIn && result.username && result.userTag && onMemexLoginComplete) {
                console.log("🔐 GTM 로그인 확인됨, 백엔드에서 user 정보 조회:", result.username);
                try {
                    const userResult = await backgroundApi.getUserByUsername(
                        result.username,
                        result.userTag
                    );
                    if (userResult?.user) {
                        setUser(userResult.user);
                        console.log("✅ MEMEX 로그인 완료:", userResult.user.userName);
                        setLoggingIn(false);
                        onMemexLoginComplete(result.username, result.userTag);
                        return;
                    }

                    // 백엔드에 user가 없으면 신규 사용자 - 자동 회원가입 시도
                    console.log("🆕 백엔드에 user 없음, 자동 회원가입 시도...");
                    setLoggingIn(true);

                    // 1. 프로필 정보 fetch
                    const profileInfo = await backgroundApi.fetchMemexProfileInfo(
                        result.username,
                        result.userTag
                    );
                    console.log("📋 프로필 정보:", profileInfo);

                    // 2. 지갑 주소 확인
                    if (!address) {
                        console.warn("⚠️ 지갑 연결 필요");
                        setLoggingIn(false);
                        return;
                    }

                    // 3. 필수 정보 확인 후 Join 요청
                    if (profileInfo?.profileImageUrl && profileInfo?.tokenAddr && profileInfo?.memexWalletAddress) {
                        const joinResult = await backgroundApi.join({
                            username: result.username,
                            userTag: result.userTag,
                            walletAddress: address,
                            profileImageUrl: profileInfo.profileImageUrl,
                            memeXLink: `https://app.memex.xyz/profile/${result.username}/${result.userTag}`,
                            myTokenAddr: profileInfo.tokenAddr,
                            myTokenSymbol: profileInfo.tokenSymbol || "",
                            memexWalletAddress: profileInfo.memexWalletAddress,
                            isPolicyAgreed: true,
                        });

                        if (joinResult?.user) {
                            setUser(joinResult.user);
                            console.log("✅ 자동 회원가입 완료:", joinResult.user.userName);
                            setLoggingIn(false);
                            onMemexLoginComplete(result.username, result.userTag);
                            return;
                        }
                    } else {
                        console.warn("⚠️ 프로필 정보 부족, 회원가입 불가:", {
                            profileImageUrl: profileInfo?.profileImageUrl,
                            tokenAddr: profileInfo?.tokenAddr,
                            memexWalletAddress: profileInfo?.memexWalletAddress,
                        });
                    }
                    setLoggingIn(false);
                } catch (userErr) {
                    console.warn("⚠️ User 정보 조회/회원가입 실패:", userErr);
                    setLoggingIn(false);
                }
            }

            // 로그인 시작됨 - 폴링으로 로그인 완료 확인
            if (result?.loginStarted) {
                console.log("🔐 Google 로그인 시작됨, 폴링 시작...");
                setLoggingIn(true);
                const maxWaitTime = 60000; // 60초
                const pollInterval = 2000; // 2초
                const startTime = Date.now();

                const checkLoginStatus = async (): Promise<void> => {
                    const elapsed = Date.now() - startTime;
                    if (elapsed >= maxWaitTime) {
                        console.error("❌ 로그인 타임아웃");
                        setLoggingIn(false);
                        return;
                    }

                    try {
                        const checkResult = (await backgroundApi.memexLogin()) as {
                            success: boolean;
                            isLoggedIn?: boolean;
                            username?: string;
                            userTag?: string;
                        };
                        console.log(
                            "🔐 로그인 상태 확인:",
                            checkResult,
                            Math.floor(elapsed / 1000),
                            "초 경과"
                        );

                        if (checkResult?.isLoggedIn && checkResult.username && checkResult.userTag && onMemexLoginComplete) {
                            console.log("🔐 GTM 로그인 확인됨, 백엔드에서 user 정보 조회:", checkResult.username);

                            // 백엔드에서 user 정보 가져오기 - user가 있어야만 로그인 완료
                            try {
                                const userResult = await backgroundApi.getUserByUsername(
                                    checkResult.username,
                                    checkResult.userTag
                                );
                                if (userResult?.user) {
                                    setUser(userResult.user);
                                    console.log("✅ MEMEX 로그인 완료:", userResult.user.userName);
                                    setLoggingIn(false);
                                    await refetch();
                                    onMemexLoginComplete(checkResult.username, checkResult.userTag);
                                    return;
                                }

                                // 백엔드에 user 없음 - 자동 회원가입 시도
                                console.log("🆕 백엔드에 user 없음, 자동 회원가입 시도...");

                                // 1. 프로필 정보 fetch
                                const profileInfo = await backgroundApi.fetchMemexProfileInfo(
                                    checkResult.username,
                                    checkResult.userTag
                                );
                                console.log("📋 프로필 정보:", profileInfo);

                                // 2. 지갑 주소 확인
                                if (!address) {
                                    console.warn("⚠️ 지갑 연결 필요, 폴링 계속...");
                                    setTimeout(checkLoginStatus, pollInterval);
                                    return;
                                }

                                // 3. 필수 정보 확인 후 Join 요청
                                if (profileInfo?.profileImageUrl && profileInfo?.tokenAddr && profileInfo?.memexWalletAddress) {
                                    const joinResult = await backgroundApi.join({
                                        username: checkResult.username,
                                        userTag: checkResult.userTag,
                                        walletAddress: address,
                                        profileImageUrl: profileInfo.profileImageUrl,
                                        memeXLink: `https://app.memex.xyz/profile/${checkResult.username}/${checkResult.userTag}`,
                                        myTokenAddr: profileInfo.tokenAddr,
                                        myTokenSymbol: profileInfo.tokenSymbol || "",
                                        memexWalletAddress: profileInfo.memexWalletAddress,
                                        isPolicyAgreed: true,
                                    });

                                    if (joinResult?.user) {
                                        setUser(joinResult.user);
                                        console.log("✅ 자동 회원가입 완료:", joinResult.user.userName);
                                        setLoggingIn(false);
                                        await refetch();
                                        onMemexLoginComplete(checkResult.username, checkResult.userTag);
                                        return;
                                    }
                                } else {
                                    console.warn("⚠️ 프로필 정보 부족, 폴링 계속:", {
                                        profileImageUrl: profileInfo?.profileImageUrl,
                                        tokenAddr: profileInfo?.tokenAddr,
                                        memexWalletAddress: profileInfo?.memexWalletAddress,
                                    });
                                }
                            } catch (userErr) {
                                console.warn("⚠️ User 정보 조회/회원가입 실패, 폴링 계속:", userErr);
                            }
                        }

                        // 아직 로그인 안됨, 다시 체크
                        setTimeout(checkLoginStatus, pollInterval);
                    } catch (err) {
                        console.log("🔐 로그인 확인 중 오류 (재시도):", err);
                        setTimeout(checkLoginStatus, pollInterval);
                    }
                };

                // 5초 후 폴링 시작 (Google 로그인 완료 시간 대기)
                setTimeout(checkLoginStatus, 5000);
            } else if (!result?.isLoggedIn && !result?.loginStarted) {
                // 로그인도 안되고 로그인 시작도 안됨 - MEMEX 탭 없음
                console.log("⚠️ MEMEX 탭이 없거나 연결 안됨, 스낵바 표시");
                showRefreshSnackbar();
            }
        } catch (err) {
            console.error("❌ MEMEX login failed:", err);
            setLoggingIn(false);
            if (isContentScriptError(err)) {
                showRefreshSnackbar();
            }
        }
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden">

            <div className="absolute top-[20%] left-0 right-0 flex justify-center items-center">
                <div className="chat-bubble border-[0.5px] border-white rounded-lg p-4 flex items-center ">
                    <div className="relative w-[100px] h-5 " />
                    <img
                        src={moneyLogo}
                        alt="Octopus with money"
                        className="absolute bottom-0 -left-8 max-w-[120px] w-auto h-auto object-contain"
                        style={{
                            imageRendering: 'pixelated'
                        }}
                    />

                    <div className="text-xs text-white tracking-wide ">
                        Do you want<br />to invite?
                    </div>

                </div>
            </div>

            {!isLoggingIn && (
                <div className="absolute left-0 right-0 bottom-20 flex justify-center items-center w-full gap-3">
                    <img
                        src={squareBrackets}
                        alt="["
                        className="w-2 object-contain"
                    />
                    <button
                        className="connect-bottom-button text-pixel-gold-flow text-xl"
                        onClick={handleConnect}
                        disabled={isLoading}
                    >
                        CONNECT {'>>>'}
                    </button>
                    <img
                        src={squareBrackets}
                        alt="]"
                        className="w-2 object-contain rotate-180"
                    />
                </div>
            )}

            <TermsModal
                isOpen={isTermsModalOpen}
                onClose={handleCloseTermsModal}
                onAgree={handleAgreeTerms}
            />
            <Snackbar
                message={snackbar.message}
                type={snackbar.type}
                isVisible={snackbar.isVisible}
                onClose={closeSnackbar}
                duration={0}
                actionLabel="이동"
                onAction={handleRefreshMemexTab}
            />

            <img src={homeBg} alt="Background" className="w-full h-full object-cover animate-zoom-out absolute inset-0 -z-10" />
            <img src={homeFloor} alt="Floor" className="absolute bottom-0 left-0 right-0 w-full h-full scale-150  object-contain animate-[slideUpFromBottom_1.5s_ease-in-out] -z-10 transition-all duration-1000 transform md:translate-y-[50%]" />
        </div>
    );
}
