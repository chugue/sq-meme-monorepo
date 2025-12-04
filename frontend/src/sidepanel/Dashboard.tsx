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

// Default data (세션 데이터가 없을 때 사용)
const defaultUserData = {
  profileImage:
    "https://cdn.memex.xyz/memex/prod/v1/profileImage/842310_e3c.jpeg",
};

// mTokenBalance 포맷팅 (콤마 추가)
function formatMTokenBalance(balance: string | undefined): string {
  if (!balance || balance === "0") return "0$M";
  try {
    const num = BigInt(balance);
    return `${num.toLocaleString()} $M`;
  } catch {
    return "0$M";
  }
}

interface DashboardProps {
  walletAddress?: string;
  onNavigateToProfile?: () => void;
  onNavigateToLeaderboard?: () => void;
  onNavigateToLiveGames?: () => void;
  onNavigateToMyAssets?: () => void;
  onNavigateToHowToPlay?: () => void;
  onNavigateToQuest?: () => void;
}

export function Dashboard({
  walletAddress: walletAddressProp,
  onNavigateToProfile,
  onNavigateToLeaderboard,
  onNavigateToLiveGames,
  onNavigateToMyAssets,
  onNavigateToHowToPlay,
  onNavigateToQuest,
}: DashboardProps) {
  const { logout } = useMemexLogin();
  const { address: walletAddressFromHook } = useSidepanelWallet();
  const session = useAtomValue(sessionAtom);
  const { user } = session;

  // 디버깅: 세션 데이터 변화 확인
  console.log(
    "🏠 [Dashboard] session user:",
    user?.userName,
    "profileImage:",
    user?.profileImage,
    "mTokenBalance:",
    user?.mTokenBalance
  );

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
            src={user?.profileImage || defaultUserData.profileImage}
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
            {/* <span className="asset-amount-main">{formatMTokenBalance(user?.mTokenBalance)}</span> */}
            <span className="asset-amount-main">
              {formatMTokenBalance("1000000000")}
            </span>
          </div>
        </div>
      </section>
      ㄴ{/* Bottom: Logo and Live Game Banner */}
      <button className="bottom-section" onClick={onNavigateToLiveGames}>
        <img src={logoIcon} alt="Logo" className="logo-image" />
        <div className="live-game-banner">
          <img src={homeBanner} alt="Live Games" className="banner-image" />
          <span className="live-game-banner-text">Live Games</span>
        </div>
      </button>
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
