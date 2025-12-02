/**
 * Session Store - 지갑 연결 및 MEMEX 로그인 상태 통합 관리
 */

import { User } from "@/types/response.types";
import { atom } from "jotai";

// ========================================
// Session State Interface
// ========================================

export interface SessionState {
  // 지갑 연결 상태
  isWalletConnected: boolean;
  walletAddress: string | null;

  // MEMEX 로그인 상태
  isMemexLoggedIn: boolean;
  memexUsername: string | null;
  memexUserTag: string | null;
  memexProfileImage: string | null;

  // 로딩 상태
  isLoading: boolean;
  isLoggingIn: boolean;

  // 에러
  error: string | null;

  // 백엔드에서 받은 유저 정보
  user: User | null;
}

// ========================================
// Initial State
// ========================================

const initialSessionState: SessionState = {
  isWalletConnected: false,
  walletAddress: null,
  isMemexLoggedIn: false,
  memexUsername: null,
  memexUserTag: null,
  memexProfileImage: null,
  isLoading: true,
  isLoggingIn: false,
  error: null,
  user: null,
};

// ========================================
// Atoms
// ========================================

// 메인 세션 상태 Atom
export const sessionAtom = atom<SessionState>(initialSessionState);

// 파생 Atoms (읽기 전용)
export const isWalletConnectedAtom = atom(
  (get) => get(sessionAtom).isWalletConnected
);
export const walletAddressAtom = atom((get) => get(sessionAtom).walletAddress);
export const isMemexLoggedInAtom = atom(
  (get) => get(sessionAtom).isMemexLoggedIn
);
export const isLoadingAtom = atom((get) => get(sessionAtom).isLoading);
export const isLoggingInAtom = atom((get) => get(sessionAtom).isLoggingIn);
export const errorAtom = atom((get) => get(sessionAtom).error);
export const currentUserAtom = atom((get) => get(sessionAtom).user);

// 로그인 완료 여부 (지갑 + MEMEX 둘 다 완료)
export const isFullyLoggedInAtom = atom(
  (get) =>
    get(sessionAtom).isWalletConnected && get(sessionAtom).isMemexLoggedIn
);

// 현재 체크인 스트릭
export const currentStreakAtom = atom((get) => {
  const user = get(sessionAtom).user;
  if (!user?.checkInHistory?.length) return 0;
  const lastCheckIn = user.checkInHistory[user.checkInHistory.length - 1];
  return lastCheckIn?.currentStreak ?? 0;
});

// ========================================
// Action Atoms (쓰기용)
// ========================================

// 지갑 연결 상태 업데이트
export const setWalletConnectedAtom = atom(
  null,
  (get, set, payload: { isConnected: boolean; address: string | null }) => {
    const current = get(sessionAtom);
    set(sessionAtom, {
      ...current,
      isWalletConnected: payload.isConnected,
      walletAddress: payload.address,
    });
  }
);

// MEMEX 로그인 상태 업데이트
export const setMemexLoggedInAtom = atom(
  null,
  (
    get,
    set,
    payload: {
      isLoggedIn: boolean;
      username?: string | null;
      userTag?: string | null;
      profileImage?: string | null;
    }
  ) => {
    const current = get(sessionAtom);
    set(sessionAtom, {
      ...current,
      isMemexLoggedIn: payload.isLoggedIn,
      memexUsername: payload.username ?? current.memexUsername,
      memexUserTag: payload.userTag ?? current.memexUserTag,
      memexProfileImage: payload.profileImage ?? current.memexProfileImage,
    });
  }
);

// User 정보 업데이트 (Join 응답에서)
export const setUserAtom = atom(null, (get, set, user: User | null) => {
  const current = get(sessionAtom);
  set(sessionAtom, {
    ...current,
    user,
    // User 정보가 있으면 프로필 이미지도 업데이트
    memexProfileImage: user?.profileImage ?? current.memexProfileImage,
  });
});

// 로딩 상태 업데이트
export const setLoadingAtom = atom(null, (get, set, isLoading: boolean) => {
  const current = get(sessionAtom);
  set(sessionAtom, { ...current, isLoading });
});

// 로그인 중 상태 업데이트
export const setLoggingInAtom = atom(null, (get, set, isLoggingIn: boolean) => {
  const current = get(sessionAtom);
  set(sessionAtom, { ...current, isLoggingIn });
});

// 에러 업데이트
export const setErrorAtom = atom(null, (get, set, error: string | null) => {
  const current = get(sessionAtom);
  set(sessionAtom, { ...current, error });
});

// 전체 세션 초기화 (로그아웃)
export const resetSessionAtom = atom(null, (_get, set) => {
  set(sessionAtom, initialSessionState);
});
