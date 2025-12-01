import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/common/db/schema';
import { NewPendingTransaction, PendingTransaction, TransactionStatus } from 'src/common/db/schema/pending-transaction.schema';
export declare class TransactionRepository {
    private readonly db;
    private readonly logger;
    constructor(db: NodePgDatabase<typeof schema>);
    create(data: NewPendingTransaction): Promise<PendingTransaction | null>;
    findPending(): Promise<PendingTransaction[]>;
    updateStatus(txHash: string, status: TransactionStatus, errorMessage?: string): Promise<void>;
    incrementRetryCount(txHash: string): Promise<void>;
}
