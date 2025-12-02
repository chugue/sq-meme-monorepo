/**
 * 지갑 상태 관련 Atoms (Sidepanel 전역 상태)
 */

import { atom } from 'jotai';

/**
 * 지갑 연결 상태 Atom
 */
export const isWalletConnectedAtom = atom<boolean>(false);

/**
 * 지갑 주소 Atom
 */
export const walletAddressAtom = atom<string | null>(null);

/**
 * 지갑 로딩 상태 Atom
 */
export const isWalletLoadingAtom = atom<boolean>(true);

/**
 * 지갑 에러 Atom
 */
export const walletErrorAtom = atom<string | null>(null);

/**
 * MEMEX 로그인 중 상태 Atom
 */
export const isMemexLoggingInAtom = atom<boolean>(false);

/**
 * MEMEX 로그인 완료 상태 Atom
 */
export const isMemexLoggedInAtom = atom<boolean>(false);

/**
 * MEMEX 사용자 이름 Atom
 */
export const memexUsernameAtom = atom<string | null>(null);

/**
 * MEMEX 사용자 태그 Atom
 */
export const memexUserTagAtom = atom<string | null>(null);
