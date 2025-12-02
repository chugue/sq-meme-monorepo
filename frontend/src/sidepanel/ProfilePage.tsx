import { useState } from "react";
import { ChevronLeft, Home } from "lucide-react";
import { useMemexLogin } from "./hooks/useMemexLogin";
import "./ProfilePage.css";

// Mock data
const mockUserData = {
  profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=squid",
  walletAddress: "0x13a90df0418e2a2c7e5801cb75d0a0e00319bdd1",
  comments: 23,
  streak: 5,
};

interface ProfilePageProps {
  walletAddress?: string;
  onBack: () => void;
}

export function ProfilePage({ walletAddress, onBack }: ProfilePageProps) {
  const { username, profileImageUrl, logout } = useMemexLogin();
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState(username || "");

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleUsernameChange = () => {
    // TODO: 실제 username 변경 API 호출
    setIsEditingUsername(false);
    console.log("Username changed to:", editedUsername);
  };

  const handleCheckAssets = () => {
    // TODO: 자산 확인 페이지로 이동 또는 모달 표시
    console.log("Check assets clicked");
  };

  const handleLogout = () => {
    logout();
    onBack();
  };

  return (
    <div className="profile-container">
      {/* Header */}
      <header className="profile-header">
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

      {/* Character Display */}
      <section className="profile-character-section">
        <div className="character-circle">
          <img
            src={profileImageUrl || mockUserData.profileImage}
            alt="Character"
            className="character-image"
          />
        </div>
      </section>

      {/* Profile Info */}
      <section className="profile-info-section">
        {/* Username */}
        <div className="info-group">
          <label className="info-label">Username</label>
          <div className="info-input-wrapper">
            {isEditingUsername ? (
              <input
                type="text"
                value={editedUsername}
                onChange={(e) => setEditedUsername(e.target.value)}
                className="info-input editing"
                autoFocus
              />
            ) : (
              <span className="info-value">{username || "CodingCat"}</span>
            )}
            <button
              className="change-btn"
              onClick={() => {
                if (isEditingUsername) {
                  handleUsernameChange();
                } else {
                  setIsEditingUsername(true);
                }
              }}
            >
              {isEditingUsername ? "저장" : "변경"}
            </button>
          </div>
        </div>

        {/* Connected Wallet */}
        <div className="info-group">
          <label className="info-label">ConnectedWallet</label>
          <div className="info-input-wrapper">
            <span className="info-value wallet">
              {shortenAddress(walletAddress || mockUserData.walletAddress)}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-label">comments</span>
            <span className="stat-value">{mockUserData.comments}</span>
          </div>
        </div>
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-label">Streak</span>
            <span className="stat-value">
              {mockUserData.streak} <span className="stat-unit">days</span>
            </span>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="profile-actions">
        <button className="action-btn check-assets-btn" onClick={handleCheckAssets}>
          Check My Assets
        </button>
        <button className="action-btn logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </section>
    </div>
  );
}
