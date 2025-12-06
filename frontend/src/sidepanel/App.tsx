import "./App.css";

import { useEffect, useState } from "react";
import { ComingSoon } from "./ComingSoon";
import { Dashboard } from "./Dashboard";
import { useMemexLogin } from "./hooks/useMemexLogin";
import { useSidepanelWallet } from "./hooks/useSidepanelWallet";
import { LeaderboardPage } from "./LeaderboardPage";
import { LiveGamesPage } from "./LiveGamesPage";
import { MyAssetsPage } from "./MyAssetsPage";
import StartingLoading from "./StartingLoading";

type Page = "dashboard" | "leaderboard" | "liveGames" | "myAssets";

export function SidePanelApp() {
    const { isConnected, address, isLoading } = useSidepanelWallet();
    const { isLoggedIn: isMemexLoggedIn, setLoggedIn: setMemexLoggedIn } = useMemexLogin();
    const [currentPage, setCurrentPage] = useState<Page>("dashboard");
    const [showStartingLoading, setShowStartingLoading] = useState(true);

    // 지갑 연결 + MEMEX 로그인 완료 시 대시보드로 전환
    useEffect(() => {
        console.log("🔐 [App] 상태 확인:", { isConnected, isMemexLoggedIn });
    }, [isConnected, isMemexLoggedIn]);

    // MEMEX 로그인 완료 핸들러
    const handleMemexLoginComplete = (username: string, userTag: string) => {
        console.log("🔐 [App] handleMemexLoginComplete 호출됨:", { username, userTag });
        setMemexLoggedIn(true, username, userTag);
    };

    // StartingLoading이 완료되면 숨김
    const handleStartingLoadingComplete = () => {
        console.log("🎬 [App] StartingLoading 완료");
        setShowStartingLoading(false);
    };

    if (showStartingLoading || isLoading) {
        return <StartingLoading onComplete={handleStartingLoadingComplete} duration={3000} />;
    }


    // 지갑 연결 + MEMEX 로그인 완료 시 대시보드
    if (isConnected && isMemexLoggedIn) {
        if (currentPage === "leaderboard") {
            return (
                <LeaderboardPage
                    onBack={() => setCurrentPage("dashboard")}
                />
            );
        }
        if (currentPage === "liveGames") {
            return (
                <LiveGamesPage
                    onBack={() => setCurrentPage("dashboard")}
                />
            );
        }
        if (currentPage === "myAssets") {
            return (
                <MyAssetsPage
                    onBack={() => setCurrentPage("dashboard")}
                />
            );
        }
        return (
            <Dashboard
                walletAddress={address || undefined}
                onNavigateToLeaderboard={() => setCurrentPage("leaderboard")}
                onNavigateToLiveGames={() => setCurrentPage("liveGames")}
                onNavigateToMyAssets={() => setCurrentPage("myAssets")}
                onNavigateToHowToPlay={() => {
                    // TODO: How to Play 페이지 구현
                    console.log("How to Play clicked");
                }}
                onNavigateToQuest={() => {
                    // TODO: Quest 페이지 구현
                    console.log("Quest clicked");
                }}
            />
        );
    }

    return <ComingSoon onMemexLoginComplete={handleMemexLoginComplete} />;
}
