/**
 * Page Navigation Store - 사이드패널 페이지 네비게이션 상태 관리
 */

import { atom } from "jotai";

// ========================================
// Page Type & Constants
// ========================================

export type Page = "dashboard" | "leaderboard" | "liveGames" | "myAssets" | "quests";

export const PAGES = {
    DASHBOARD: "dashboard" as const,
    LEADERBOARD: "leaderboard" as const,
    LIVE_GAMES: "liveGames" as const,
    MY_ASSETS: "myAssets" as const,
    QUESTS: "quests" as const,
} as const;

// ========================================
// Atoms
// ========================================

// 현재 페이지 상태
export const currentPageAtom = atom<Page>(PAGES.DASHBOARD);

// 페이지 변경 함수
export const setPageAtom = atom(null, (_get, set, page: Page) => {
    set(currentPageAtom, page);
});

// 뒤로가기 함수 (대시보드로 이동)
export const navigateBackAtom = atom(null, (_get, set) => {
    set(currentPageAtom, PAGES.DASHBOARD);
});

