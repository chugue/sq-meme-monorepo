import { useState } from "react";
import "./Dashboard.css";

// Mock data
const mockUserData = {
  userName: "SquidMaster",
  profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=squid",
  walletAddress: "0x13a90df0418e2a2c7e5801cb75d0a0e00319bdd1",
};

const mockCharacters = [
  { id: 1, name: "Squid #1", image: "https://api.dicebear.com/7.x/bottts/svg?seed=squid1" },
  { id: 2, name: "Squid #2", image: "https://api.dicebear.com/7.x/bottts/svg?seed=squid2" },
  { id: 3, name: "Squid #3", image: "https://api.dicebear.com/7.x/bottts/svg?seed=squid3" },
];

interface DashboardProps {
  walletAddress?: string;
  onNavigateToProfile?: () => void;
}

export function Dashboard({ walletAddress, onNavigateToProfile }: DashboardProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handleProfileClick = () => {
    if (onNavigateToProfile) {
      onNavigateToProfile();
    } else {
      // MEMEX 프로필 페이지로 이동
      window.open(`https://app.memex.xyz/profile/${mockUserData.walletAddress}`, "_blank");
    }
  };

  const handleMenuClick = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <button className="profile-link-btn" onClick={handleProfileClick}>
          <span className="link-icon">🔗</span>
          <span>내 MemeX 프로필로 이동하기</span>
        </button>
        <div className="user-info">
          <span className="user-name">{mockUserData.userName}</span>
          <img
            src={mockUserData.profileImage}
            alt="Profile"
            className="profile-image"
          />
        </div>
      </header>

      {/* Character Display */}
      <section className="characters-section">
        <div className="characters-grid">
          <div className="character-item character-main">
            <img src={mockCharacters[0].image} alt={mockCharacters[0].name} />
          </div>
          <div className="character-row">
            <div className="character-item">
              <img src={mockCharacters[1].image} alt={mockCharacters[1].name} />
            </div>
            <div className="character-item">
              <img src={mockCharacters[2].image} alt={mockCharacters[2].name} />
            </div>
          </div>
        </div>
      </section>

      {/* Menu Sections */}
      <section className="menu-section">
        <button
          className={`menu-item ${activeSection === "games" ? "active" : ""}`}
          onClick={() => handleMenuClick("games")}
        >
          <span className="menu-icon">🎮</span>
          <span className="menu-text">내가 참여하고 있는 게임</span>
          <span className="menu-arrow">{activeSection === "games" ? "▼" : "▶"}</span>
        </button>
        {activeSection === "games" && (
          <div className="menu-content">
            <div className="game-list">
              <div className="game-item">
                <span className="game-name">PEPE vs DOGE</span>
                <span className="game-status active">진행중</span>
              </div>
              <div className="game-item">
                <span className="game-name">SHIB Championship</span>
                <span className="game-status">대기중</span>
              </div>
            </div>
          </div>
        )}

        <button
          className={`menu-item ${activeSection === "leaderboard" ? "active" : ""}`}
          onClick={() => handleMenuClick("leaderboard")}
        >
          <span className="menu-icon">🏆</span>
          <span className="menu-text">리더 보드</span>
          <span className="menu-arrow">{activeSection === "leaderboard" ? "▼" : "▶"}</span>
        </button>
        {activeSection === "leaderboard" && (
          <div className="menu-content">
            <div className="leaderboard-list">
              <div className="leaderboard-item">
                <span className="rank">1</span>
                <span className="player">CryptoKing</span>
                <span className="score">12,500 pts</span>
              </div>
              <div className="leaderboard-item">
                <span className="rank">2</span>
                <span className="player">MemeQueen</span>
                <span className="score">10,200 pts</span>
              </div>
              <div className="leaderboard-item highlight">
                <span className="rank">15</span>
                <span className="player">You</span>
                <span className="score">3,400 pts</span>
              </div>
            </div>
          </div>
        )}

        <button
          className={`menu-item ${activeSection === "assets" ? "active" : ""}`}
          onClick={() => handleMenuClick("assets")}
        >
          <span className="menu-icon">💰</span>
          <span className="menu-text">나의 보유 자산 확인</span>
          <span className="menu-arrow">{activeSection === "assets" ? "▼" : "▶"}</span>
        </button>
        {activeSection === "assets" && (
          <div className="menu-content">
            <div className="assets-list">
              <div className="asset-item">
                <span className="asset-icon">🦑</span>
                <span className="asset-name">SQUID</span>
                <span className="asset-amount">1,000</span>
              </div>
              <div className="asset-item">
                <span className="asset-icon">🐸</span>
                <span className="asset-name">PEPE</span>
                <span className="asset-amount">50,000</span>
              </div>
              <div className="asset-item">
                <span className="asset-icon">🐕</span>
                <span className="asset-name">DOGE</span>
                <span className="asset-amount">25,000</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Wallet Address Footer */}
      <footer className="dashboard-footer">
        <span className="wallet-label">Connected:</span>
        <span className="wallet-address">
          {shortenAddress(walletAddress || mockUserData.walletAddress)}
        </span>
      </footer>
    </div>
  );
}
