/**
 * Session Store - 지갑 연결 및 MEMEX 로그인 상태 통합 관리
 */

import { User } from "@/types/response.types";
import { atom } from "jotai";
import { atomWithStorage, unwrap } from "jotai/utils";
import { createSessionStorage } from "../lib/sessionStorage";

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

    // MEMEX 프로필 정보 (토큰 관련)
    memexWalletAddress: string | null;
    myTokenAddr: string | null;
    myTokenSymbol: string | null;
    myTokenImageUrl: string | null;

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
    memexWalletAddress: null,
    myTokenAddr: null,
    myTokenSymbol: null,
    myTokenImageUrl: null,
    isLoading: true,
    isLoggingIn: false,
    error: null,
    user: null,
};

// ========================================
// Atoms
// ========================================

// 메인 세션 상태 Atom (저장소와 자동 동기화)
// unwrap을 사용하여 Promise를 자동으로 처리
export const sessionAtom = unwrap(
    atomWithStorage<SessionState>(
        'squid_session_state',
        initialSessionState,
        createSessionStorage<SessionState>(),
        {
            getOnInit: true, // 초기화 시 저장소에서 불러오기
        }
    ),
    (prev) => prev ?? initialSessionState
);

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

// 로그인 체크 완료 여부 (여러 컴포넌트 간 동기화용, 저장소와 자동 동기화)
// unwrap을 사용하여 Promise를 자동으로 처리
export const loginCheckCompletedAtom = unwrap(
    atomWithStorage<boolean>(
        'squid_login_check_completed',
        false,
        createSessionStorage<boolean>(),
        {
            getOnInit: true, // 초기화 시 저장소에서 불러오기
        }
    ),
    (prev) => prev ?? false
);

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

// MEMEX 프로필 정보 업데이트 (토큰 관련)
export const setMemexProfileInfoAtom = atom(
    null,
    (
        get,
        set,
        payload: {
            profileImage?: string | null;
            memexWalletAddress?: string | null;
            myTokenAddr?: string | null;
            myTokenSymbol?: string | null;
            myTokenImageUrl?: string | null;
        }
    ) => {
        const current = get(sessionAtom);
        set(sessionAtom, {
            ...current,
            memexProfileImage: payload.profileImage ?? current.memexProfileImage,
            memexWalletAddress: payload.memexWalletAddress ?? current.memexWalletAddress,
            myTokenAddr: payload.myTokenAddr ?? current.myTokenAddr,
            myTokenSymbol: payload.myTokenSymbol ?? current.myTokenSymbol,
            myTokenImageUrl: payload.myTokenImageUrl ?? current.myTokenImageUrl,
        });
    }
);

// MEMEX 로그인 상태와 프로필 정보를 한 번에 업데이트 (리렌더링 최소화)
export const setMemexLoginWithProfileAtom = atom(
    null,
    (
        get,
        set,
        payload: {
            isLoggedIn: boolean;
            username?: string | null;
            userTag?: string | null;
            profileImage?: string | null;
            memexWalletAddress?: string | null;
            myTokenAddr?: string | null;
            myTokenSymbol?: string | null;
            myTokenImageUrl?: string | null;
        }
    ) => {
        const current = get(sessionAtom);
        set(sessionAtom, {
            ...current,
            isMemexLoggedIn: payload.isLoggedIn,
            memexUsername: payload.username ?? current.memexUsername,
            memexUserTag: payload.userTag ?? current.memexUserTag,
            memexProfileImage: payload.profileImage ?? current.memexProfileImage,
            memexWalletAddress: payload.memexWalletAddress ?? current.memexWalletAddress,
            myTokenAddr: payload.myTokenAddr ?? current.myTokenAddr,
            myTokenSymbol: payload.myTokenSymbol ?? current.myTokenSymbol,
            myTokenImageUrl: payload.myTokenImageUrl ?? current.myTokenImageUrl,
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

// 로그인 체크 완료 여부 업데이트
export const setLoginCheckCompletedAtom = atom(
    null,
    (_get, set, completed: boolean) => {
        set(loginCheckCompletedAtom, completed);
    }
);

// 전체 세션 초기화 (로그아웃)
export const resetSessionAtom = atom(null, async (_get, set) => {
    set(sessionAtom, {
        ...initialSessionState,
        isLoading: false, // 로그아웃 후에는 로딩 상태 false
    });
    set(loginCheckCompletedAtom, false); // 로그인 체크 상태도 초기화
    // atomWithStorage가 자동으로 저장소에 반영됨
});
