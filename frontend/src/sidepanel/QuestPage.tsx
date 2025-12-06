import { useEffect, useState } from "react";
import { backgroundApi } from "../contents/lib/backgroundApi";
import { QuestItem } from "../types/response.types";
import TopBar from "./components/TopBar";

export default function QuestPage() {
    const [quests, setQuests] = useState<QuestItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchQuests = async () => {
            setIsLoading(true);
            try {
                const response = await backgroundApi.getQuests();
                setQuests(response.quests || []);
                console.log("✅ [QuestPage] 퀘스트 로드 완료:", response.quests?.length || 0);
            } catch (error) {
                console.error("❌ [QuestPage] 퀘스트 로드 실패:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuests();
    }, []);

    const getProgressPercentage = (current: number, target: number) => {
        return Math.min((current / target) * 100, 100);
    };

    const getQuestImage = (quest: QuestItem) => {
        // isClaimed이면 무조건 열린 박스
        if (quest.isClaimed) {
            return '/icon/quests/quest_box_open.png';
        }
        return '/icon/quests/quest_box_close.png';
    };

    // questType별로 그룹화
    const groupedQuests = quests.reduce((acc, quest) => {
        if (!acc[quest.type]) {
            acc[quest.type] = [];
        }
        acc[quest.type].push(quest);
        return acc;
    }, {} as Record<QuestTypes, QuestItem[]>);

    const handleClaim = (quest: QuestItem) => {
        // TODO: API 호출로 클레임 처리
        console.log('Claim quest:', quest);
    };

    // if (!user) return <div>Loading...</div>;

    return (
        <div
            className="flex flex-col items-center justify-center relative min-h-screen z-30 backdrop-blur bg-black/90"
        >
            <TopBar />

            <div className="flex items-center justify-center gap-x-5 pb-5">
                <img src='/icon/quests/quest_box_default.png' className="w-10 h-10" />
                <span className="text-2xl font-bold text-pixel-orange-gold uppercase">Quest</span>
            </div>

            <div className="w-full h-0.5 bg-gradient-main-1" />

            <div className="flex flex-col items-center justify-start gap-y-20 px-5 pt-10 flex-1 w-full overflow-y-auto">
                {isLoading ? (
                    <div className="text-pixel-gray">Loading...</div>
                ) : Object.keys(groupedQuests).length === 0 ? (
                    <div className="text-pixel-gray">No quests available.</div>
                ) : (
                    Object.entries(groupedQuests).map(([type, typeQuests]) => (
                        <div key={type} className="flex flex-col items-center justify-center gap-y-5 w-full max-w-xl">
                            <div className="text-xl font-bold text-pixel-orange-gold uppercase">
                                {type} quest
                            </div>

                            {typeQuests.map((quest, index) => {
                                const progressPercentage = getProgressPercentage(quest.currentNumber, quest.targetNumber);
                                const isEligible = quest.currentNumber >= quest.targetNumber;

                                return (
                                    <div
                                        key={`${type}-${index}`}
                                        className="w-full p-5 flex items-center justify-between gap-x-5"
                                        style={{
                                            backgroundImage: `url('/icon/quests/quest_frame.png')`,
                                            backgroundSize: '100% 100%',
                                            backgroundPosition: 'center',
                                            backgroundRepeat: 'no-repeat',
                                        }}
                                    >
                                        <div className="flex flex-col items-start gap-y-2 flex-1">
                                            <div className="flex flex-col items-start">
                                                <span className="font-pretendard text-xl font-normal text-white ">{quest.title}</span>
                                                <span className="font-pretendard text-sm text-gray-300">{quest.description}</span>
                                            </div>
                                            <div className="w-full h-5 bg-brown-3 rounded-sm relative overflow-hidden flex items-center">
                                                <div className="absolute text-xs text-white z-30 w-full text-center ">
                                                    {quest.currentNumber} / {quest.targetNumber}
                                                </div>
                                                <div
                                                    className="h-full bg-gradient-main-5 animate-gradient-flow transition-all duration-300 ease-out"
                                                    style={{ width: `${progressPercentage}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center gap-y-2">
                                            <button
                                                disabled={!isEligible || quest.isClaimed}
                                                onClick={() => handleClaim(quest)}
                                                className={`w-16 h-16 rounded-xl flex items-center justify-center transition-opacity ${isEligible
                                                    ? 'bg-gradient-main-5 hover:opacity-90'
                                                    : 'bg-brown-0'
                                                    } ${quest.isClaimed ? 'opacity-50' : ''} ${isEligible && !quest.isClaimed ? 'animate-treasure-glow' : ''}`}
                                            >
                                                <img
                                                    src={getQuestImage(quest)}
                                                    className={`w-12 h-12 object-contain ${isEligible && !quest.isClaimed ? 'animate-treasure-pulse' : ''}`}
                                                    style={{ imageRendering: 'pixelated' }}
                                                    alt={quest.isClaimed ? 'Claimed' : isEligible ? 'Eligible' : 'In Progress'}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}