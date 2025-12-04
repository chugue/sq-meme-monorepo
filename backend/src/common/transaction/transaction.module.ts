import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TransactionInterceptor } from './transaction.interceptor';
import { TransactionService } from './transaction.service';

/**
 * 트랜잭션 관리 모듈
 *
 * @example
 * // app.module.ts에서 import
 * @Module({
 *     imports: [TransactionModule],
 * })
 * export class AppModule {}
 *
 * @example
 * // 서비스에서 TransactionService 사용
 * constructor(private readonly transactionService: TransactionService) {}
 *
 * async createOrder(data: CreateOrderDto) {
 *     return this.transactionService.run(async (tx) => {
 *         const order = await tx.insert(orders).values(data).returning();
 *         await tx.insert(orderItems).values(items);
 *         return order;
 *     });
 * }
 *
 * @example
 * // 컨트롤러에서 @Transactional() 데코레이터 사용
 * @Post()
 * @Transactional()
 * async create(@Body() dto: CreateDto) {
 *     // 이 메서드 내의 모든 DB 작업이 트랜잭션으로 묶임
 *     // Repository에서 getTransactionClient()로 현재 트랜잭션 클라이언트 접근
 * }
 */
@Global()
@Module({
    providers: [
        TransactionService,
        TransactionInterceptor,
        {
            provide: APP_INTERCEPTOR,
            useClass: TransactionInterceptor,
        },
    ],
    exports: [TransactionService],
})
export class TransactionModule {}
