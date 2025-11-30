import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/common/db/schema';
export declare class GameRepository {
    private readonly db;
    private readonly logger;
    constructor(db: NodePgDatabase<typeof schema>);
    createGames(rawEvents: unknown[]): Promise<{
        gameAddress: string;
    }[]>;
    findByTokenAddress(tokenAddress: string): Promise<{
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
    } | null>;
    updateGameState(gameAddress: string, updates: {
        endTime?: Date;
        prizePool?: string;
        lastCommentor?: string;
        isEnded?: boolean;
    }): Promise<void>;
}
