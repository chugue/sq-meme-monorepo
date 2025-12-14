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
            const errorMessage = `HTTP ${response.status}: ${errorData.error || errorData.message || response.statusText}`;
            // HTTP 상태 코드를 에러 메시지에 포함시켜 messageHandler에서 404 체크 가능하게 함
            throw new Error(errorMessage);
        }

        return response.json();
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('네트워크 오류가 발생했습니다.');
    }
}

// 파일 업로드용 API 호출 함수 (multipart/form-data)
export async function apiUpload<T>(
    endpoint: string,
    formData: FormData
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            // Content-Type을 설정하지 않음 - browser가 자동으로 multipart/form-data boundary 설정
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류가 발생했습니다.' }));
            const errorMessage = `HTTP ${response.status}: ${errorData.error || errorData.message || response.statusText}`;
            throw new Error(errorMessage);
        }

        return response.json();
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('파일 업로드 중 네트워크 오류가 발생했습니다.');
    }
}

