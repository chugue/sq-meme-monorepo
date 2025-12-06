import { useEffect, useState } from "react";
import "./App.css";
import { ComingSoon } from "./ComingSoon";
import { Dashboard } from "./Dashboard";
import { LeaderboardPage } from "./LeaderboardPage";
import { LiveGamesPage } from "./LiveGamesPage";
import { MyAssetsPage } from "./MyAssetsPage";
import { useMemexLogin } from "./hooks/useMemexLogin";
import { useSidepanelWallet } from "./hooks/useSidepanelWallet";

type Page = "dashboard" | "leaderboard" | "liveGames" | "myAssets";

export function SidePanelApp() {
  const { isConnected, address, isLoading } = useSidepanelWallet();
  const { isLoggedIn: isMemexLoggedIn, setLoggedIn: setMemexLoggedIn } =
    useMemexLogin();
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  // 지갑 연결 + MEMEX 로그인 완료 시 대시보드로 전환
  useEffect(() => {
    console.log("🔐 [App] 상태 확인:", { isConnected, isMemexLoggedIn });
  }, [isConnected, isMemexLoggedIn]);

  // MEMEX 로그인 완료 핸들러
  const handleMemexLoginComplete = (username: string, userTag: string) => {
    console.log("🔐 [App] handleMemexLoginComplete 호출됨:", { username, userTag });
    setMemexLoggedIn(true, username, userTag);
  };

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
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
