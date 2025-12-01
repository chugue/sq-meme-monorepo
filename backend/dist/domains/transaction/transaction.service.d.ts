import { GameService } from '../game/game.service';
import { TransactionRepository } from './transaction.repository';
export declare class TransactionService {
    private readonly transactionRepository;
    private readonly gameService;
    private readonly logger;
    private isProcessing;
    constructor(transactionRepository: TransactionRepository, gameService: GameService);
    processPendingTransactions(): Promise<void>;
    private processTransaction;
}
