import { Inject, Injectable, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/common/db/db.module';
import * as schema from 'src/common/db/schema';
import { NewGame } from 'src/common/db/schema/game.schema';
import { GameCreatedEventSchema } from 'src/common/validator/blockchain.validator';

@Injectable()
export class BlockchainRepository {
    private readonly logger = new Logger(BlockchainRepository.name);

    constructor(
        @Inject(DrizzleAsyncProvider)
        private readonly db: NodePgDatabase<typeof schema>,
    ) {}

    async createGames(rawEvents: unknown[]) {
        if (rawEvents.length === 0) return;

        const games = rawEvents
            .map((event) => {
                const result = GameCreatedEventSchema.safeParse(event);
                if (!result.success) {
                    this.logger.error(`Invalid event data: ${result.error}`);
                    return null;
                }
                const data = result.data;
                return {
                    gameId: data.gameId,
                    gameAddress: data.gameAddr,
                    gameToken: data.gameTokenAddr,
                    initiator: data.initiator,
                    remainTime: data.remainTime,
                    endTime: data.endTime,
                    cost: data.cost,
                    prizePool: data.prizePool,
                    isEnded: data.isEnded,
                    lastCommentor: data.lastCommentor,
                } as NewGame;
            })
            .filter((game) => game !== null) as NewGame[];

        if (games.length === 0) return;

        try {
            await this.db.insert(schema.games).values(games);
            this.logger.log(`✅ ${games.length} Games saved to DB`);
        } catch (error) {
            this.logger.error(`❌ Failed to save games: ${error.message}`);
        }
    }
}
