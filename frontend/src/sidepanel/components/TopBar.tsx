import BackButton from "./BackButton";
import ProfileSection from "./ProfileSection";

export default function TopBar() {
    return (
        <div className="flex items-center px-5 h-24 w-full">
            <BackButton />
            <ProfileSection />
        </div>
    );
}

