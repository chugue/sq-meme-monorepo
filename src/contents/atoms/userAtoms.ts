/**
 * 사용자 정보 관련 Atoms
 */

import { atom } from 'jotai';

/**
 * 사용자 정보 타입
 */
export interface UserInfo {
    username: string;
    user_tag: string;
}

/**
 * 사용자 정보 Atom
 */
export const userInfoAtom = atom<UserInfo | null>(null);

/**
 * 사용자 정보 로딩 상태 Atom
 */
export const isUserInfoLoadingAtom = atom<boolean>(false);

/**
 * 사용자 정보 에러 Atom
 */
export const userInfoErrorAtom = atom<string | null>(null);

