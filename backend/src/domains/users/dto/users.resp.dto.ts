export interface ProfilePageData {
    username: string | null;
    connectedWallet: string;
    memexWallet: string | null;
    commentCounts: number;
    streakDays: number;
}

// 리더보드 - 게임(토큰)별 총 상금 랭킹
export interface GameRankItem {
    rank: number;
    tokenImage: string | null;
    tokenAddress: string;
    tokenSymbol: string | null;
    totalPrize: string;
}

// 리더보드 - 유저별 총 획득 상금 랭킹
export interface PrizeRankItem {
    rank: number;
    profileImage: string | null;
    username: string | null;
    totalAmount: string;
    tokenAddress: string;
    tokenSymbol: string;
}

// 내가 참여 중인 게임 아이템
export interface MyActiveGameItem {
    gameId: string;
    tokenImage: string | null;
    tokenAddress: string;
    tokenSymbol: string | null;
    currentPrizePool: string | null;
    endTime: string | null;
}

export type QuestTypes = 'streak' | 'comments';

export interface QuestRespDto {
    today: string;
    quests: QuestItem[];
}

// 퀘스트 아이템
export interface QuestItem {
    type: QuestTypes;
    isEligible: boolean;
    isClaimed: boolean;
}
