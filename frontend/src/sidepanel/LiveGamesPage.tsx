import { ChevronLeft, Home } from "lucide-react";
import { useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { backgroundApi } from "../contents/lib/backgroundApi";
import { LiveGameItem } from "../types/response.types";
import { navigateBackAtom } from "./atoms/pageAtoms";
import { useMemexLogin } from "./hooks/useMemexLogin";
import { ProfileModal } from "./ProfileModal";
import "./LiveGamesPage.css";

// Mock data
const mockUserData = {
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=squid",
};

// 토큰 정보 기본값
const DEFAULT_TOKEN = {
    imageUrl: "https://cdn.memex.xyz/memex/prod/v1/profileImage/842298_fcb.png",
    symbol: "SQM",
    username: "SquidMeme",
    usertag: "85674A",
};

// wei를 ETH로 변환 (정수)
function formatPrizePool(prizePool: string | null): string {
    if (!prizePool) return "0";
    try {
        const wei = BigInt(prizePool);
        const eth = wei / BigInt(10 ** 18);
        return eth.toLocaleString();
    } catch {
        return "0";
    }
}

// 남은 시간 계산
function formatTimeLeft(endTime: string | null): string {
    if (!endTime) return "-";
    try {
        const end = new Date(endTime).getTime();
        const now = Date.now();
        const diff = end - now;

        if (diff <= 0) return "종료됨";

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
            (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        );
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    } catch {
        return "-";
    }
}

export function LiveGamesPage() {
    const { username, profileImageUrl } = useMemexLogin();
    const navigateBack = useSetAtom(navigateBackAtom);
    const [liveGames, setLiveGames] = useState<LiveGameItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    useEffect(() => {
        const fetchLiveGames = async () => {
            setIsLoading(true);
            try {
                const response = await backgroundApi.getLiveGames();
                setLiveGames(response.liveGames);
                console.log(
                    "✅ [LiveGamesPage] 라이브 게임 로드 완료:",
                    response.liveGames.length,
                );
            } catch (error) {
                console.error(
                    "❌ [LiveGamesPage] 라이브 게임 로드 실패:",
                    error,
                );
            } finally {
                setIsLoading(false);
            }
        };

        fetchLiveGames();
    }, []);

    return (
        <div className="my-games-container">
            {/* Header */}
            <header className="my-games-header">
                <button className="back-btn" onClick={() => navigateBack()}>
                    <ChevronLeft size={24} />
                    <Home size={20} />
                </button>
                <div className="header-user-info">
                    <span className="header-username">
                        {username || "User"}
                    </span>
                    <img
                        src={profileImageUrl || mockUserData.profileImage}
                        alt="Profile"
                        className="header-profile-image"
                        onClick={() => setIsProfileModalOpen(true)}
                        style={{ cursor: "pointer" }}
                    />
                </div>
            </header>

            {/* Profile Modal */}
            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />

            {/* Games List */}
            <section className="my-games-content">
                <div className="games-list">
                    {isLoading ? (
                        <div className="loading">Loading...</div>
                    ) : liveGames.length === 0 ? (
                        <div className="empty-state">
                            진행 중인 게임이 없습니다
                        </div>
                    ) : (
                        liveGames.map((game, index) => {
                            const tokenUsername = game.tokenUsername || DEFAULT_TOKEN.username;
                            const tokenUsertag = game.tokenUsertag || DEFAULT_TOKEN.usertag;
                            const profileUrl = `https://app.memex.xyz/profile/${tokenUsername}/${tokenUsertag}`;

                            return (
                                <div
                                    key={game.gameId}
                                    className="game-card"
                                    onClick={() => backgroundApi.navigateToUrl(profileUrl)}
                                    style={{ cursor: "pointer" }}
                                >
                                    <div className="game-card-left">
                                        <span className="game-rank">
                                            {index + 1}
                                        </span>
                                        <div className="game-token-image">
                                            <img
                                                src={
                                                    game.tokenImageUrl ||
                                                    DEFAULT_TOKEN.imageUrl
                                                }
                                                alt={
                                                    game.tokenSymbol ||
                                                    DEFAULT_TOKEN.symbol
                                                }
                                            />
                                        </div>
                                        <span className="game-token-symbol">
                                            {game.tokenSymbol ||
                                                DEFAULT_TOKEN.symbol}
                                        </span>
                                    </div>
                                    <div className="game-card-right">
                                        <div className="game-stat">
                                            <span className="stat-label">
                                                총 상금 현황
                                            </span>
                                            <span className="stat-value">
                                                {formatPrizePool(
                                                    game.currentPrizePool,
                                                )}{" "}
                                                {game.tokenSymbol ||
                                                    DEFAULT_TOKEN.symbol}
                                            </span>
                                        </div>
                                        <div className="game-stat">
                                            <span className="stat-label">
                                                남은 시간
                                            </span>
                                            <span className="stat-value time">
                                                {formatTimeLeft(game.endTime)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>
        </div>
    );
}
