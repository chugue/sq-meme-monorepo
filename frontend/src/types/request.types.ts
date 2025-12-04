// 댓글 생성 요청 DTO
// - txHash만 전송하면 백엔드에서 CommentAdded 이벤트를 파싱하여 저장
export interface CreateCommentRequest {
  txHash: string;
  imageUrl?: string; // 댓글 이미지 URL (선택, 이벤트에 없으므로 별도 전송)
}

// 게임 생성 요청 DTO
export interface CreateGameRequest {
  txHash: string;
  gameId: string;
  gameAddr: string;
  gameTokenAddr: string;
  tokenSymbol: string;
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
