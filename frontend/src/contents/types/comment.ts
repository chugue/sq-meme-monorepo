export interface Comment {
  id: number;
  commentId: number; // 블록체인 commentId
  gameId: string;
  commentor: string;
  message: string;
  createdAt: string;
  likeCount?: number;
  endTime?: string;
  currentPrizePool?: string;
  isWinnerComment?: boolean;
  imageUrl?: string;
}

export interface CreateCommentInput {
  gameId: string;
  commentor: string;
  message: string;
}

