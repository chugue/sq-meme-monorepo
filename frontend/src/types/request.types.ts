// 댓글 생성 요청 DTO
export interface CreateCommentRequest {
  txHash: string;
  gameAddress: string;
  commentor: string;
  message: string;
  newEndTime: string;
  prizePool: string;
  timestamp: string;
}

// 게임 생성 요청 DTO
export interface CreateGameRequest {
  txHash: string;
  gameId: string;
  gameAddr: string;
  gameTokenAddr: string;
  tokenSymbol: string;
  tokenName: string;
  initiator: string;
  gameTime: string;
  endTime: string;
  cost: string;
  prizePool: string;
  lastCommentor: string;
  isClaimed: boolean;
}

// 블록체인에서 조회한 게임 등록 요청 DTO (V2 ABI GameInfo 전체 필드)
export interface RegisterGameRequest {
  gameId: string;
  initiator: string;
  gameToken: string;
  cost: string;
  gameTime: string;
  tokenSymbol: string;
  endTime: string;
  lastCommentor: string;
  prizePool: string;
  isClaimed: boolean;
  isEnded: boolean;
  totalFunding: string;
  funderCount: string;
}

// Join 요청 DTO
export interface JoinRequest {
  username: string;
  userTag: string;
  walletAddress: string;
  profileImageUrl: string;
  memeXLink: string;
  myTokenAddr: string | null;
  myTokenSymbol: string | null;
  memexWalletAddress: string | null;
  isPolicyAgreed: boolean;
}
