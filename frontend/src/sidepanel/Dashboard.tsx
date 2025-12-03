import { backgroundApi } from "../contents/lib/backgroundApi";
import "./Dashboard.css";
import { useMemexLogin } from "./hooks/useMemexLogin";

// Mock data
const mockUserData = {
  profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=squid",
  walletAddress: "0x13a90df0418e2a2c7e5801cb75d0a0e00319bdd1",
};

const mockCharacters = [
  {
    id: 1,
    name: "Squid #1",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=squid1",
  },
  {
    id: 2,
    name: "Squid #2",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=squid2",
  },
  {
    id: 3,
    name: "Squid #3",
    image: "https://api.dicebear.com/7.x/bottts/svg?seed=squid3",
  },
];

interface DashboardProps {
  walletAddress?: string;
  onNavigateToProfile?: () => void;
  onNavigateToLeaderboard?: () => void;
  onNavigateToMyGames?: () => void;
  onNavigateToMyAssets?: () => void;
}

export function Dashboard({
  walletAddress,
  onNavigateToProfile,
  onNavigateToLeaderboard,
  onNavigateToMyGames,
  onNavigateToMyAssets,
}: DashboardProps) {
  const { username, userTag, profileImageUrl, logout } = useMemexLogin();

  const handleProfileClick = async () => {
    if (username && userTag) {
      // MEMEX 프로필 페이지로 이동 (backgroundApi를 통해 탭 URL 변경)
      try {
        await backgroundApi.navigateToUrl(
          `https://app.memex.xyz/profile/${username}/${userTag}`
        );
      } catch (err) {
        console.error("프로필 이동 실패:", err);
      }
    }
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
          <span>MemeX Profile</span>
        </button>
        <div
          className="user-info"
          onClick={onNavigateToProfile}
          style={{ cursor: "pointer" }}
        >
          <span className="user-name">{username || "User"}</span>
          <img
            src={profileImageUrl || mockUserData.profileImage}
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
        <button className="menu-item" onClick={onNavigateToMyGames}>
          <span className="menu-icon">🎮</span>
          <span className="menu-text">내가 참여하고 있는 게임</span>
          <span className="menu-arrow">▶</span>
        </button>

        <button className="menu-item" onClick={onNavigateToLeaderboard}>
          <span className="menu-icon">🏆</span>
          <span className="menu-text">리더 보드</span>
          <span className="menu-arrow">▶</span>
        </button>

        <button className="menu-item" onClick={onNavigateToMyAssets}>
          <span className="menu-icon">💰</span>
          <span className="menu-text">나의 보유 자산 확인</span>
          <span className="menu-arrow">▶</span>
        </button>
      </section>

      {/* Wallet Address Footer */}
      <footer className="dashboard-footer">
        <span className="wallet-label">Connected:</span>
        <span className="wallet-address">
          {shortenAddress(walletAddress || mockUserData.walletAddress)}
        </span>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </footer>
    </div>
  );
}
