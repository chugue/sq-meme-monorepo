import { ChevronRight } from "lucide-react";
import { backgroundApi } from "../../../contents/lib/backgroundApi";

const DEFAULT_PROFILE_IMAGE = "https://api.dicebear.com/7.x/avataaars/svg?seed=squid";

interface UserInfoSectionProps {
    profileImage?: string | null;
    userName?: string | null;
    userTag?: string | null;
}

export function UserInfoSection({ profileImage, userName, userTag }: UserInfoSectionProps) {
    const handleMemexProfile = () => {
        backgroundApi.navigateToUrl(`https://app.memex.xyz/profile/${userName}/${userTag}`);
    };

    return (
        <div className="profile-user-section">
            <div className="profile-avatar">
                <img src={profileImage || DEFAULT_PROFILE_IMAGE} alt="Profile" className="profile-avatar-image" />
            </div>
            <div className="profile-user-info">
                <span className="profile-username">@{userName || "User"}</span>
                <button className="memex-profile-btn" onClick={handleMemexProfile}>
                    MY MEMEX PROFILE <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
