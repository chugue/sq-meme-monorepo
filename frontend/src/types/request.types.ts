// 댓글 생성 요청 DTO
export interface CreateCommentRequest {
  txHash: string;
  gameAddress: string;
  commentor: string;
  message: string;
  imageUrl?: string; // 댓글 이미지 URL (선택)
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

// 블록체인에서 조회한 게임 정보 (V2 ABI GameInfo - bigint 타입)
export interface BlockchainGameInfo {
  id: bigint;
  initiator: `0x${string}`;
  gameToken: `0x${string}`;
  cost: bigint;
  gameTime: bigint;
  tokenSymbol: string;
  endTime: bigint;
  lastCommentor: `0x${string}`;
  prizePool: bigint;
  isClaimed: boolean;
  isEnded: boolean;
  totalFunding: bigint;
  funderCount: bigint;
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
