import { EthereumProvider } from 'src/common/providers';
import { Result } from 'src/common/types';
import { GameRepository } from './game.repository';
export declare class GameService {
    private readonly ethereumProvider;
    private readonly gameRepository;
    private readonly logger;
    private prizeClaimedIface;
    constructor(ethereumProvider: EthereumProvider, gameRepository: GameRepository);
    processPrizeClaimedTransaction(txHash: string, gameAddress: string): Promise<boolean>;
    createGame(data: unknown): Promise<Result<{
        gameAddress: string;
    }>>;
}
