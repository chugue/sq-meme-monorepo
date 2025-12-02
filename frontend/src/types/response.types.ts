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
