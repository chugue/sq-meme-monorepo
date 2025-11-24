import { API_BASE_URL } from './config';

// API 호출 함수 (Background Script에서 실행)
export async function apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류가 발생했습니다.' }));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('네트워크 오류가 발생했습니다.');
    }
}

