import { useState } from "react";
import { ChevronLeft, Home } from "lucide-react";
import { useAtomValue } from "jotai";
import { useMemexLogin } from "./hooks/useMemexLogin";
import { sessionAtom } from "./atoms/sessionAtoms";
import "./LeaderboardPage.css";

// Mock data
const mockUserData = {
  profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=squid",
};

const mockGames = [
  { rank: 1, tokenImage: "🦑", tokenSymbol: "SQUID", totalPrize: "1,500 ETH" },
  { rank: 2, tokenImage: "🐸", tokenSymbol: "PEPE", totalPrize: "1,200 ETH" },
  { rank: 3, tokenImage: "🐕", tokenSymbol: "DOGE", totalPrize: "980 ETH" },
  { rank: 4, tokenImage: "🚀", tokenSymbol: "MOON", totalPrize: "750 ETH" },
  { rank: 5, tokenImage: "💎", tokenSymbol: "GEM", totalPrize: "500 ETH" },
];

const mockPrizeRank = [
  { rank: 1, profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=user1", username: "CryptoKing", totalPrize: "2,500 ETH" },
  { rank: 2, profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=user2", username: "MemeQueen", totalPrize: "1,800 ETH" },
  { rank: 3, profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=user3", username: "DiamondHands", totalPrize: "1,200 ETH" },
  { rank: 4, profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=user4", username: "MoonWalker", totalPrize: "950 ETH" },
  { rank: 5, profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=user5", username: "WhaleAlert", totalPrize: "800 ETH" },
];

const mockQuests = [
  { category: "Check In Quest", items: [
    { title: "5 Days Streak!", claimed: false },
    { title: "10 Days Streak!", claimed: false },
  ]},
  { category: "Comment Quest", items: [
    { title: "20 comments", claimed: false },
    { title: "50 comments", claimed: true },
  ]},
];

type TabType = "games" | "prizeRank" | "quest";

interface LeaderboardPageProps {
  onBack: () => void;
}

export function LeaderboardPage({ onBack }: LeaderboardPageProps) {
  const { username, profileImageUrl } = useMemexLogin();
  const session = useAtomValue(sessionAtom);
  const [activeTab, setActiveTab] = useState<TabType>("games");

  const renderGamesTab = () => (
    <div className="leaderboard-list">
      {mockGames.map((game) => (
        <div key={game.rank} className="leaderboard-item">
          <span className="rank-number">{game.rank}</span>
          <div className="token-image">{game.tokenImage}</div>
          <span className="item-name">{game.tokenSymbol}</span>
          <span className="item-value">{game.totalPrize}</span>
        </div>
      ))}
    </div>
  );

  const renderPrizeRankTab = () => (
    <div className="leaderboard-list">
      {mockPrizeRank.map((user) => (
        <div key={user.rank} className="leaderboard-item">
          <span className="rank-number">{user.rank}</span>
          <img src={user.profileImage} alt={user.username} className="user-avatar" />
          <span className="item-name">{user.username}</span>
          <span className="item-value">{user.totalPrize}</span>
        </div>
      ))}
    </div>
  );

  const renderQuestTab = () => (
    <div className="quest-list">
      {mockQuests.map((questGroup) => (
        <div key={questGroup.category} className="quest-group">
          <h3 className="quest-category">{questGroup.category}</h3>
          {questGroup.items.map((quest, idx) => (
            <div key={idx} className="quest-item">
              <span className="quest-title">{quest.title}</span>
              <button
                className={`claim-btn ${quest.claimed ? "claimed" : ""}`}
                disabled={quest.claimed}
              >
                {quest.claimed ? "Claimed" : "Claim"}
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="leaderboard-container">
      {/* Header */}
      <header className="leaderboard-header">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={24} />
          <Home size={20} />
        </button>
        <div className="header-user-info">
          <span className="header-username">{username || "User"}</span>
          <img
            src={profileImageUrl || mockUserData.profileImage}
            alt="Profile"
            className="header-profile-image"
          />
        </div>
      </header>

      {/* Tabs */}
      <div className="leaderboard-tabs">
        <button
          className={`tab-btn ${activeTab === "games" ? "active" : ""}`}
          onClick={() => setActiveTab("games")}
        >
          진행 중인 게임
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
