/**
 * SidePanel 전용 Session Storage 유틸리티
 *
 * 익스텐션 내부(SidePanel)에서 직접 chrome.storage.session에 접근
 */

import type { AsyncStorage } from 'jotai/vanilla/utils/atomWithStorage';
import { browser } from 'wxt/browser';

/**
 * Chrome Storage API 가져오기
 */
function getChromeStorage() {
    return browser?.storage || (globalThis as any).chrome?.storage;
}

/**
 * Session Storage에서 데이터 읽기
 */
export async function getStorage<T = any>(key: string): Promise<T | null> {
    try {
        const storage = getChromeStorage();
        if (!storage?.session) {
            throw new Error('Chrome Storage API를 사용할 수 없습니다.');
        }

        return new Promise<T | null>((resolve, reject) => {
            storage.session.get([key], (result: any) => {
                const runtime = browser?.runtime || (globalThis as any).chrome?.runtime;
                if (runtime?.lastError) {
                    reject(new Error(runtime.lastError.message));
                    return;
                }
                resolve(result[key] || null);
            });
        });
    } catch (error) {
        console.error(`[sessionStorage] 읽기 실패 (key: ${key}):`, error);
        return null;
    }
}

/**
 * Session Storage에 데이터 저장
 */
export async function setStorage(key: string, value: any): Promise<void> {
    try {
        const storage = getChromeStorage();
        if (!storage?.session) {
            throw new Error('Chrome Storage API를 사용할 수 없습니다.');
        }

        return new Promise<void>((resolve, reject) => {
            storage.session.set({ [key]: value }, () => {
                const runtime = browser?.runtime || (globalThis as any).chrome?.runtime;
                if (runtime?.lastError) {
                    reject(new Error(runtime.lastError.message));
                    return;
                }
                resolve();
            });
        });
    } catch (error) {
        console.error(`[sessionStorage] 저장 실패 (key: ${key}):`, error);
        throw error;
    }
}

/**
 * Session Storage에서 데이터 삭제
 */
export async function removeStorage(key: string): Promise<void> {
    try {
        const storage = getChromeStorage();
        if (!storage?.session) {
            throw new Error('Chrome Storage API를 사용할 수 없습니다.');
        }

        return new Promise<void>((resolve, reject) => {
            storage.session.remove([key], () => {
                const runtime = browser?.runtime || (globalThis as any).chrome?.runtime;
                if (runtime?.lastError) {
                    reject(new Error(runtime.lastError.message));
                    return;
                }
                resolve();
            });
        });
    } catch (error) {
        console.error(`[sessionStorage] 삭제 실패 (key: ${key}):`, error);
        throw error;
    }
}

/**
 * Jotai atomWithStorage를 위한 커스텀 Storage 어댑터
 */
export function createSessionStorage<Value>(): AsyncStorage<Value> {
    return {
        getItem: async (key: string, initialValue: Value): Promise<Value> => {
            const value = await getStorage<Value>(key);
            return value ?? initialValue;
        },
        setItem: async (key: string, value: Value): Promise<void> => {
            await setStorage(key, value);
        },
        removeItem: async (key: string): Promise<void> => {
            await removeStorage(key);
        },
    };
}

