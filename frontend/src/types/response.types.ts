// ========================================
// Response Types
// ========================================

// 체크인 기록
export interface CheckInRecord {
    day: string; // ISO date string (e.g. "2025-12-02")
    currentStreak: number;
}

// 기타 토큰 잔액
export interface OtherTokenBalance {
    tokenAddress: string;
    tokenSymbol: string;
    balance: string;
}

// User 응답 타입 (백엔드 User 스키마와 동일)
export interface User {
    id: number;
    walletAddress: string;
    memexWalletAddress: string | null;
    userName: string | null;
    userTag: string | null;
    profileImage: string | null;
    memexLink: string | null;
    myTokenAddr: string | null;
    myTokenSymbol: string | null;
    mTokenBalance: string;
    myTokenBalance: string;
    otherTokenBalances: OtherTokenBalance[];
    checkInHistory: CheckInRecord[];
    isPolicyAgreed: boolean;
    createdAt: string;
    updatedAt: string;
}

// Join 응답 타입
export interface JoinResponse {
    user: User;
    isNew: boolean;
}

// 프로필 페이지 데이터 응답 타입
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

export interface CommentLeaderItem {
    rank: number;
    profileImage?: string;
    username?: string;
    commentCount: number;
}

// 퀘스트 아이템
export interface QuestItem {
    id: number;
    type: QuestTypes;
    title: string;
    description: string;
    currentNumber: number;
    targetNumber: number;
    isClaimed: boolean;
}

// Game Ranking API 응답 타입
export interface GameRankingResponse {
    gameRanking: GameRankItem[];
}

// Prize Ranking API 응답 타입
export interface PrizeRankingResponse {
    prizeRanking: PrizeRankItem[];
}

// Quests API 응답 타입
export interface QuestsResponse {
    today: string;
    quests: QuestItem[];
}

// 내가 참여 중인 게임 아이템
export interface MyActiveGameItem {
    gameId: string;
    tokenImage: string | null;
    tokenAddress: string;
    tokenSymbol: string | null;
    tokenUsername: string | null;
    tokenUsertag: string | null;
    currentPrizePool: string;
    endTime: string | null;
}

// My Active Games API 응답 타입
export interface MyActiveGamesResponse {
    myActiveGames: MyActiveGameItem[];
}

// Live Game 아이템 (현재 진행 중인 게임)
export interface LiveGameItem {
    gameId: string;
    tokenAddress: string;
    tokenUsername: string | null;
    tokenUsertag: string | null;
    tokenImageUrl: string | null;
    tokenSymbol: string | null;
    currentPrizePool: string | null;
    endTime: string | null;
}

// Live Games API 응답 타입
export interface LiveGamesResponse {
    liveGames: LiveGameItem[];
}

// ========================================
// Comment Types
// ========================================

// 댓글 데이터 (백엔드 Comment 스키마와 동일)
export interface Comment {
    id: number;
    txHash: string;
    gameId: string;
    commentor: string;
    message: string;
    imageUrl: string | null;
    likeCount: number;
    createdAt: string;
}

// 댓글 목록 아이템
export interface CommentListItem {
    comment: Comment;
    commentorProfileUrl: string;
    userName: string;
    hasUserLiked: boolean;
}

// 댓글 목록 API 응답 타입
export interface CommentListResponse {
    userTotalFunding: string;
    commentsListDTO: CommentListItem[];
}

// 댓글 저장 API 응답 타입
export interface SaveCommentResponse {
    id: number;
    newEndTime: string;
}
