import { atom } from 'jotai';
import { Comment } from '@/contents/types/comment';

// 활성 게임 정보 타입 (ABI GameInfo 구조체 기준, bigint → string 변환)
export interface ActiveGameInfo {
    id: string;
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

// 활성 게임 전체 정보
// null = 아직 조회 전 또는 해당 토큰에 게임 없음
export const activeGameInfoAtom = atom<ActiveGameInfo | null>(null);

// 현재 게임 ID (하위 호환성을 위한 파생 atom)
export const currentChallengeIdAtom = atom(
    (get) => get(activeGameInfoAtom)?.id ?? null
);

// 게임 종료 여부 (블록체인 timestamp >= endTime)
// null = 아직 확인 전, true = 종료됨, false = 진행 중
export const isGameEndedAtom = atom<boolean | null>(null);

// 종료된 게임 정보 (Claim 안내용) - ActiveGameInfo와 동일한 구조
export interface EndedGameInfo {
    id: string;
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
export const endedGameInfoAtom = atom<EndedGameInfo | null>(null);

// 댓글 목록
export const commentsAtom = atom<Comment[]>([]);

// 댓글 로딩 상태
export const isLoadingCommentsAtom = atom<boolean>(false);

// 댓글 작성 중 상태
export const isSubmittingCommentAtom = atom<boolean>(false);

