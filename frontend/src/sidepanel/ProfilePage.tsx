import { useAtomValue } from "jotai";
import { ChevronLeft, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { ProfilePageData } from "../types/response.types";
import { backgroundApi } from "../contents/lib/backgroundApi";
import { sessionAtom } from "./atoms/sessionAtoms";
import { useMemexLogin } from "./hooks/useMemexLogin";
import "./ProfilePage.css";

// Mock data
const mockUserData = {
  profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=squid",
  walletAddress: "0x13a90df0418e2a2c7e5801cb75d0a0e00319bdd1",
};

interface ProfilePageProps {
  walletAddress?: string;
  onBack: () => void;
}

export function ProfilePage({ walletAddress, onBack }: ProfilePageProps) {
  const { logout } = useMemexLogin();
  const session = useAtomValue(sessionAtom);
  const { user } = session;
  const [profileData, setProfileData] = useState<ProfilePageData | null>(null);

  // 컴포넌트 로드 시 프로필 데이터 조회
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const result = await backgroundApi.getProfile();
        setProfileData(result);
        console.log("✅ [ProfilePage] 프로필 데이터 조회 완료:", result);
      } catch (error) {
        console.error("❌ [ProfilePage] 프로필 데이터 조회 실패:", error);
      }
    };

    fetchProfile();
  }, []);

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
          <span className="header-username">{user?.userName || "User"}</span>
          <img
            src={user?.profileImage || mockUserData.profileImage}
            alt="Profile"
            className="header-profile-image"
          />
        </div>
      </header>

      {/* Character Display */}
      <section className="profile-character-section">
        <div className="character-circle">
          <img
            src={user?.profileImage || mockUserData.profileImage}
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
            <span className="info-value">{user?.userName || "User"}</span>
          </div>
        </div>

        {/* Connected Wallet */}
        <div className="info-group">
          <label className="info-label">Connected Wallet</label>
          <div className="info-input-wrapper">
            <span className="info-value wallet">
              {shortenAddress(
                user?.walletAddress || mockUserData.walletAddress
              )}
            </span>
          </div>
        </div>

        {/* MEMEX Wallet Address */}
        <div className="info-group">
          <label className="info-label">MEMEX Wallet</label>
          <div className="info-input-wrapper">
            <span className="info-value wallet">
              {user?.memexWalletAddress
                ? shortenAddress(user?.memexWalletAddress)
                : "Not connected"}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-label">comments</span>
            <span className="stat-value">{profileData?.commentCounts ?? 0}</span>
          </div>
        </div>
        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-label">Streak</span>
            <span className="stat-value">
              {profileData?.streakDays ?? 0} <span className="stat-unit">days</span>
            </span>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="profile-actions">
        <button
          className="action-btn check-assets-btn"
          onClick={handleCheckAssets}
        >
          Check My Assets
        </button>
        <button className="action-btn logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </section>
    </div>
  );
}
