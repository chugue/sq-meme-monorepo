import { useAtomValue } from "jotai";
import { ChevronRight } from "lucide-react";
import { sessionAtom } from "./atoms/sessionAtoms";
import "./ProfileModal.css";

// Mock data
const mockUserData = {
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=squid",
};

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const session = useAtomValue(sessionAtom);
    const { user } = session;

    const handleMemexProfile = () => {
        // MEMEX 프로필 페이지로 이동
        window.open("https://app.memex.xyz/profile", "_blank");
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="profile-modal-overlay" onClick={handleOverlayClick}>
            <div className="profile-modal">
                {/* Title */}
                <div className="profile-title-container">
                    <span className="profile-title-shadow">PROFILE</span>
                    <h1 className="profile-title">PROFILE</h1>
                </div>

                {/* User Info Section */}
                <div className="profile-user-section">
                    <div className="profile-avatar">
                        <img
                            src={
                                user?.profileImage || mockUserData.profileImage
                            }
                            alt="Profile"
                            className="profile-avatar-image"
                        />
                    </div>
                    <div className="profile-user-info">
                        <span className="profile-username">
                            @{user?.userName || "User"}
                        </span>
                        <button
                            className="memex-profile-btn"
                            onClick={handleMemexProfile}
                        >
                            MY MEMEX PROFILE <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* MY GAMES Section - Placeholder for future */}
                <div className="my-games-section">
                    <h2 className="my-games-title">MY GAMES</h2>
                    <div className="games-list">
                        {/* 게임 목록이 없을 때 표시 */}
                        <div className="no-games">
                            <span>No games yet</span>
                        </div>
                    </div>
                </div>

                {/* Close Button */}
                <button className="close-btn" onClick={onClose}>
                    CLOSE
                </button>
            </div>
        </div>
    );
}
