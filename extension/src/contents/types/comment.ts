export interface Comment {
  id: string;
  challenge_id: string;
  player_address: string;
  content: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateCommentInput {
  challenge_id: string;
  player_address: string;
  content: string;
}

