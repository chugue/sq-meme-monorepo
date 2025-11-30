import { atom } from 'jotai';
import { Comment } from '@/contents/types/comment';

// 현재 선택된 챌린지 ID (데모용으로 고정값 사용)
export const currentChallengeIdAtom = atom<string>('demo-challenge-1');

// 댓글 목록
export const commentsAtom = atom<Comment[]>([]);

// 댓글 로딩 상태
export const isLoadingCommentsAtom = atom<boolean>(false);

// 댓글 작성 중 상태
export const isSubmittingCommentAtom = atom<boolean>(false);

