import "./App.css";

import { useAtom, useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { profileModalOpenAtom } from "./atoms/modalAtoms";
import { currentPageAtom, PAGES } from "./atoms/pageAtoms";
import { ComingSoon } from "./ComingSoon";
import DashboardBackground from "./components/DashboardBackground";
import { ProfileModal } from "./components/ProfileModal/ProfileModal";
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
    const { isLoggedIn: isMemexLoggedIn, setLoggedIn: setMemexLoggedIn } = useMemexLogin();
    const currentPage = useAtomValue(currentPageAtom);
    const [showStartingLoading, setShowStartingLoading] = useState(true);
    const [isProfileModalOpen, setIsProfileModalOpen] = useAtom(profileModalOpenAtom);

    // 지갑 연결 + MEMEX 로그인 완료 시 대시보드로 전환
    useEffect(() => {}, [isConnected, isMemexLoggedIn]);

    // MEMEX 로그인 완료 핸들러
    const handleMemexLoginComplete = (username: string, userTag: string) => {
        setMemexLoggedIn(true, username, userTag);
    };

    // StartingLoading이 완료되면 숨김
    const handleStartingLoadingComplete = () => {
        setShowStartingLoading(false);
    };

    if (showStartingLoading || isLoading) {
        return <StartingLoading onComplete={handleStartingLoadingComplete} duration={3000} />;
    }

    // 지갑 연결 + MEMEX 로그인 완료 시 대시보드
    if (isConnected && isMemexLoggedIn) {
        return (
            <div className="relative min-h-screen">
                <DashboardBackground />
                {currentPage === PAGES.QUESTS && <QuestPage />}
                {currentPage === PAGES.LEADERBOARD && <LeaderboardPage />}
                {currentPage === PAGES.LIVE_GAMES && <LiveGamesPage />}
                {currentPage === PAGES.MY_ASSETS && <MyAssetsPage />}
                {(currentPage === PAGES.DASHBOARD || currentPage === undefined) && <Dashboard walletAddress={address || undefined} />}
                <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
            </div>
        );
    }

    return <ComingSoon onMemexLoginComplete={handleMemexLoginComplete} />;
}
