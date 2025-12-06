import ProfileBox from "@/assets/profile_box.png";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { sessionAtom } from "../atoms/sessionAtoms";
import { ProfileModal } from "./ProfileModal/ProfileModal";

export default function ProfileSection() {
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const session = useAtomValue(sessionAtom);
    const { user } = session;

    return (
        <div className="flex items-center ml-auto gap-x-2">
            <div className="flex flex-col items-end justify-center gap-y-2">
                <span className="text-base font-regular text-gold-gradient-smooth">{user?.userName}</span>
                <span className="text-xs font-regular text-gold-gradient-smooth">#{user?.userTag}</span>
            </div>

            <div>
                {user && user?.profileImage && (
                    <div onClick={() => setIsProfileModalOpen(true)} className="relative w-16 h-16 overflow-hidden p-1 cursor-pointer">
                        <img src={ProfileBox} className="w-full h-full absolute inset-0" />
                        <img src={user.profileImage} alt="Profile" className="w-full h-full" />
                    </div>
                )}
            </div>


            {/* Profile Modal */}
            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </div>
    );
}

