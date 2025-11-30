import { GameRepository } from './game.repository';
export declare class GameController {
    private readonly gameRepository;
    constructor(gameRepository: GameRepository);
    getGameByToken(tokenAddress: string): Promise<{
        id: number;
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
        isEnded: boolean;
        lastCommentor: string;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
}
