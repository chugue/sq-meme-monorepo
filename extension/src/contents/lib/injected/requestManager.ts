/**
 * 요청 관리자 - 요청 ID 생성 및 추적
 */

class RequestIdManager {
    private counter = 0;
    private readonly prefix = 'eth_request';

    /**
     * 고유한 요청 ID 생성
     */
    generateId(): string {
        return `${this.prefix}_${Date.now()}_${++this.counter}`;
    }

    /**
     * 카운터 리셋 (테스트용)
     */
    reset(): void {
        this.counter = 0;
    }
}

export const requestIdManager = new RequestIdManager();

