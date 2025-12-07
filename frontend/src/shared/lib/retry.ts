/**
 * 재시도 옵션
 */
export interface RetryOptions {
    /** 최대 재시도 횟수 (기본값: 3) */
    maxRetries?: number;
    /** 재시도 간격 (밀리초, 기본값: 1000) */
    delay?: number;
    /** 재시도 간격을 지수적으로 증가시킬지 여부 (기본값: false) */
    exponentialBackoff?: boolean;
    /** 재시도할 에러 타입을 확인하는 함수 (기본값: 모든 에러 재시도) */
    shouldRetry?: (error: any) => boolean;
    /** 재시도 전에 실행할 콜백 함수 */
    onRetry?: (error: any, attempt: number) => void;
}

/**
 * 비동기 함수를 재시도하는 범용 함수
 * 
 * @param fn 재시도할 비동기 함수
 * @param options 재시도 옵션
 * @returns 함수 실행 결과
 * 
 * @example
 * ```typescript
 * // 기본 사용 (3번 재시도, 1초 간격)
 * const result = await retry(() => fetchData());
 * 
 * // 커스텀 옵션
 * const result = await retry(
 *   () => apiCall(),
 *   {
 *     maxRetries: 5,
 *     delay: 2000,
 *     exponentialBackoff: true,
 *     shouldRetry: (error) => error.status !== 404,
 *     onRetry: (error, attempt) => console.log(`재시도 ${attempt}번째 시도`)
 *   }
 * );
 * ```
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
): Promise<T> {
    const {
        maxRetries = 3,
        delay = 1000,
        exponentialBackoff = false,
        shouldRetry = () => true,
        onRetry,
    } = options;

    let lastError: any;
    let currentDelay = delay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // 마지막 시도이거나 재시도하지 않아야 하는 에러인 경우
            if (attempt === maxRetries || !shouldRetry(error)) {
                throw error;
            }

            // 재시도 콜백 실행
            if (onRetry) {
                onRetry(error, attempt + 1);
            }

            // 재시도 전 대기
            if (attempt < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, currentDelay));

                // 지수 백오프 적용
                if (exponentialBackoff) {
                    currentDelay *= 2;
                }
            }
        }
    }

    // 이 코드는 실행되지 않아야 하지만 TypeScript를 위해 필요
    throw lastError;
}

/**
 * 특정 시간 동안 재시도하는 함수
 * 
 * @param fn 재시도할 비동기 함수
 * @param timeoutMs 타임아웃 시간 (밀리초)
 * @param intervalMs 재시도 간격 (밀리초, 기본값: 1000)
 * @returns 함수 실행 결과
 * 
 * @example
 * ```typescript
 * // 5초 동안 1초 간격으로 재시도
 * const result = await retryUntilTimeout(
 *   () => checkCondition(),
 *   5000,
 *   1000
 * );
 * ```
 */
export async function retryUntilTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    intervalMs: number = 1000,
): Promise<T> {
    const startTime = Date.now();
    let lastError: any;

    while (Date.now() - startTime < timeoutMs) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
    }

    throw lastError || new Error("타임아웃: 지정된 시간 내에 성공하지 못했습니다.");
}

