import { useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { backgroundApi } from "../contents/lib/backgroundApi";
import { MyActiveGameItem, PrizeRankItem, QuestItem, QuestTypes } from "../types/response.types";
import { navigateBackAtom } from "./atoms/pageAtoms";
import { TopBar } from "./components";
import { useMemexLogin } from "./hooks/useMemexLogin";
import "./LeaderboardPage.css";

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
    const [quests, setQuests] = useState<QuestItem[]>([]);
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
                        <div className="token-image">{game.tokenImage ? <img src={game.tokenImage} alt={game.tokenSymbol || ""} /> : "🎮"}</div>
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
                        <img src={user.profileImage || mockUserData.profileImage} alt={user.username || "User"} className="user-avatar" />
                        <span className="item-name">{user.username || "Anonymous"}</span>
                        <span className="item-value">
                            {user.totalAmount} {user.tokenSymbol}
                        </span>
                    </div>
                ))
            )}
        </div>
    );

    // 퀘스트를 type별로 그룹화
    const groupedQuests = quests.reduce((acc, quest) => {
        if (!acc[quest.type]) {
            acc[quest.type] = [];
        }
        acc[quest.type].push(quest);
        return acc;
    }, {} as Record<QuestTypes, QuestItem[]>);

    const renderQuestTab = () => (
        <div className="quest-list">
            {isLoading ? (
                <div className="loading">Loading...</div>
            ) : Object.keys(groupedQuests).length === 0 ? (
                <div className="empty-state">No quests available</div>
            ) : (
                Object.entries(groupedQuests).map(([type, typeQuests]) => (
                    <div key={type} className="quest-group">
                        <h3 className="quest-category">{type} Quest</h3>
                        {typeQuests.map((quest) => {
                            const isEligible = quest.currentNumber >= quest.targetNumber;
                            return (
                                <div key={quest.id} className="quest-item">
                                    <span className="quest-title">{quest.title}</span>
                                    <span className="quest-progress">{quest.currentNumber}/{quest.targetNumber}</span>
                                    <button
                                        className={`claim-btn ${quest.isClaimed ? "claimed" : ""} ${!isEligible && !quest.isClaimed ? "disabled" : ""}`}
                                        disabled={quest.isClaimed || !isEligible}
                                    >
                                        {quest.isClaimed ? "Claimed" : isEligible ? "Claim" : "Locked"}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="leaderboard-container">
            {/* Header */}
            <TopBar />

            <div className="flex items-center justify-center gap-x-3 py-3 bg-brown-0">
                <img src="/icon/trophy.png" className="w-14 h-14" style={{ imageRendering: "pixelated" }} />
                <span className="text-3xl font-bold text-gold-gradient-smooth uppercase">Leader Board</span>
            </div>
            {/* Tabs */}
            <div className="leaderboard-tabs">
                <button className={`tab-btn ${activeTab === "games" ? "active" : ""}`} onClick={() => setActiveTab("games")}>
                    참여 중인 게임
                </button>
                <button className={`tab-btn ${activeTab === "prizeRank" ? "active" : ""}`} onClick={() => setActiveTab("prizeRank")}>
                    Prize Rank
                </button>
                <button className={`tab-btn ${activeTab === "quest" ? "active" : ""}`} onClick={() => setActiveTab("quest")}>
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
