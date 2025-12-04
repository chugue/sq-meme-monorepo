import "./Dashboard.css";
import { useMemexLogin } from "./hooks/useMemexLogin";

// Assets imports
import homeBg from "../../assets/home.png";
import homeBanner from "../../assets/home_banner.png";
import homeFloor from "../../assets/home_floor.png";
import howToPlayIcon from "../../assets/how_to_play.png";
import logoIcon from "../../assets/logo.png";
import moneyIcon from "../../assets/money.png";
import profileBanner from "../../assets/profile_banner.png";
import profileBox from "../../assets/profile_box.png";
import questIcon from "../../assets/quest.png";
import tropyIcon from "../../assets/tropy.png";

import { useAtomValue } from "jotai";
import { sessionAtom } from "./atoms/sessionAtoms";
import { useSidepanelWallet } from "./hooks/useSidepanelWallet";

// Mock data
const mockUserData = {
  profileImage:
    "https://cdn.memex.xyz/memex/prod/v1/profileImage/842310_e3c.jpeg",
  walletAddress: "0x13a90df0418e2a2c7e5801cb75d0a0e00319bdd1",
  asset: "1,000,000$M",
};

interface DashboardProps {
  walletAddress?: string;
  onNavigateToProfile?: () => void;
  onNavigateToLeaderboard?: () => void;
  onNavigateToMyGames?: () => void;
  onNavigateToMyAssets?: () => void;
  onNavigateToHowToPlay?: () => void;
  onNavigateToQuest?: () => void;
}

export function Dashboard({
  walletAddress: walletAddressProp,
  onNavigateToProfile,
  onNavigateToLeaderboard,
  onNavigateToMyGames,
  onNavigateToMyAssets,
  onNavigateToHowToPlay,
  onNavigateToQuest,
}: DashboardProps) {
  const { username, userTag, profileImageUrl, logout, tokenSymbol } =
    useMemexLogin();
  const { address: walletAddressFromHook } = useSidepanelWallet();
  const session = useAtomValue(sessionAtom);
  const { user } = session;

  // 지갑 주소 우선순위: props > hook > null
  const walletAddress = walletAddressProp || walletAddressFromHook || null;

  const shortenAddress = (address: string | null) => {
    if (!address) return "Not Connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="dashboard-container">
      {/* Background Images */}
      <div className="dashboard-background">
        <img src={homeBg} alt="Background" className="bg-image" />
        <img src={homeFloor} alt="Floor" className="floor-image" />
      </div>

      {/* Left Top: Profile Box with Image */}
      <button className="profile-btn" onClick={onNavigateToProfile}>
        <div className="profile-box-container">
          <img
            src={profileBox}
            alt="Profile Box"
            className="profile-box-frame"
          />
          <img
            src={profileImageUrl}
            alt="Profile"
            className="profile-box-image"
          />
        </div>
        <img
          src={profileBanner}
          alt="Profile Banner"
          className="profile-banner"
        />
      </button>

      {/* Right: Menu Icons (Vertical) */}
      <div className="menu-icons-vertical">
        <button
          className="menu-icon-btn"
          onClick={onNavigateToHowToPlay}
          title="How to Play"
        >
          <img src={howToPlayIcon} alt="How toPlay" />
          <span className="menu-icon-btn-text">
            How to
            <br />
            Play
          </span>
        </button>
        <button
          className="menu-icon-btn"
          onClick={onNavigateToQuest}
          title="Quest"
        >
          <img src={questIcon} alt="Quest" />
          <span className="menu-icon-btn-text">Quest</span>
        </button>
        <button
          className="menu-icon-btn"
          onClick={onNavigateToLeaderboard}
          title="Leader Board"
        >
          <img src={tropyIcon} alt="Leader Board" />
          <span className="menu-icon-btn-text">
            <span>Leader</span>
            <span>Board</span>
          </span>
        </button>
        <button
          className="menu-icon-btn"
          onClick={onNavigateToMyAssets}
          title="My Memecoins"
        >
          <img src={moneyIcon} alt="My Memecoins" />
          <span className="menu-icon-btn-text">
            My
            <br />
            Memecoins
          </span>
        </button>
      </div>

      {/* Main Content: Squid Character and Asset Display */}
      <section className="main-content">
        <div className="squid-character-container">
          {/* <img src={squidoGif} alt="Squid Character-main" className="squid-character-main" /> */}
          <div className="asset-display-main">
            <span className="asset-label-main">ASSET</span>
            <span className="asset-amount-main">{mockUserData.asset}</span>
          </div>
        </div>
      </section>

      {/* Bottom: Logo and Live Game Banner */}
      <div className="bottom-section">
        <img src={logoIcon} alt="Logo" className="logo-image" />
        <button className="live-game-banner" onClick={onNavigateToMyGames}>
          <img src={homeBanner} alt="Live Games" className="banner-image" />
          <span className="live-game-banner-text">Live Games</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="dashboard-footer">
        <span className="wallet-label">Connected:</span>
        <span className="wallet-address">{shortenAddress(walletAddress)}</span>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </footer>
    </div>
  );
}
