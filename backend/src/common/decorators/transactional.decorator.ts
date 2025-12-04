import { SetMetadata } from '@nestjs/common';

export const TRANSACTIONAL_KEY = 'transactional';

export type IsolationLevel = 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';

export interface TransactionalOptions {
    isolationLevel?: IsolationLevel;
    readOnly?: boolean;
}

/**
 * 메서드에 트랜잭션을 적용하는 데코레이터
 *
 * @example
 * @Transactional()
 * async createUserWithPosts(data: CreateUserDto) {
 *     // 이 메서드 내의 모든 DB 작업이 하나의 트랜잭션으로 묶임
 * }
 *
 * @example
 * @Transactional({ isolationLevel: 'SERIALIZABLE' })
 * async transferFunds(from: string, to: string, amount: number) {
 *     // SERIALIZABLE 격리 수준으로 실행
 * }
 *
 * @example
 * @Transactional({ readOnly: true })
 * async getReport() {
 *     // 읽기 전용 트랜잭션
 * }
 */
export const Transactional = (
    options: TransactionalOptions = {},
): MethodDecorator => {
    return SetMetadata(TRANSACTIONAL_KEY, {
        isolationLevel: options.isolationLevel ?? 'READ_COMMITTED',
        readOnly: options.readOnly ?? false,
    });
};
