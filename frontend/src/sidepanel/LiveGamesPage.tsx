import moneyLogo from "@/assets/money_logo.png";
import { useCallback, useEffect, useState } from "react";
import { backgroundApi } from "../contents/lib/backgroundApi";
import type { LiveGameItem } from "../types/response.types";
import { TopBar } from "./components";
import { ProfileModal } from "./components/ProfileModal/ProfileModal";
import { formatPrizePool } from "./components/ProfileModal/formatters";
import "./LiveGamesPage.css";

// endTime(ISO string)으로부터 남은 시간 계산
function calculateTimeLeft(endTime: string | null): string {
    if (!endTime) return "00:00:00";

    const now = Date.now();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return "00:00:00";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function LiveGamesPage() {
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [liveGames, setLiveGames] = useState<LiveGameItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 남은 시간 상태 (1초마다 업데이트)
    const [timeLeftMap, setTimeLeftMap] = useState<Record<string, string>>({});

    // API 호출
    const fetchLiveGames = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await backgroundApi.getLiveGames();
            setLiveGames(response.liveGames || []);
        } catch (err) {
            console.error("❌ Live games 조회 실패:", err);
            setError(err instanceof Error ? err.message : "게임 목록을 불러오는데 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 초기 로드
    useEffect(() => {
        fetchLiveGames();
    }, [fetchLiveGames]);

    // 1초마다 남은 시간 업데이트
    useEffect(() => {
        const updateTimeLeft = () => {
            const newTimeLeftMap: Record<string, string> = {};
            liveGames.forEach((game) => {
                newTimeLeftMap[game.gameId] = calculateTimeLeft(game.endTime);
            });
            setTimeLeftMap(newTimeLeftMap);
        };

        // 초기 계산
        updateTimeLeft();

        // 1초마다 업데이트
        const interval = setInterval(updateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [liveGames]);

    return (
        <div className="flex flex-col flex-1 relative py-[16px] ">
            <TopBar />

            {/* Profile Modal */}
            <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

            {/* Title */}
            <h1
                className="font-['Press_Start_2P'] text-[25px] leading-[130%] text-center uppercase my-[26px]"
                style={{
                    background: "linear-gradient(180deg, #FFFFFF 0%, #FFE685 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(0px 3px 0px #924435) drop-shadow(0px 0px 20px rgba(0,0,0,0.5))",
                }}
            >
                LIVE GAMES
            </h1>

            {/* Games List */}
            <section className="live-games-content">
                <div className="flex flex-col gap-[18px] px-[33px]">
                    {isLoading ? (
                        <div className="loading">Loading...</div>
                    ) : error ? (
                        <div className="empty-state">{error}</div>
                    ) : liveGames.length === 0 ? (
                        <div className="absolute top-[250px] left-0 right-0 flex justify-center items-center animate-fade-in-up">
                            <div className="chat-bubble border-[0.5px] border-white rounded-lg p-4 flex items-center ">
                                <div className="relative w-[100px] h-5 " />
                                <img
                                    src={moneyLogo}
                                    alt="Octopus with money"
                                    className="absolute bottom-0 -left-8 max-w-[120px] w-auto h-auto object-contain"
                                    style={{
                                        imageRendering: "pixelated",
                                    }}
                                />

                                <div className="text-xs text-white tracking-wide ">
                                    Looks like
                                    <br />
                                    No live games yet!
                                </div>
                            </div>
                        </div>
                    ) : (
                        liveGames.map((game) => (
                            <div
                                key={game.gameId}
                                className="flex items-center justify-between px-5 py-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                                style={{
                                    backgroundImage: "url('/icon/quests/quest_frame.png')",
                                    backgroundSize: "100% 100%",
                                    backgroundRepeat: "no-repeat",
                                    imageRendering: "pixelated",
                                }}
                                onClick={() => {
                                    if (game.tokenUsername && game.tokenUsertag) {
                                        backgroundApi.navigateToUrl(
                                            `https://app.memex.xyz/profile/${game.tokenUsername}/${game.tokenUsertag}`
                                        );
                                    }
                                }}
                            >
                                <div className="game-card-left">
                                    <div className="w-[50px] h-[50px] rounded-full overflow-hidden">
                                        <img
                                            src={game.tokenImageUrl || "/icon/default-token.png"}
                                            alt={game.tokenSymbol || "Token"}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <span className="game-token-symbol">{game.tokenSymbol || "???"}</span>
                                </div>
                                <div className="game-card-right">
                                    <span className="game-prize">{formatPrizePool(game.currentPrizePool)}</span>
                                    <span className="game-time">{timeLeftMap[game.gameId] || "00:00:00"}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
