import { Inject, Injectable, Logger } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/common/db/db.module';
import * as schema from 'src/common/db/schema';

export interface TopWinner {
    id: number;
    walletAddress: string;
    gameId: string;
    prize: string;
    tokenSymbol: string;
    tokenAddress: string;
    claimTxHash: string | null;
    claimedAt: Date;
    createdAt: Date | null;
}

export interface CreateWinnerDto {
    walletAddress: string;
    gameId: string;
    prize: string;
    tokenSymbol: string;
    tokenAddress: string;
    claimTxHash?: string;
    claimedAt: Date;
}

@Injectable()
export class WinnersRepository {
    private readonly logger = new Logger(WinnersRepository.name);

    constructor(
        @Inject(DrizzleAsyncProvider)
        private readonly db: NodePgDatabase<typeof schema>,
    ) {}

    /**
     * Get top winners ordered by prize amount (descending)
     * @param limit Number of top winners to return (default: 10)
     * @returns List of winners ordered by prize
     */
    async getTopWinners(limit = 10): Promise<TopWinner[]> {
        try {
            const result = await this.db
                .select()
                .from(schema.winners)
                .orderBy(desc(sql`CAST(${schema.winners.prize} AS NUMERIC)`))
                .limit(limit);

            return result;
        } catch (error) {
            this.logger.error(`Failed to get top winners: ${error.message}`);
            return [];
        }
    }

    /**
     * Get winners by wallet address
     * @param walletAddress User's wallet address
     * @returns List of winner records
     */
    async findByWalletAddress(walletAddress: string) {
        try {
            return await this.db
                .select()
                .from(schema.winners)
                .where(
                    eq(
                        schema.winners.walletAddress,
                        walletAddress.toLowerCase(),
                    ),
                )
                .orderBy(desc(schema.winners.claimedAt));
        } catch (error) {
            this.logger.error(
                `Failed to find winners by wallet: ${error.message}`,
            );
            return [];
        }
    }

    /**
     * Get winner by game ID
     * @param gameId Game ID
     * @returns Winner record or null
     */
    async findByGameId(gameId: string) {
        try {
            const [winner] = await this.db
                .select()
                .from(schema.winners)
                .where(eq(schema.winners.gameId, gameId))
                .limit(1);

            return winner ?? null;
        } catch (error) {
            this.logger.error(
                `Failed to find winner by gameId: ${error.message}`,
            );
            return null;
        }
    }

    /**
     * Create a new winner record
     * @param data Winner data
     * @returns Created winner ID or null
     */
    async create(data: CreateWinnerDto): Promise<{ id: number } | null> {
        // Check for duplicate
        const existing = await this.findByGameId(data.gameId);
        if (existing) {
            this.logger.warn(`Duplicate winner for gameId: ${data.gameId}`);
            return { id: existing.id };
        }

        try {
            const [winner] = await this.db
                .insert(schema.winners)
                .values({
                    walletAddress: data.walletAddress.toLowerCase(),
                    gameId: data.gameId,
                    prize: data.prize,
                    tokenSymbol: data.tokenSymbol,
                    tokenAddress: data.tokenAddress.toLowerCase(),
                    claimTxHash: data.claimTxHash,
                    claimedAt: data.claimedAt,
                })
                .returning({ id: schema.winners.id });

            this.logger.log(
                `Winner created: ${data.walletAddress} for game ${data.gameId}`,
            );
            return { id: winner.id };
        } catch (error) {
            this.logger.error(`Failed to create winner: ${error.message}`);
            return null;
        }
    }
}
