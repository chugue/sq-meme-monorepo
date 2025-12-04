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

// 퀘스트 아이템
export interface QuestItem {
  title: string;
  claimed: boolean;
  isEligible: boolean;
}

// 퀘스트 카테고리
export interface QuestCategory {
  category: string;
  items: QuestItem[];
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
  quests: QuestCategory[];
}
