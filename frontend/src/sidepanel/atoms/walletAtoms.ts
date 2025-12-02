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
