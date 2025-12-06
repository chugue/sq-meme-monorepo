import { backgroundApi } from "@/contents/lib/backgroundApi";
import { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import { GameRankItem, MostCommentUserRankItem, PrizeRankItem } from "../types/response.types";
import { TopBar } from "./components";
import RankBadge from "./components/RankBadge";
import "./LeaderboardPage.css";

// Mock data
const mockUserData = {
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=squid",
};

type TabType = "best memes" | "most winnings" | "most comments";

interface TabItem {
    id: TabType;
    label: string;
    icon?: string;
}

const tabs: TabItem[] = [
    { id: "best memes", label: "Best Memes", icon: "/icon/leaderboard/king.png" },
    { id: "most winnings", label: "Most Winnings", icon: "/icon/leaderboard/rank.png" },
    { id: "most comments", label: "Most Comments", icon: "/icon/leaderboard/wing.png" },
];

export function LeaderboardPage() {
    const [activeTab, setActiveTab] = useState<TabType>("best memes");

    // API 데이터 상태
    const [bestMemes, setBestMemes] = useState<GameRankItem[]>([]);
    const [prizeRanking, setPrizeRanking] = useState<PrizeRankItem[]>([]);
    const [commentLeaders, setCommentLeaders] = useState<MostCommentUserRankItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 컴포넌트 로드 시 네 API 동시 호출
    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);

            try {
                const [myGamesRes, prizeRes, questRes] = await Promise.all([
                    backgroundApi.getBestMemes(),
                    backgroundApi.getPrizeRanking(),
                    backgroundApi.getMostComments(),
                ]);

                setBestMemes(myGamesRes.gameRanking);
                setPrizeRanking(prizeRes.prizeRanking);
                setCommentLeaders(questRes.mostComments);
                console.log("✅ [LeaderboardPage] 데이터 로드 완료");
            } catch (error) {
                console.error("❌ [LeaderboardPage] 데이터 로드 실패:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, []);

    const getPrizePoolStyle = useCallback((rank: number, currentPrizePool: string) => {
        const baseStyle = "font-pretendard font-regular text-base p-2 border rounded-full";

        if (rank === 1) {
            return (
                <div className={`${baseStyle} border-gold-dark`}>
                    <span className="text-gold-dark">{currentPrizePool}</span>
                </div>
            );
        } else if (rank === 2) {
            return <div className={`${baseStyle}  border-[#6A6878]  text-[#6A6878]`}>{currentPrizePool}</div>;
        } else if (rank === 3) {
            return <div className={`${baseStyle}  border-[#654A35] text-[#654A35]`}>{currentPrizePool}</div>;
        } else {
            return <div className={`${baseStyle}  text-[#6B4F25]`}>{currentPrizePool}</div>;
        }
    }, []);

    const renderGamesTab = useCallback(
        () => (
            <div className="flex flex-col gap-4 px-5 w-full mt-5 relative">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-brown-3 border-t-gold-base rounded-full animate-spin mb-4"></div>
                        <span className="text-base text-brown-6 font-pretendard">Loading games...</span>
                    </div>
                ) : bestMemes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <span className="text-lg text-brown-6 font-pretendard">No memes yet</span>
                    </div>
                ) : (
                    bestMemes.map((game) => (
                        <div key={game.tokenAddress} className="flex items-center gap-2 bg-[#2D2119] p-3 rounded-xl w-full relative">
                            <RankBadge rank={game.rank} />
                            <div className="w-10 h-10 rounded-full overflow-hidden">
                                {game.tokenImage ? <img src={game.tokenImage} alt={game.tokenSymbol || ""} /> : "🎮"}
                            </div>
                            <span className="text-lg text-white flex-1">{game.tokenSymbol}</span>
                            <div className={`relative z-20`}>
                                {getPrizePoolStyle(game.rank, Number(formatEther(BigInt(game?.totalPrize || "0"))).toLocaleString())}
                            </div>
                        </div>
                    ))
                )}
            </div>
        ),
        [bestMemes, isLoading, getPrizePoolStyle],
    );

    const renderPrizeRankTab = () => (
        <div className="flex flex-col gap-4 px-5 w-full mt-5 relative">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-brown-3 border-t-gold-base rounded-full animate-spin mb-4"></div>
                    <span className="text-base text-brown-6 font-pretendard">Loading rankings...</span>
                </div>
            ) : prizeRanking.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <span className="text-lg text-brown-6 font-pretendard">No prize ranking data</span>
                </div>
            ) : (
                prizeRanking.map((user) => (
                    <div key={user.rank} className="flex items-center gap-2 bg-[#2D2119] p-3 rounded-xl w-full relative">
                        <RankBadge rank={user.rank} />
                        <img
                            src={user.profileImage || mockUserData.profileImage}
                            alt={user.username || "User"}
                            className="w-10 h-10 rounded-full overflow-hidden "
                        />
                        <span className="text-base text-white flex-1">{user.username || "Anonymous"}</span>
                        <div className={`relative `}>{getPrizePoolStyle(user.rank, Number(user?.totalAmount || "0").toLocaleString())}</div>
                    </div>
                ))
            )}
        </div>
    );

    // 퀘스트를 type별로 그룹화

    const renderCommentsTab = () => (
        <div className="flex flex-col gap-4 px-5 w-full mt-5 relative">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-brown-3 border-t-gold-base rounded-full animate-spin mb-4"></div>
                    <span className="text-base text-brown-6 font-pretendard">Loading comments...</span>
                </div>
            ) : commentLeaders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <span className="text-lg text-brown-6 font-pretendard">No comment leaders data</span>
                </div>
            ) : (
                commentLeaders.map((user) => (
                    <div key={user.rank} className="flex items-center gap-2 bg-[#2D2119] p-3 rounded-xl w-full relative">
                        <RankBadge rank={user.rank} />
                        <img
                            src={user.profileImage || mockUserData.profileImage}
                            alt={user.username || "User"}
                            className="w-10 h-10 rounded-full overflow-hidden"
                        />
                        <span className="text-base text-white flex-1">{user.username || "Anonymous"}</span>
                        <div className="flex items-center gap-2 relative">
                            <img
                                src="/icon/leaderboard/text_popup.png"
                                alt="Comment count"
                                className="h-5 object-contain"
                                style={{ imageRendering: "pixelated" }}
                            />
                            <span className={`text-base font-pretendard font-regular ${user.rank < 4 ? "text-brown-7 " : "text-brown-3"}`}>
                                {user.commentCount.toLocaleString()}
                            </span>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="relative z-30 backdrop-blur bg-brown-0/95 flex flex-col min-h-screen">
            {/* Header */}
            <TopBar />

            <div className="flex items-center justify-center gap-x-3 py-3 mx-5 mt-5">
                <img src="/icon/trophy.png" className="w-14 h-14" style={{ imageRendering: "pixelated" }} />
                <span className="text-3xl font-bold text-gold-gradient-smooth uppercase">Leader Board</span>
            </div>

            {/* Tabs */}
            <div className="px-5 max-w-xl flex gap-5 mt-5">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            className={`flex-1 border-t-2 border-x-2 border-r-gray-900 p-3 flex flex-col items-center gap-2 ${
                                isActive ? "border-gold-base" : "border-gray-600"
                            }`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon && (
                                <img
                                    src={tab.icon}
                                    className={`w-14 h-14 ${!isActive ? "opacity-20 " : ""}`}
                                    style={{ imageRendering: "pixelated" }}
                                    alt={tab.label}
                                />
                            )}
                            <span className={isActive ? "text-gold-gradient-smooth" : "text-gold-gradient-smooth opacity-50"}>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <section className="bg-[#120705]/80 flex flex-col items-center justify-start flex-1 relative pb-10">
                {activeTab === "best memes" && renderGamesTab()}
                {activeTab === "most winnings" && renderPrizeRankTab()}
                {activeTab === "most comments" && renderCommentsTab()}
            </section>
        </div>
    );
}
