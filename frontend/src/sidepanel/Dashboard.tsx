import "./Dashboard.css";
import { useMemexLogin } from "./hooks/useMemexLogin";

// Assets imports
import homeBanner from "../../assets/home_banner.png";
import howToPlayIcon from "../../assets/how_to_play.png";
import logoIcon from "../../assets/logo.png";
import moneyIcon from "../../assets/money.png";
import profileBanner from "../../assets/profile_banner.png";
import profileBox from "../../assets/profile_box.png";
import questIcon from "../../assets/quest.png";
import tropyIcon from "../../assets/tropy.png";

import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { PAGES, setPageAtom } from "./atoms/pageAtoms";
import { sessionAtom } from "./atoms/sessionAtoms";
import { useSidepanelWallet } from "./hooks/useSidepanelWallet";
import { getAllSessionStorage } from "./lib/sessionStorage";

// Default data (세션 데이터가 없을 때 사용)
const defaultUserData = {
    profileImage: "https://cdn.memex.xyz/memex/prod/v1/profileImage/842310_e3c.jpeg",
};

// mTokenBalance 포맷팅 (콤마 추가)
function formatMTokenBalance(balance: string | undefined): string {
    if (!balance || balance === "0") return "0$M";
    try {
        const num = BigInt(balance);
        return `${num.toLocaleString()} $M`;
    } catch {
        return "0$M";
    }
}

interface DashboardProps {
    walletAddress?: string;
}

export function Dashboard({ walletAddress: walletAddressProp }: DashboardProps) {
    const { logout } = useMemexLogin();
    const { address: walletAddressFromHook } = useSidepanelWallet();
    const session = useAtomValue(sessionAtom);
    const { user } = session;
    const setPage = useSetAtom(setPageAtom);

    // 디버깅: 세션 데이터 변화 확인
    useEffect(() => {
        console.log("🏠 [Dashboard] session 전체:", JSON.stringify(session, null, 2));
        console.log("🏠 [Dashboard] session user:", user?.userName, "profileImage:", user?.profileImage, "mTokenBalance:", user?.mTokenBalance);
        // 전체 세션 스토리지 데이터 확인
        getAllSessionStorage().then((data) => {
            console.log("🏠 [Dashboard] 전체 세션 스토리지:", JSON.stringify(data, null, 2));
        });
    }, [user, session]);

    // 지갑 주소 우선순위: props > hook > null
    const walletAddress = walletAddressProp || walletAddressFromHook || null;

    const shortenAddress = (address: string | null) => {
        if (!address) return "Not Connected";
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <div className="dashboard-container relative z-20">
            {/* Left Top: Profile Box with Image */}
            <button className="profile-btn">
                <div className="profile-box-container">
                    <img src={profileBox} alt="Profile Box" className="profile-box-frame" />
                    <img src={user?.profileImage || defaultUserData.profileImage} alt="Profile" className="profile-box-image" />
                </div>
                <img src={profileBanner} alt="Profile Banner" className="profile-banner" />
            </button>
            {/* Right: Menu Icons (Vertical) */}
            <div className="menu-icons-vertical">
                <button
                    className="menu-icon-btn"
                    onClick={() => {
                        // TODO: How to Play 페이지 구현
                        console.log("How to Play clicked");
                    }}
                    title="How to Play"
                >
                    <img src={howToPlayIcon} alt="How toPlay" />
                    <span className="menu-icon-btn-text">
                        How to
                        <br />
                        Play
                    </span>
                </button>
                <button className="menu-icon-btn" onClick={() => setPage(PAGES.QUESTS)} title="Quest">
                    <img src={questIcon} alt="Quest" />
                    <span className="menu-icon-btn-text">Quest</span>
                </button>
                <button className="menu-icon-btn" onClick={() => setPage(PAGES.LEADERBOARD)} title="Leader Board">
                    <img src={tropyIcon} alt="Leader Board" />
                    <span className="menu-icon-btn-text">
                        <span>Leader</span>
                        <span>Board</span>
                    </span>
                </button>
                <button className="menu-icon-btn" onClick={() => setPage(PAGES.MY_ASSETS)} title="My Memecoins">
                    <img src={moneyIcon} alt="My Memecoins" />
                    <span className="menu-icon-btn-text">
                        My
                        <br />
                        Memecoins
                    </span>
                </button>
            </div>
            {/* Main Content: Squid Character and Asset Display */}
            <section className="main-content">
                <div className="squid-character-container">
                    {/* <img src={squidoGif} alt="Squid Character-main" className="squid-character-main" /> */}
                    <div className="asset-display-main">
                        <span className="asset-label-main">ASSET</span>
                        {/* <span className="asset-amount-main">{formatMTokenBalance(user?.mTokenBalance)}</span> */}
                        <span className="asset-amount-main">{formatMTokenBalance("1000000000")}</span>
                    </div>
                </div>
            </section>
            {/* Bottom: Logo and Live Game Banner */}
            <button className="bottom-section" onClick={() => setPage(PAGES.LIVE_GAMES)}>
                <img src={logoIcon} alt="Logo" className="logo-image" />
                <div className="live-game-banner">
                    <img src={homeBanner} alt="Live Games" className="banner-image" />
                    <span className="live-game-banner-text">Live Games</span>
                </div>
            </button>
            {/* Footer */}
            <footer className="dashboard-footer">
                <span className="wallet-label">Connected:</span>
                <span className="wallet-address">{shortenAddress(walletAddress)}</span>
                <button className="logout-btn" onClick={logout}>
                    Logout
                </button>
            </footer>
        </div>
    );
}
