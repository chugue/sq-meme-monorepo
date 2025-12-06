import ProfileBox from "@/assets/profile_box.png";
import { useAtomValue } from "jotai";
import { sessionAtom } from "../atoms/sessionAtoms";

export default function ProfileSection() {
    const session = useAtomValue(sessionAtom);
    const { user } = session;

    return (
        <div className="flex items-center ml-auto gap-x-2">
            <div className="flex flex-col items-end justify-center">
                <span className="text-base font-regular text-gold-gradient-smooth">{user?.userName}</span>
                <span className="text-xs font-regular text-gold-gradient-smooth">#{user?.userTag}</span>
            </div>

            <div>
                {user && user?.profileImage && (
                    <div className="relative w-16 h-16 overflow-hidden p-1">
                        <img src={ProfileBox} className="w-full h-full absolute inset-0" />
                        <img src={user.profileImage} alt="Profile" className="w-full h-full" />
                    </div>
                )}
            </div>
        </div>
    );
}

