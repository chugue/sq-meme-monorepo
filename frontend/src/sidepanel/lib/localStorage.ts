/**
 * SidePanel 전용 Local Storage 유틸리티
 *
 * 익스텐션 내부(SidePanel)에서 직접 chrome.storage.local에 접근
 */

import { browser } from 'wxt/browser';

/**
 * Chrome Storage API 가져오기
 */
function getChromeStorage() {
    return browser?.storage || (globalThis as any).chrome?.storage;
}

/**
 * Local Storage에서 데이터 읽기
 */
export async function getStorage<T = any>(key: string): Promise<T | null> {
    try {
        const storage = getChromeStorage();
        if (!storage?.local) {
            throw new Error('Chrome Storage API를 사용할 수 없습니다.');
        }

        return new Promise<T | null>((resolve, reject) => {
            storage.local.get([key], (result: any) => {
                const runtime = browser?.runtime || (globalThis as any).chrome?.runtime;
                if (runtime?.lastError) {
                    reject(new Error(runtime.lastError.message));
                    return;
                }
                resolve(result[key] || null);
            });
        });
    } catch (error) {
        console.error(`[localStorage] 읽기 실패 (key: ${key}):`, error);
        return null;
    }
}

/**
 * Local Storage에 데이터 저장
 */
export async function setStorage(key: string, value: any): Promise<void> {
    try {
        const storage = getChromeStorage();
        if (!storage?.local) {
            throw new Error('Chrome Storage API를 사용할 수 없습니다.');
        }

        return new Promise<void>((resolve, reject) => {
            storage.local.set({ [key]: value }, () => {
                const runtime = browser?.runtime || (globalThis as any).chrome?.runtime;
                if (runtime?.lastError) {
                    reject(new Error(runtime.lastError.message));
                    return;
                }
                resolve();
            });
        });
    } catch (error) {
        console.error(`[localStorage] 저장 실패 (key: ${key}):`, error);
        throw error;
    }
}

/**
 * Local Storage에서 데이터 삭제
 */
export async function removeStorage(key: string): Promise<void> {
    try {
        const storage = getChromeStorage();
        if (!storage?.local) {
            throw new Error('Chrome Storage API를 사용할 수 없습니다.');
        }

        return new Promise<void>((resolve, reject) => {
            storage.local.remove([key], () => {
                const runtime = browser?.runtime || (globalThis as any).chrome?.runtime;
                if (runtime?.lastError) {
                    reject(new Error(runtime.lastError.message));
                    return;
                }
                resolve();
            });
        });
    } catch (error) {
        console.error(`[localStorage] 삭제 실패 (key: ${key}):`, error);
        throw error;
    }
}

