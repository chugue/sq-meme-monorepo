/**
 * 프로필 정보 Local Storage 관리
 * 
 * 프로필 정보(이미지, 토큰 주소, 토큰 심볼, MEMEX 지갑 주소)를 local storage에 저장
 * 키: 'profile' (단일 키로 통합)
 * 값: Record<string, ProfileInfo> 형태로 여러 프로필 정보 저장
 */

import { getStorage, setStorage } from './localStorage';

export interface ProfileInfo {
    profileImageUrl: string | null;
    tokenAddr: string | null;
    tokenSymbol: string | null;
    tokenImageUrl: string | null;
    memexWalletAddress: string | null;
    updatedAt: number; // 타임스탬프
}

const PROFILE_STORAGE_KEY = 'profile';

/**
 * 프로필 키 생성 (username#userTag 형식)
 */
function getProfileKey(username: string, userTag: string): string {
    return `${username}#${userTag}`;
}

/**
 * 모든 프로필 정보 가져오기
 */
async function getAllProfilesData(): Promise<Record<string, ProfileInfo>> {
    try {
        const profiles = await getStorage<Record<string, ProfileInfo>>(PROFILE_STORAGE_KEY);
        return profiles || {};
    } catch (error) {
        console.error('[profileStorage] 모든 프로필 정보 읽기 실패:', error);
        return {};
    }
}

/**
 * 모든 프로필 정보 저장
 */
async function saveAllProfilesData(profiles: Record<string, ProfileInfo>): Promise<void> {
    try {
        await setStorage(PROFILE_STORAGE_KEY, profiles);
    } catch (error) {
        console.error('[profileStorage] 모든 프로필 정보 저장 실패:', error);
        throw error;
    }
}

/**
 * 프로필 정보 가져오기
 */
export async function getProfileInfo(username: string, userTag: string): Promise<ProfileInfo | null> {
    try {
        const profiles = await getAllProfilesData();
        const key = getProfileKey(username, userTag);
        return profiles[key] || null;
    } catch (error) {
        console.error(`[profileStorage] 프로필 정보 읽기 실패 (${username}/${userTag}):`, error);
        return null;
    }
}

/**
 * 프로필 정보 저장
 */
export async function saveProfileInfo(
    username: string,
    userTag: string,
    profileInfo: Omit<ProfileInfo, 'updatedAt'>
): Promise<void> {
    try {
        const profiles = await getAllProfilesData();
        const key = getProfileKey(username, userTag);
        const profileData: ProfileInfo = {
            ...profileInfo,
            updatedAt: Date.now(),
        };
        profiles[key] = profileData;
        await saveAllProfilesData(profiles);
        console.log(`✅ [profileStorage] 프로필 정보 저장 완료: ${username}/${userTag}`);
    } catch (error) {
        console.error(`[profileStorage] 프로필 정보 저장 실패 (${username}/${userTag}):`, error);
        throw error;
    }
}

/**
 * 프로필 정보 삭제
 */
export async function removeProfileInfo(username: string, userTag: string): Promise<void> {
    try {
        const profiles = await getAllProfilesData();
        const key = getProfileKey(username, userTag);
        delete profiles[key];
        await saveAllProfilesData(profiles);
        console.log(`✅ [profileStorage] 프로필 정보 삭제 완료: ${username}/${userTag}`);
    } catch (error) {
        console.error(`[profileStorage] 프로필 정보 삭제 실패 (${username}/${userTag}):`, error);
        throw error;
    }
}

/**
 * 모든 프로필 정보 가져오기 (디버깅용)
 */
export async function getAllProfiles(): Promise<Record<string, ProfileInfo>> {
    return getAllProfilesData();
}

