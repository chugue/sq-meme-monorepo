import { useState } from "react";
import { backgroundApi } from "../contents/lib/backgroundApi";
import "./ComingSoon.css";
import {
    AnimatedTitle,
    ConnectButton,
    NeonBar,
    Particles,
    Snackbar,
    SquidCharacter,
    TermsModal,
} from "./components";
import { useMemexLogin } from "./hooks/useMemexLogin";
import { useSidepanelWallet } from "./hooks/useSidepanelWallet";
import { getMemexUserInfo } from "./lib/memexStorage";

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
    onMemexLoginComplete?: () => void;
}

export function ComingSoon({ onMemexLoginComplete }: ComingSoonProps) {
    const { isConnected, address, isLoading, error, connect, refetch } =
        useSidepanelWallet();
    const { setLoggingIn } = useMemexLogin();
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

    const handleConnectWallet = async () => {
        try {
            await connect();
        } catch (err) {
            console.error("Wallet connection failed:", err);
            if (isContentScriptError(err)) {
                showRefreshSnackbar();
            }
        }
    };

    const handleConnectMemex = () => {
        setIsTermsModalOpen(true);
    };

    const handleCloseTermsModal = () => {
        setIsTermsModalOpen(false);
    };

    const handleAgreeTerms = async () => {
        setIsTermsModalOpen(false);
        try {
            console.log("🔐 Terms agreed, checking GTM key first...");

            // 1. GTM 키 먼저 체크
            const cachedUserInfo = await getMemexUserInfo();

            if (cachedUserInfo) {
                // GTM 키가 있으면 바로 profile 페이지로 이동 후 로그인 완료
                console.log("✅ GTM 키 발견, profile 페이지로 이동:", cachedUserInfo);
                setLoggingIn(true);

                try {
                    // 프로필 페이지로 이동 (useMemexLogin의 fetchProfileInfo와 동일한 로직)
                    const memeXLink = `https://app.memex.xyz/profile/${cachedUserInfo.username}/${cachedUserInfo.user_tag}`;
                    // 프로필 페이지로 이동은 사용자가 직접 브라우저에서 수행
                    // URL 변경 감지로 자동으로 프로필 정보가 가져와짐
                    console.log('🖼️ [ComingSoon] 프로필 링크:', memeXLink);

                    // 로그인 상태 확인
                    const checkResult = (await backgroundApi.memexLogin()) as {
                        success: boolean;
                        isLoggedIn?: boolean;
                        username?: string;
                        userTag?: string;
                    };

                    if (checkResult?.isLoggedIn && onMemexLoginComplete) {
                        console.log("✅ MEMEX 로그인 완료:", checkResult.username);
                        setLoggingIn(false);
                        await refetch();
                        onMemexLoginComplete();
                        return;
                    }

                    // 만약 실패하면 기존 폴링 로직으로 fallback
                    console.log("⚠️ 프로필 페이지에서 로그인 확인 실패, 폴링 시작...");
                } catch (err) {
                    console.error("❌ 프로필 페이지 이동 실패:", err);
                    if (isContentScriptError(err)) {
                        setLoggingIn(false);
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

            // 이미 로그인되어 있으면 바로 완료
            if (result?.isLoggedIn && onMemexLoginComplete) {
                console.log("✅ MEMEX 로그인 완료:", result.username);
                setLoggingIn(false);
                onMemexLoginComplete();
                return;
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
                        };
                        console.log(
                            "🔐 로그인 상태 확인:",
                            checkResult,
                            Math.floor(elapsed / 1000),
                            "초 경과"
                        );

                        if (checkResult?.isLoggedIn && onMemexLoginComplete) {
                            console.log("✅ MEMEX 로그인 완료:", checkResult.username);
                            setLoggingIn(false);
                            // 지갑 연결 상태 재확인 (jotai 전역 상태 업데이트)
                            await refetch();
                            onMemexLoginComplete();
                            return;
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
        <div className="coming-soon-container">
            <Particles />
            <div className="glow-overlay"></div>
            <div className="coming-soon-content">
                <SquidCharacter />
                <div className="title-wrapper">
                    <AnimatedTitle text="COMING" startDelay={0} />
                    <AnimatedTitle
                        text="SOON"
                        startDelay={0.6}
                        className="coming-soon-title-second"
                    />
                </div>
                <div className="marketing-text-wrapper">
                    <p className="marketing-text">BUCKLE UP, SHIT'S ABOUT TO GET REAL</p>
                </div>
                <ConnectButton
                    isWalletConnected={isConnected}
                    onConnectWallet={handleConnectWallet}
                    onConnectMemex={handleConnectMemex}
                />
                <NeonBar />
            </div>
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
        </div>
    );
}
