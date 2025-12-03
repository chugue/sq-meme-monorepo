export interface Comment {
  id: number;
  gameAddress: string;
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
  gameAddress: string;
  commentor: string;
  message: string;
}

