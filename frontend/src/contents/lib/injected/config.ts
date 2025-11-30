/**
 * Injected Script 통신 설정
 */

export const INJECTED_CONFIG = {
    /**
     * 요청 타임아웃 (밀리초)
     */
    REQUEST_TIMEOUT: 30000,

    /**
     * Injected Script 준비 대기 타임아웃 (밀리초)
     */
    READY_TIMEOUT: 5000,

    /**
     * 재시도 설정
     */
    RETRY: {
        MAX_ATTEMPTS: 3,
        DELAY: 1000,
    },

    /**
     * 메시지 검증 설정
     */
    VALIDATION: {
        ALLOWED_ORIGINS: ['*'], // 개발 환경에서는 모든 origin 허용
        STRICT_SOURCE_CHECK: true,
    },
} as const;

