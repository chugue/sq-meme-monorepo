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
import { Address } from "viem";

// Content script 연결 오류인지 확인
function isContentScriptError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return message.includes("receiving end does not exist") || message.includes("could not establish connection");
    }
    return false;
}

interface ComingSoonProps {
    onMemexLoginComplete?: (username: string, userTag: string) => void;
}

export function ComingSoon({ onMemexLoginComplete }: ComingSoonProps) {
    const { isConnected, address, isLoading, error, connect, refetch } = useSidepanelWallet();
    const { isLoggingIn, setLoggingIn, setUser, tryLoginWithCachedUserInfo } = useMemexLogin();
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

    const showRefreshSnackbar = (message?: string) => {
        setSnackbar({
            isVisible: true,
            message: message || "MEMEX에서 실행해주세요",
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

            // 새로고침 후 GTM 키 확인 (브라우저 sessionStorage에서 읽어서 익스텐션 storage에 동기화)
            const gtmCheckResult = (await backgroundApi.memexLogin(false, true)) as {
                success: boolean;
                isLoggedIn?: boolean;
                username?: string;
                userTag?: string;
                error?: string;
            };

            if (gtmCheckResult?.isLoggedIn && gtmCheckResult.username && gtmCheckResult.userTag) {
                // GTM 키가 있으면 로그인 진행
                await connect();
                await handleMemexLogin();
            }
            // GTM 없으면 사용자가 MEMEX에서 로그인하도록 대기
        } catch (err) {
            console.error("Failed to refresh MEMEX tab:", err);
        }
    };

    const handleConnectWallet = async () => {
        try {
            // 현재 활성 탭의 URL 확인
            const currentUrlResult = await backgroundApi.getCurrentTabUrl();
            const currentUrl = currentUrlResult?.url;

            // URL이 https://app.memex.xyz로 시작하지 않으면 스낵바 표시
            if (!currentUrl || !currentUrl.startsWith("https://app.memex.xyz")) {
                showRefreshSnackbar("MEMEX 로그인 후 이용해주세요");
                return;
            }

            // app.memex.xyz/* 페이지인 경우 - 새로고침 후 GTM 확인
            // await backgroundApi.refreshMemexTab();

            // GTM 키 확인 (브라우저 sessionStorage에서 읽어서 익스텐션 storage에 동기화)
            const gtmCheckResult = (await backgroundApi.memexLogin(false, true)) as {
                success: boolean;
                isLoggedIn?: boolean;
                username?: string;
                userTag?: string;
                error?: string;
            };

            if (gtmCheckResult?.isLoggedIn && gtmCheckResult.username && gtmCheckResult.userTag) {
                // GTM 키가 있으면 지갑만 연결하고, 이미 로그인되어 있으므로 handleMemexLogin은 호출하지 않음
                await connect();
                // 이미 로그인되어 있으면 추가 로그인 시도 없이 완료 처리
                if (onMemexLoginComplete) {
                    onMemexLoginComplete(gtmCheckResult.username, gtmCheckResult.userTag);
                }
            } else {
                // GTM 키가 없으면 스낵바 표시
                showRefreshSnackbar("MEMEX 로그인 후 이용해주세요");
            }
        } catch (err) {
            console.error("Wallet connection failed:", err);
            if (isContentScriptError(err)) {
                showRefreshSnackbar();
            }
        }
    };

    // 훅의 tryLoginWithCachedUserInfo에 전달할 옵션
    const loginOptions = {
        walletAddress: address ?? undefined,
        onSuccess: onMemexLoginComplete,
        onRefetch: refetch,
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
            // 1. GTM 키 먼저 체크
            const cachedUserInfo = await getMemexUserInfo();

            if (cachedUserInfo) {
                try {
                    const success = await tryLoginWithCachedUserInfo(cachedUserInfo, loginOptions);
                    if (success) {
                        return; // 로그인 성공
                    }
                } catch (err) {
                    // content script 에러 처리
                    if (isContentScriptError(err)) {
                        showRefreshSnackbar();
                    }
                    return;
                }
            } else {
                // GTM 키가 없으면 app.memex.xyz로 이동하여 Google 로그인 버튼 클릭
            }

            // 2. GTM 키가 없거나, 있어도 프로필에서 로그인 확인 실패 시 Google 로그인 시도
            // 브라우저 sessionStorage에서 읽어서 익스텐션 storage에 동기화
            const result = (await backgroundApi.memexLogin(true, true)) as {
                success: boolean;
                isLoggedIn?: boolean;
                loginStarted?: boolean;
                noGoogleButton?: boolean;
                username?: string;
                userTag?: string;
                error?: string;
            };

            // Content script 연결 오류 체크 (응답에 error 필드가 있는 경우)
            if (
                result?.error &&
                (result.error.toLowerCase().includes("receiving end does not exist") ||
                    result.error.toLowerCase().includes("could not establish connection"))
            ) {
                showRefreshSnackbar();
                return;
            }

            // Google 로그인 버튼이 없는 경우 (profile 페이지 등) - 메인 페이지로 이동 안내
            if (result?.noGoogleButton && !result?.isLoggedIn) {
                showRefreshSnackbar("MEMEX 로그인 후 이용해주세요");
                return;
            }

            // 이미 로그인되어 있으면 백엔드에서 user 정보 조회 후 완료
            if (result?.isLoggedIn && result.username && result.userTag && onMemexLoginComplete) {
                try {
                    const userResult = await backgroundApi.getUserByUsername(result.username, result.userTag);
                    if (userResult?.user) {
                        setUser(userResult.user);
                        setLoggingIn(false);
                        onMemexLoginComplete(result.username, result.userTag);
                        return;
                    }

                    setLoggingIn(true);

                    // 1. 프로필 정보 fetch
                    const profileInfo = await backgroundApi.fetchMemexProfileInfo(result.username, result.userTag);

                    // 2. 지갑 주소 확인
                    if (!address) {
                        console.warn("⚠️ 지갑 연결 필요");
                        setLoggingIn(false);
                        return;
                    }

                    // 3. 필수 정보 확인 후 Join 요청
                    if (profileInfo?.profileImageUrl && profileInfo?.tokenAddr && profileInfo?.memexWalletAddress) {
                        // 테스트 유저 지갑 주소 매핑
                        const TEST_WALLET_ADDRESSES: Record<string, Address> = {
                            squidmeme: "0xdc52a1590982eb5fb784471dfe4c1e7ccee6533c",
                            jrbr7282: "0x0c42bcf0041995fbde65f0a617259cacc8a6cb62",
                        };

                        // 테스트 유저인 경우 해당 테스트 지갑 주소 사용
                        const lowerUsername = result.username?.toLowerCase();
                        let finalWalletAddress = address;
                        if (lowerUsername && TEST_WALLET_ADDRESSES[lowerUsername]) {
                            finalWalletAddress = TEST_WALLET_ADDRESSES[lowerUsername];
                        }

                        const joinResult = await backgroundApi.join({
                            username: result.username,
                            userTag: result.userTag,
                            walletAddress: finalWalletAddress,
                            profileImageUrl: profileInfo.profileImageUrl,
                            memeXLink: `https://app.memex.xyz/profile/${result.username}/${result.userTag}`,
                            myTokenAddr: profileInfo.tokenAddr,
                            myTokenSymbol: profileInfo.tokenSymbol || "",
                            memexWalletAddress: profileInfo.memexWalletAddress,
                            isPolicyAgreed: true,
                        });

                        if (joinResult?.user) {
                            setUser(joinResult.user);

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
                            imageRendering: "pixelated",
                        }}
                    />

                    <div className="text-xs text-white tracking-wide ">
                        Do you want
                        <br />
                        to invite?
                    </div>
                </div>
            </div>

            {!isLoggingIn && (
                <div className="absolute left-0 right-0 bottom-20 flex justify-center items-center w-full gap-3">
                    <img src={squareBrackets} alt="[" className="w-2 object-contain" />
                    <button className="connect-bottom-button text-pixel-gold-flow text-xl" onClick={handleConnectWallet} disabled={isLoading}>
                        CONNECT {">>>"}
                    </button>
                    <img src={squareBrackets} alt="]" className="w-2 object-contain rotate-180" />
                </div>
            )}

            <TermsModal isOpen={isTermsModalOpen} onClose={handleCloseTermsModal} onAgree={handleAgreeTerms} />
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
            <img
                src={homeFloor}
                alt="Floor"
                className="absolute bottom-0 left-0 right-0 w-full h-full -z-10 transition-all transform translate-y-[20%] sm:translate-y-[50%]"
                style={{
                    animationDelay: "0.5s",
                }}
            />
        </div>
    );
}
