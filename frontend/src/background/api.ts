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
        console.log('🌐 API 호출:', url);
        const response = await fetch(url, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        });

        console.log('🌐 API 응답:', response.status, response.ok);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류가 발생했습니다.' }));
            const errorMessage = `HTTP ${response.status}: ${errorData.error || errorData.message || response.statusText}`;
            console.log('🌐 API 에러:', errorMessage);
            // HTTP 상태 코드를 에러 메시지에 포함시켜 messageHandler에서 404 체크 가능하게 함
            throw new Error(errorMessage);
        }

        return response.json();
    } catch (error) {
        console.log('🌐 API catch 블록:', error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('네트워크 오류가 발생했습니다.');
    }
}

