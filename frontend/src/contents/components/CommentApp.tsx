import { getWagmiConfig } from "@/contents/config/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { WagmiProvider } from "wagmi";
import { SquidMemeJotaiProvider } from "../atoms/JotaiProvider";
import { useResponsiveMode } from "../hooks/useResponsiveMode";
import { isHomePage, isProfilePage } from "../utils/page-check.helpers";
import { FloatingGameButton } from "./FloatingGameButton";
import { GamePopup } from "./GamePopup";
import { HomePage } from "./HomePage";
import { ProfilePage } from "./ProfilePage";
import { ErrorBoundary } from "./sub-components/ErrorBoundary";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

/**
 * 내부 앱 컴포넌트 (Jotai Provider 내부에서 훅 사용)
 */
function CommentAppInner() {
    // 초기 상태는 현재 URL 기준으로 설정
    const [isProfile, setIsProfile] = useState(() => isProfilePage());
    const [isHome, setIsHome] = useState(() => isHomePage());
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    // 반응형 모드 감지
    const isMobileMode = useResponsiveMode();

    // URL 변경 감지 (SPA 네비게이션 대응)
    useEffect(() => {
        // SPA_NAVIGATION 메시지 수신 - 메시지에 포함된 URL 사용
        const messageListener = (event: MessageEvent) => {
            if (event.data?.source === "SPA_NAVIGATION") {
                // 메시지에 포함된 새 URL 사용 (더 정확함)
                const newUrl = event.data?.data?.url;
                const newIsProfile = newUrl ? isProfilePage(newUrl) : isProfilePage();
                const newIsHome = newUrl ? isHomePage(newUrl) : isHomePage();

                setIsProfile(newIsProfile);
                setIsHome(newIsHome);
            }
        };

        window.addEventListener("message", messageListener);
        return () => window.removeEventListener("message", messageListener);
    }, []);

    // 모바일 모드일 때 팝업 열기/닫기 핸들러
    const handleOpenPopup = () => {
        setIsPopupOpen(true);
    };

    const handleClosePopup = () => {
        setIsPopupOpen(false);
    };

    // 모바일 모드: 플로팅 버튼 + 팝업
    const shouldUsePopupMode = isMobileMode;

    const gameContent = useMemo(() => {
        return isHome ? <HomePage /> : isProfile ? <ProfilePage /> : null;
    }, [isHome, isProfile]);
    if (shouldUsePopupMode) {
        // Portal을 사용하여 body에 직접 렌더링 (부모 요소가 사라져도 계속 표시)
        return (
            <>
                {/* 게임 정보 로딩을 위해 항상 마운트 (숨김) - 단일 인스턴스 */}
                {gameContent && (
                    <div
                        key="hidden-game-content"
                        style={{
                            position: "absolute",
                            left: "-9999px",
                            visibility: "hidden",
                            pointerEvents: "none"
                        }}
                    >
                        {gameContent}
                    </div>
                )}

                {/* 플로팅 버튼 */}
                {(isProfile || isHome) &&
                    typeof document !== "undefined" &&
                    createPortal(
                        <FloatingGameButton onClick={handleOpenPopup} />,
                        document.body
                    )}

                {/* 팝업 - 열려있을 때만 표시 (새 인스턴스로 렌더링하여 독립적으로 동작) */}
                {isPopupOpen &&
                    typeof document !== "undefined" &&
                    createPortal(
                        <GamePopup 
                            isOpen={isPopupOpen} 
                            onClose={handleClosePopup}
                            key={`popup-${isPopupOpen}`} // 팝업이 열릴 때마다 새 인스턴스로 렌더링
                        >
                            {isHome ? <HomePage /> : isProfile ? <ProfilePage /> : null}
                        </GamePopup>,
                        document.body
                    )}
            </>
        );
    }

    // 데스크톱 모드: 기존 인라인 렌더링
    // 홈 페이지면 안내 화면 표시
    if (isHome) {
        return <HomePage />;
    }

    // 프로필 페이지면 게임 컨텐츠 표시
    if (isProfile) {
        return <ProfilePage />;
    }

    // 그 외 페이지는 아무것도 표시하지 않음
    return null;
}

export default function CommentApp() {
    const wagmiConfig = useMemo(() => getWagmiConfig(), []);

    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={wagmiConfig}>
                    <SquidMemeJotaiProvider>
                        <CommentAppInner />
                    </SquidMemeJotaiProvider>
                </WagmiProvider>
            </QueryClientProvider>
        </ErrorBoundary>
    );
}
