import { useSetAtom } from "jotai";
import { ChevronLeft, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { backgroundApi } from "../contents/lib/backgroundApi";
import {
    MyActiveGameItem,
    PrizeRankItem,
    QuestCategory,
} from "../types/response.types";
import { navigateBackAtom } from "./atoms/pageAtoms";
import { useMemexLogin } from "./hooks/useMemexLogin";
import "./LeaderboardPage.css";
import { ProfileModal } from "./ProfileModal";

// Mock data
const mockUserData = {
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=squid",
};

type TabType = "games" | "prizeRank" | "quest";

export function LeaderboardPage() {
    const { username, profileImageUrl } = useMemexLogin();
    const navigateBack = useSetAtom(navigateBackAtom);
    const [activeTab, setActiveTab] = useState<TabType>("games");
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // API 데이터 상태
    const [myActiveGames, setMyActiveGames] = useState<MyActiveGameItem[]>([]);
    const [prizeRanking, setPrizeRanking] = useState<PrizeRankItem[]>([]);
    const [quests, setQuests] = useState<QuestCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 컴포넌트 로드 시 네 API 동시 호출
    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);

            try {
                const [myGamesRes, prizeRes, questRes] = await Promise.all([
                    backgroundApi.getMyActiveGames(),
                    backgroundApi.getPrizeRanking(),
                    backgroundApi.getQuests(),
                ]);

                setMyActiveGames(myGamesRes.myActiveGames);
                setPrizeRanking(prizeRes.prizeRanking);
                setQuests(questRes.quests);
                console.log("✅ [LeaderboardPage] 데이터 로드 완료");
            } catch (error) {
                console.error("❌ [LeaderboardPage] 데이터 로드 실패:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, []);

    const renderGamesTab = () => (
        <div className="leaderboard-list">
            {isLoading ? (
                <div className="loading">Loading...</div>
            ) : myActiveGames.length === 0 ? (
                <div className="empty-state">참여 중인 게임이 없습니다</div>
            ) : (
                myActiveGames.map((game, index) => (
                    <div key={game.gameId} className="leaderboard-item">
                        <span className="rank-number">{index + 1}</span>
                        <div className="token-image">
                            {game.tokenImage ? (
                                <img src={game.tokenImage} alt={game.tokenSymbol || ""} />
                            ) : (
                                "🎮"
                            )}
                        </div>
                        <span className="item-name">{game.tokenSymbol}</span>
                        <span className="item-value">{game.currentPrizePool} ETH</span>
                    </div>
                ))
            )}
        </div>
    );

    const renderPrizeRankTab = () => (
        <div className="leaderboard-list">
            {isLoading ? (
                <div className="loading">Loading...</div>
            ) : prizeRanking.length === 0 ? (
                <div className="empty-state">No prize ranking data</div>
            ) : (
                prizeRanking.map((user) => (
                    <div key={user.rank} className="leaderboard-item">
                        <span className="rank-number">{user.rank}</span>
                        <img
                            src={user.profileImage || mockUserData.profileImage}
                            alt={user.username || "User"}
                            className="user-avatar"
                        />
                        <span className="item-name">{user.username || "Anonymous"}</span>
                        <span className="item-value">
                            {user.totalAmount} {user.tokenSymbol}
                        </span>
                    </div>
                ))
            )}
        </div>
    );

    const renderQuestTab = () => (
        <div className="quest-list">
            {isLoading ? (
                <div className="loading">Loading...</div>
            ) : quests.length === 0 ? (
                <div className="empty-state">No quests available</div>
            ) : (
                quests.map((questGroup) => (
                    <div key={questGroup.category} className="quest-group">
                        <h3 className="quest-category">{questGroup.category}</h3>
                        {questGroup.items.map((quest, idx) => (
                            <div key={idx} className="quest-item">
                                <span className="quest-title">{quest.title}</span>
                                <button
                                    className={`claim-btn ${quest.claimed ? "claimed" : ""} ${!quest.isEligible && !quest.claimed ? "disabled" : ""
                                        }`}
                                    disabled={quest.claimed || !quest.isEligible}
                                >
                                    {quest.claimed
                                        ? "Claimed"
                                        : quest.isEligible
                                            ? "Claim"
                                            : "Locked"}
                                </button>
                            </div>
                        ))}
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="leaderboard-container">
            {/* Header */}
            <header className="leaderboard-header">
                <button className="back-btn" onClick={() => navigateBack()}>
                    <ChevronLeft size={24} />
                    <Home size={20} />
                </button>
                <div className="header-user-info">
                    <span className="header-username">{username || "User"}</span>
                    <img
                        src={profileImageUrl || mockUserData.profileImage}
                        alt="Profile"
                        className="header-profile-image"
                        onClick={() => setIsProfileModalOpen(true)}
                        style={{ cursor: "pointer" }}
                    />
                </div>
            </header>

            {/* Profile Modal */}
            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />

            {/* Tabs */}
            <div className="leaderboard-tabs">
                <button
                    className={`tab-btn ${activeTab === "games" ? "active" : ""}`}
                    onClick={() => setActiveTab("games")}
                >
                    참여 중인 게임
                </button>
                <button
                    className={`tab-btn ${activeTab === "prizeRank" ? "active" : ""}`}
                    onClick={() => setActiveTab("prizeRank")}
                >
                    Prize Rank
                </button>
                <button
                    className={`tab-btn ${activeTab === "quest" ? "active" : ""}`}
                    onClick={() => setActiveTab("quest")}
                >
                    Quest
                </button>
            </div>

            {/* Content */}
            <section className="leaderboard-content">
                {activeTab === "games" && renderGamesTab()}
                {activeTab === "prizeRank" && renderPrizeRankTab()}
                {activeTab === "quest" && renderQuestTab()}
            </section>
        </div>
    );
}
