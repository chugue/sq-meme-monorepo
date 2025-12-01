/**
 * 백엔드 API 클라이언트 (Content Script용)
 *
 * 트랜잭션 완료 후 이벤트 데이터를 백엔드로 전송
 */

import { logger } from '../injected/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * 댓글 생성 요청 DTO
 */
export interface CreateCommentRequest {
    txHash: string;
    gameAddress: string;
    commentor: string;
    message: string;
    newEndTime: string; // BigInt를 문자열로
    prizePool: string; // BigInt를 문자열로
    timestamp: string; // BigInt를 문자열로
}

/**
 * 게임 생성 요청 DTO
 */
export interface CreateGameRequest {
    txHash: string;
    gameId: string;
    gameAddr: string;
    gameTokenAddr: string;
    tokenSymbol: string;
    tokenName: string;
    initiator: string;
    gameTime: string;
    endTime: string;
    cost: string;
    prizePool: string;
    lastCommentor: string;
    isClaimed: boolean;
}

/**
 * API 응답 타입
 */
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    errorMessage?: string;
}

/**
 * 백엔드 API 호출 헬퍼
 */
async function apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
        logger.info('백엔드 API 호출', { url, method: options.method || 'GET' });

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            logger.error('백엔드 API 에러', { status: response.status, data });
            return {
                success: false,
                errorMessage: data.errorMessage || data.message || `HTTP ${response.status}`,
            };
        }

        logger.info('백엔드 API 성공', { url, data });
        return data as ApiResponse<T>;
    } catch (error) {
        logger.error('백엔드 API 네트워크 에러', error);
        return {
            success: false,
            errorMessage: error instanceof Error ? error.message : '네트워크 오류',
        };
    }
}

/**
 * 댓글 데이터를 백엔드에 저장
 */
export async function saveComment(
    data: CreateCommentRequest
): Promise<ApiResponse<{ id: number }>> {
    return apiCall<{ id: number }>('/v1/comments', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * 게임 데이터를 백엔드에 저장
 */
export async function saveGame(
    data: CreateGameRequest
): Promise<ApiResponse<{ gameAddress: string }>> {
    return apiCall<{ gameAddress: string }>('/v1/games', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * claimPrize txHash를 백엔드에 등록
 */
export async function registerClaimPrizeTx(
    gameAddress: string,
    txHash: string
): Promise<ApiResponse<{ success: boolean }>> {
    return apiCall<{ success: boolean }>(`/v1/games/${gameAddress}/claim`, {
        method: 'POST',
        body: JSON.stringify({ txHash }),
    });
}

export const backendApi = {
    saveComment,
    saveGame,
    registerClaimPrizeTx,
} as const;
