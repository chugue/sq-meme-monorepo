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
