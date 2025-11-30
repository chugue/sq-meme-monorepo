import { atom } from 'jotai';
import { Comment } from '@/contents/types/comment';

// 현재 게임 주소 (CommentGame 컨트랙트 주소)
// null = 아직 조회 전 또는 해당 토큰에 게임 없음
export const currentChallengeIdAtom = atom<string | null>(null);

// 댓글 목록
export const commentsAtom = atom<Comment[]>([]);

// 댓글 로딩 상태
export const isLoadingCommentsAtom = atom<boolean>(false);

// 댓글 작성 중 상태
export const isSubmittingCommentAtom = atom<boolean>(false);

