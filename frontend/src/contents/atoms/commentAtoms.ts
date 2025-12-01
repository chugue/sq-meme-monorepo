import { atom } from 'jotai';
import { Comment } from '@/contents/types/comment';

// 현재 게임 주소 (CommentGame 컨트랙트 주소)
// null = 아직 조회 전 또는 해당 토큰에 게임 없음
export const currentChallengeIdAtom = atom<string | null>(null);

// 게임 종료 여부 (블록체인 timestamp >= endTime)
// null = 아직 확인 전, true = 종료됨, false = 진행 중
export const isGameEndedAtom = atom<boolean | null>(null);

// 종료된 게임 정보 (Claim 안내용)
export interface EndedGameInfo {
    gameAddress: string;
    lastCommentor: string;
    isClaimed: boolean;
    prizePool: string;
}
export const endedGameInfoAtom = atom<EndedGameInfo | null>(null);

// 댓글 목록
export const commentsAtom = atom<Comment[]>([]);

// 댓글 로딩 상태
export const isLoadingCommentsAtom = atom<boolean>(false);

// 댓글 작성 중 상태
export const isSubmittingCommentAtom = atom<boolean>(false);

