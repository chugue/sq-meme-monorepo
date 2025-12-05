import { ChevronLeft, Home, RefreshCw } from "lucide-react";
import { useMemexLogin } from "./hooks/useMemexLogin";
import { useWalletAssets } from "./hooks/useWalletAssets";
import "./MyAssetsPage.css";

// Mock data
const mockUserData = {
  profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=squid",
};

interface MyAssetsPageProps {
  onBack: () => void;
  onNavigateToProfile?: () => void;
}

export function MyAssetsPage({ onBack, onNavigateToProfile }: MyAssetsPageProps) {
  const { username, profileImageUrl, tokenSymbol } = useMemexLogin();
  const { assets, isLoading, error, refetch } = useWalletAssets();

  return (
    <div className="my-assets-container">
      {/* Header */}
      <header className="my-assets-header">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={24} />
          <Home size={20} />
        </button>
        <div className="header-user-info">
          <button
            className="refresh-btn"
            onClick={refetch}
            disabled={isLoading}
            title="새로고침"
          >
            <RefreshCw size={16} className={isLoading ? "spinning" : ""} />
          </button>
          <span className="header-username">{username || "User"}</span>
          <img
            src={profileImageUrl || mockUserData.profileImage}
            alt="Profile"
            className="header-profile-image"
            onClick={onNavigateToProfile}
            style={{ cursor: onNavigateToProfile ? "pointer" : "default" }}
          />
        </div>
      </header>

      {/* Assets List */}
      <section className="my-assets-content">
        {/* 에러 표시 */}
        {error && <div className="assets-error">{error}</div>}

        {/* 로딩 중 */}
        {isLoading && !assets.native && assets.tokens.length === 0 && (
          <div className="assets-loading">토큰 목록 로딩 중...</div>
        )}

        {/* Native Coin (M) */}
        {assets.native && (
          <div className="asset-card">
            <div className="asset-icon-wrapper">
              <img
                src="/icon/memex.png"
                alt={assets.native.symbol}
                className="asset-icon-image"
              />
            </div>
            <div className="asset-info">
              <span className="asset-symbol">${assets.native.symbol}</span>
              <div className="asset-balance-box">
                <span className="asset-balance">
                  {assets.native.balanceFormatted}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ERC-20 Tokens */}
        {assets.tokens.map((token) => (
          <div key={token.contractAddress} className="asset-card">
            <div className="asset-icon-wrapper emoji">
              <span className="asset-emoji">
                {token.symbol === tokenSymbol ? "🪙" : "💰"}
              </span>
            </div>
            <div className="asset-info">
              <span className="asset-symbol">${token.symbol}</span>
              <div className="asset-balance-box">
                <span className="asset-balance">{token.balanceFormatted}</span>
              </div>
            </div>
          </div>
        ))}

        {/* 토큰이 없을 때 */}
        {!isLoading &&
          !assets.native &&
          assets.tokens.length === 0 &&
          !error && <div className="assets-empty">보유한 토큰이 없습니다.</div>}
      </section>
    </div>
  );
}
