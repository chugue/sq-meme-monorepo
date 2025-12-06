import "./App.css";

import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { currentPageAtom, PAGES } from "./atoms/pageAtoms";
import { ComingSoon } from "./ComingSoon";
import { Dashboard } from "./Dashboard";
import { useMemexLogin } from "./hooks/useMemexLogin";
import { useSidepanelWallet } from "./hooks/useSidepanelWallet";
import { LeaderboardPage } from "./LeaderboardPage";
import { LiveGamesPage } from "./LiveGamesPage";
import { MyAssetsPage } from "./MyAssetsPage";
import QuestPage from "./QuestPage";
import StartingLoading from "./StartingLoading";

export function SidePanelApp() {
    const { isConnected, address, isLoading } = useSidepanelWallet();
    const { isLoggedIn: isMemexLoggedIn, setLoggedIn: setMemexLoggedIn } =
        useMemexLogin();
    const currentPage = useAtomValue(currentPageAtom);
    const [showStartingLoading, setShowStartingLoading] = useState(true);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // 지갑 연결 + MEMEX 로그인 완료 시 대시보드로 전환
    useEffect(() => {
        console.log("🔐 [App] 상태 확인:", { isConnected, isMemexLoggedIn });
    }, [isConnected, isMemexLoggedIn]);

    // MEMEX 로그인 완료 핸들러
    const handleMemexLoginComplete = (username: string, userTag: string) => {
        console.log("🔐 [App] handleMemexLoginComplete 호출됨:", {
            username,
            userTag,
        });
        setMemexLoggedIn(true, username, userTag);
    };

    // StartingLoading이 완료되면 숨김
    const handleStartingLoadingComplete = () => {
        console.log("🎬 [App] StartingLoading 완료");
        setShowStartingLoading(false);
    };

    if (showStartingLoading || isLoading) {
        return (
            <StartingLoading
                onComplete={handleStartingLoadingComplete}
                duration={3000}
            />
        );
    }

    // 지갑 연결 + MEMEX 로그인 완료 시 대시보드
    if (isConnected && isMemexLoggedIn) {
        if (currentPage === PAGES.LEADERBOARD) {
            return <LeaderboardPage />;
        }
        if (currentPage === PAGES.LIVE_GAMES) {
            return <LiveGamesPage />;
        }
        if (currentPage === PAGES.MY_ASSETS) {
            return <MyAssetsPage />;
        }
        if (currentPage === PAGES.QUESTS) {
            return <QuestPage />;
        }
        return <Dashboard walletAddress={address || undefined} />;
    }

    return <ComingSoon onMemexLoginComplete={handleMemexLoginComplete} />;
}
