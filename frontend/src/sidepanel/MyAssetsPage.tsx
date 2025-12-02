import { ChevronLeft, Home } from "lucide-react";
import { useMemexLogin } from "./hooks/useMemexLogin";
import "./MyAssetsPage.css";

// Mock data
const mockUserData = {
  profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=squid",
};

const mockOtherAssets = [
  {
    icon: "🦑",
    symbol: "SQUID",
    balance: "1,500,000",
  },
  {
    icon: "🐸",
    symbol: "PEPE",
    balance: "25,000,000",
  },
  {
    icon: "🐕",
    symbol: "DOGE",
    balance: "100,000",
  },
];

interface MyAssetsPageProps {
  onBack: () => void;
}

export function MyAssetsPage({ onBack }: MyAssetsPageProps) {
  const { username, profileImageUrl, tokenSymbol } = useMemexLogin();

  // 숫자 포맷 (쉼표 추가)
  const formatNumber = (num: string | number) => {
    return Number(num).toLocaleString();
  };

  // Mock balance data
  const memexBalance = 10923809128309;
  const myCoinBalance = 10923809128309;

  return (
    <div className="my-assets-container">
      {/* Header */}
      <header className="my-assets-header">
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

      {/* Assets List */}
      <section className="my-assets-content">
        {/* MEMEX Token */}
        <div className="asset-card">
          <div className="asset-icon-wrapper">
            <img
              src="/icon/memex.png"
              alt="MEMEX"
              className="asset-icon-image"
            />
          </div>
          <div className="asset-info">
            <span className="asset-symbol">$M</span>
            <div className="asset-balance-box">
              <span className="asset-balance">{formatNumber(memexBalance)}</span>
            </div>
          </div>
        </div>

        {/* My Coin */}
        <div className="asset-card">
          <div className="asset-icon-wrapper">
            <img
              src={profileImageUrl || mockUserData.profileImage}
              alt="My Coin"
              className="asset-icon-image"
            />
          </div>
          <div className="asset-info">
            <span className="asset-symbol">${tokenSymbol || "TOKEN"}</span>
            <div className="asset-balance-box">
              <span className="asset-balance">{formatNumber(myCoinBalance)}</span>
            </div>
          </div>
        </div>

        {/* Other Assets */}
        {mockOtherAssets.map((asset) => (
          <div key={asset.symbol} className="asset-card">
            <div className="asset-icon-wrapper emoji">
              <span className="asset-emoji">{asset.icon}</span>
            </div>
            <div className="asset-info">
              <span className="asset-symbol">${asset.symbol}</span>
              <div className="asset-balance-box">
                <span className="asset-balance">{asset.balance}</span>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
