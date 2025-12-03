import { atom } from 'jotai';

// 현재 프로필 페이지 정보 타입
export interface CurrentPageInfo {
    id: string;                  // MEMEX 내부 ID
    contractAddress: string;     // 토큰 컨트랙트 주소
    username: string;            // 프로필 사용자명
    userTag: string;             // 프로필 태그
    symbol: string | null;       // 토큰 심볼
    timestamp: number;           // 캐싱 시점
}

// 현재 프로필 페이지 정보
export const currentPageInfoAtom = atom<CurrentPageInfo | null>(null);

// 페이지 정보 로딩 상태 (초기값 true: 첫 렌더링 시 로딩 표시)
export const isPageInfoLoadingAtom = atom<boolean>(true);

// 페이지 정보 에러
export const pageInfoErrorAtom = atom<string | null>(null);

