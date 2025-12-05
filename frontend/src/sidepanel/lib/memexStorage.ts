/**
 * MEMEX 관련 저장소 유틸리티
 *
 * SidePanel 전용 - MEMEX 로그인 정보 및 User 정보 관리
 */

import type { User } from '../../types/response.types';
import { getStorage, setStorage, removeStorage } from './sessionStorage';

// Storage Keys
const GTM_USER_IDENTIFIER_KEY = 'gtm_user_identifier';
const SQUID_USER_KEY = 'squid_user';

/**
 * MEMEX 로그인 정보 타입 (캐시용 - SessionState 필드 포함)
 */
export interface MemexUserInfo {
    username: string;
    user_tag: string;
    // 추가 캐시 필드 (선택적)
    profileImage?: string | null;
    memexWalletAddress?: string | null;
    myTokenAddr?: string | null;
    myTokenSymbol?: string | null;
    myTokenImageUrl?: string | null;
    walletAddress?: string | null;
}

/**
 * MEMEX 로그인 정보 읽기 (gtm_user_identifier)
 */
export async function getMemexUserInfo(): Promise<MemexUserInfo | null> {
    try {
        const data = await getStorage<MemexUserInfo>(GTM_USER_IDENTIFIER_KEY);

        if (!data || typeof data !== 'object') {
            return null;
        }

        if (typeof data.username === 'string' && typeof data.user_tag === 'string') {
            // 모든 캐시된 필드를 반환
            return {
                username: data.username,
                user_tag: data.user_tag,
                profileImage: data.profileImage,
                memexWalletAddress: data.memexWalletAddress,
                myTokenAddr: data.myTokenAddr,
                myTokenSymbol: data.myTokenSymbol,
                myTokenImageUrl: data.myTokenImageUrl,
                walletAddress: data.walletAddress,
            };
        }

        return null;
    } catch (error) {
        console.error('MEMEX 로그인 정보 읽기 실패', { error });
        return null;
    }
}

/**
 * MEMEX 로그인 정보 저장 (gtm_user_identifier)
 */
export async function saveMemexUserInfo(info: MemexUserInfo): Promise<void> {
    try {
        await setStorage(GTM_USER_IDENTIFIER_KEY, info);
        console.log('MEMEX 로그인 정보 저장 완료', { username: info.username, user_tag: info.user_tag });
    } catch (error) {
        console.error('MEMEX 로그인 정보 저장 실패', error);
        throw error;
    }
}

/**
 * User 정보 읽기 (squid_user)
 */
export async function getSquidUserFromStorage(): Promise<User | null> {
    try {
        const data = await getStorage<User>(SQUID_USER_KEY);
        return validateUser(data);
    } catch (error) {
        console.error('User 조회 실패', { error });
        return null;
    }
}

/**
 * User 정보 저장 (squid_user)
 */
export async function saveSquidUserToStorage(user: User): Promise<void> {
    try {
        await setStorage(SQUID_USER_KEY, user);
        console.log('User 저장 완료', { id: user.id, userName: user.userName });
    } catch (error) {
        console.error('User 저장 실패', error);
        throw error;
    }
}

/**
 * User 정보 삭제 (squid_user)
 */
export async function clearSquidUserFromStorage(): Promise<void> {
    try {
        await removeStorage(SQUID_USER_KEY);
        console.log('User 삭제 완료');
    } catch (error) {
        console.error('User 삭제 실패', error);
    }
}

/**
 * User 데이터 검증
 */
function validateUser(data: unknown): User | null {
    if (!data || typeof data !== 'object') {
        return null;
    }

    const user = data as Partial<User>;

    // 필수 필드 검증
    if (typeof user.id === 'number' && typeof user.walletAddress === 'string') {
        return user as User;
    }

    console.warn('User 데이터 형식이 올바르지 않음', { data });
    return null;
}

