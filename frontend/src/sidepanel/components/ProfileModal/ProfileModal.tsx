import { useAtomValue } from "jotai";
import { sessionAtom } from "../../atoms/sessionAtoms";
import { MyGamesSection } from "./MyGamesSection";
import { UserInfoSection } from "./UserInfoSection";
import "./ProfileModal.css";

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const session = useAtomValue(sessionAtom);
    const { user } = session;

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
                <UserInfoSection profileImage={user?.profileImage} userName={user?.userName} userTag={user?.userTag} />

                {/* MY GAMES Section */}
                <MyGamesSection isOpen={isOpen} />

                {/* Close Button */}
                <button className="close-btn" onClick={onClose}>
                    CLOSE
                </button>
            </div>
        </div>
    );
}
