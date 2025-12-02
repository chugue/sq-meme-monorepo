/**
 * 사용자 정보 관련 Atoms
 */

import { atom } from 'jotai';
import type { User } from '../../types/response.types';

/**
 * 사용자 정보 Atom (DB에 저장된 전체 User 정보)
 */
export const userAtom = atom<User | null>(null);

/**
 * 사용자 정보 로딩 상태 Atom
 */
export const isUserLoadingAtom = atom<boolean>(false);

/**
 * 사용자 정보 에러 Atom
 */
export const userErrorAtom = atom<string | null>(null);
