import type { RegisterTransactionDto } from 'src/common/validator/transaction.validator';
import { TransactionRepository } from './transaction.repository';
export declare class TransactionController {
    private readonly transactionRepository;
    constructor(transactionRepository: TransactionRepository);
    register(dto: RegisterTransactionDto): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: {
            txHash: string;
            status: string;
        };
    }>;
}
