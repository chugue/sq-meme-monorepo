import { GameRepository } from './game.repository';
import { GameService } from './game.service';
export declare class GameController {
    private readonly gameRepository;
    private readonly gameService;
    constructor(gameRepository: GameRepository, gameService: GameService);
    createGame(body: unknown): Promise<import("../../common/types").Result<{
        gameAddress: string;
    }>>;
    registerClaimPrize(gameAddress: string, body: {
        txHash: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    getGameByToken(tokenAddress: string): Promise<{
        id: number;
        txHash: string | null;
        gameId: string;
        gameAddress: string;
        gameToken: string;
        tokenSymbol: string | null;
        tokenName: string | null;
        initiator: string;
        gameTime: string;
        endTime: Date;
        cost: string;
        prizePool: string;
        isClaimed: boolean;
        lastCommentor: string;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
}
