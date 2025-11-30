import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/common/db/schema';
export declare class GameRepository {
    private readonly db;
    private readonly logger;
    constructor(db: NodePgDatabase<typeof schema>);
    createGames(rawEvents: unknown[]): Promise<{
        gameAddress: string;
    }[]>;
    updateGameState(gameAddress: string, updates: {
        endTime?: Date;
        prizePool?: string;
        lastCommentor?: string;
        isEnded?: boolean;
    }): Promise<void>;
}
