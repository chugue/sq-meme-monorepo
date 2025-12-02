import { ChevronLeft, Home } from "lucide-react";
import { useMemexLogin } from "./hooks/useMemexLogin";
import "./MyGamesPage.css";

// Mock data
const mockUserData = {
  profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=squid",
};

const mockMyGames = [
  {
    rank: 1,
    tokenImage: "🦑",
    tokenSymbol: "SQUID",
    totalPrize: "1,500 ETH",
    timeLeft: "2h 30m",
  },
  {
    rank: 2,
    tokenImage: "🐸",
    tokenSymbol: "PEPE",
    totalPrize: "1,200 ETH",
    timeLeft: "5h 15m",
  },
  {
    rank: 3,
    tokenImage: "🐕",
    tokenSymbol: "DOGE",
    totalPrize: "980 ETH",
    timeLeft: "1d 3h",
  },
  {
    rank: 4,
    tokenImage: "🚀",
    tokenSymbol: "MOON",
    totalPrize: "750 ETH",
    timeLeft: "3d 12h",
  },
  {
    rank: 5,
    tokenImage: "💎",
    tokenSymbol: "GEM",
    totalPrize: "500 ETH",
    timeLeft: "6h 45m",
  },
];

interface MyGamesPageProps {
  onBack: () => void;
}

export function MyGamesPage({ onBack }: MyGamesPageProps) {
  const { username, profileImageUrl } = useMemexLogin();

  return (
    <div className="my-games-container">
      {/* Header */}
      <header className="my-games-header">
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

      {/* Games List */}
      <section className="my-games-content">
        <div className="games-list">
          {mockMyGames.map((game) => (
            <div key={game.rank} className="game-card">
              <div className="game-card-left">
                <span className="game-rank">{game.rank}</span>
                <div className="game-token-image">{game.tokenImage}</div>
                <span className="game-token-symbol">{game.tokenSymbol}</span>
              </div>
              <div className="game-card-right">
                <div className="game-stat">
                  <span className="stat-label">총 상금 현황</span>
                  <span className="stat-value">{game.totalPrize}</span>
                </div>
                <div className="game-stat">
                  <span className="stat-label">남은 시간</span>
                  <span className="stat-value time">{game.timeLeft}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
