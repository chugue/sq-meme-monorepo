import { browser } from 'wxt/browser';
// Background Script와 통신하기 위한 메시지 타입
export type BackgroundMessage =
    | { type: 'GET_COMMENTS'; gameAddress: string }
    | { type: 'CREATE_COMMENT'; gameAddress: string; commentor: string; message: string; signature?: string }
    | { type: 'DELETE_COMMENT'; commentId: number }
    | { type: 'HEALTH_CHECK' }
    | { type: 'OPEN_SIDE_PANEL' }
    | { type: 'GET_STORAGE'; key: string; area?: 'session' | 'local' }
    | { type: 'SET_STORAGE'; key: string; value: any; area?: 'session' | 'local' };

export type BackgroundResponse<T = any> =
    | { success: true; data: T }
    | { success: false; error: string };

// Background Script로 메시지 전송
export async function sendToBackground<T>(
    message: BackgroundMessage
): Promise<T> {
    return new Promise((resolve, reject) => {
        // Content Script에서는 chrome 또는 browser 객체가 전역으로 제공됨
        // @ts-ignore - Chrome Extension API
        const runtime = browser?.runtime || (globalThis as any).chrome?.runtime;

        if (!runtime) {
            reject(new Error('Chrome Extension API를 찾을 수 없습니다.'));
            return;
        }

        runtime.sendMessage(message, (response: BackgroundResponse<T>) => {
            // @ts-ignore - Chrome Extension API
            const lastError = runtime.lastError || chrome?.runtime?.lastError;

            if (lastError) {
                console.error('❌ Runtime 오류:', lastError);
                reject(new Error(lastError.message || '메시지 전송 실패'));
                return;
            }

            if (!response) {
                reject(new Error('응답이 없습니다. Background Script가 실행 중인지 확인하세요.'));
                return;
            }

            if (response.success) {
                resolve(response.data);
            } else {
                reject(new Error(response.error || '알 수 없는 오류가 발생했습니다.'));
            }
        });
    });
}

// API 클라이언트 (Background Script와 통신)
export const backgroundApi = {
    // 댓글 목록 조회
    getComments: async (gameAddress: string) => {
        return sendToBackground<Array<any>>({
            type: 'GET_COMMENTS',
            gameAddress,
        });
    },

    // 댓글 작성
    createComment: async (input: {
        gameAddress: string;
        commentor: string;
        message: string;
        signature?: string;
    }) => {
        return sendToBackground<any>({
            type: 'CREATE_COMMENT',
            gameAddress: input.gameAddress,
            commentor: input.commentor,
            message: input.message,
            signature: input.signature,
        });
    },

    // 댓글 삭제
    deleteComment: async (commentId: number) => {
        return sendToBackground<void>({
            type: 'DELETE_COMMENT',
            commentId,
        });
    },

    // Health check
    healthCheck: async () => {
        return sendToBackground<{ status: string; timestamp: string; supabase: string }>({
            type: 'HEALTH_CHECK',
        });
    },

    // 사이드 패널 열기 (Background Script에서 처리)
    openSidePanel: async () => {
        return sendToBackground<void>({
            type: 'OPEN_SIDE_PANEL',
        });
    },

    // Storage 읽기
    getStorage: async <T = any>(key: string, area: 'session' | 'local' = 'session'): Promise<T | null> => {
        return sendToBackground<T | null>({
            type: 'GET_STORAGE',
            key,
            area,
        });
    },

    // Storage 저장
    setStorage: async (key: string, value: any, area: 'session' | 'local' = 'session'): Promise<void> => {
        return sendToBackground<void>({
            type: 'SET_STORAGE',
            key,
            value,
            area,
        });
    },
};
