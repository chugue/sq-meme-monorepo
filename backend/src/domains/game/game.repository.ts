import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/common/db/db.module';
import * as schema from 'src/common/db/schema';
import {
    CreateGameDtoSchema,
    RegisterGameDtoSchema,
} from 'src/common/validator/game.validator';

@Injectable()
export class GameRepository {
    private readonly logger = new Logger(GameRepository.name);

    constructor(
        @Inject(DrizzleAsyncProvider)
        private readonly db: NodePgDatabase<typeof schema>,
    ) {}

    /**
     * @description 토큰 주소로 게임을 조회합니다.
     * @param tokenAddress 게임 토큰 주소 (0x...)
     * @returns 게임 정보 또는 null
     */
    async findByTokenAddress(tokenAddress: string) {
        try {
            const result = await this.db
                .select()
                .from(schema.games)
                .where(eq(schema.games.gameToken, tokenAddress.toLowerCase()))
                .limit(1);

            return result[0] || null;
        } catch (error) {
            this.logger.error(
                `❌ 토큰 주소로 게임 조회 실패 ${tokenAddress}: ${error.message}`,
            );
            return null;
        }
    }

    /**
     * @description 토큰 주소로 활성 게임을 조회합니다 (isEnded = false).
     * @param tokenAddress 게임 토큰 주소 (0x...)
     * @returns 활성 게임 정보 또는 null
     */
    async findActiveByTokenAddress(tokenAddress: string) {
        try {
            const result = await this.db
                .select()
                .from(schema.games)
                .where(
                    and(
                        eq(schema.games.gameToken, tokenAddress.toLowerCase()),
                        eq(schema.games.isEnded, false),
                    ),
                )
                .limit(1);

            return result[0] || null;
        } catch (error) {
            this.logger.error(
                `❌ 토큰 주소로 활성 게임 조회 실패 ${tokenAddress}: ${error.message}`,
            );
            return null;
        }
    }

    /**
     * @description 게임 상태를 업데이트합니다 (종료시간, 상금풀, 마지막 댓글 작성자 등)
     * @param gameId 게임 ID
     */
    async updateGameState(
        gameId: string,
        updates: {
            endTime?: Date;
            prizePool?: string;
            lastCommentor?: string;
            isClaimed?: boolean;
            isEnded?: boolean;
        },
    ) {
        try {
            await this.db
                .update(schema.games)
                .set(updates)
                .where(eq(schema.games.gameId, gameId));
        } catch (error) {
            this.logger.error(
                `❌ 게임 업데이트 실패 ${gameId}: ${error.message}`,
            );
            throw error;
        }
    }

    /**
     * @description 프론트엔드에서 전송한 게임 데이터를 검증하고 저장
     * @returns 생성된 게임 ID 또는 null (중복/실패 시)
     */
    async createFromFrontend(
        rawData: unknown,
    ): Promise<{ gameId: string } | null> {
        const result = CreateGameDtoSchema.safeParse(rawData);
        if (!result.success) {
            this.logger.error(`Invalid game data: ${result.error.message}`);
            return null;
        }

        const dto = result.data;

        // 중복 체크 (txHash unique 제약조건으로도 방어됨)
        const existing = await this.findByTxHash(dto.txHash);
        if (existing) {
            this.logger.warn(`중복 게임 생성 요청: txHash ${dto.txHash}`);
            return existing;
        }

        try {
            const [game] = await this.db
                .insert(schema.games)
                .values({
                    txHash: dto.txHash,
                    gameId: dto.gameId,
                    gameToken: dto.gameTokenAddr,
                    tokenSymbol: dto.tokenSymbol,
                    initiator: dto.initiator,
                    gameTime: dto.gameTime,
                    endTime: new Date(Number(dto.endTime) * 1000),
                    cost: dto.cost,
                    prizePool: dto.prizePool,
                    lastCommentor: dto.lastCommentor,
                    isClaimed: dto.isClaimed,
                })
                .returning({ gameId: schema.games.gameId });

            this.logger.log(`✅ 게임 저장 완료: ${game.gameId}`);
            return { gameId: game.gameId };
        } catch (error) {
            this.logger.error(`❌ 게임 저장 실패: ${error.message}`);
            return null;
        }
    }

    /**
     * @description txHash로 게임 조회
     */
    async findByTxHash(txHash: string): Promise<{ gameId: string } | null> {
        const [game] = await this.db
            .select({ gameId: schema.games.gameId })
            .from(schema.games)
            .where(eq(schema.games.txHash, txHash))
            .limit(1);

        return game ?? null;
    }

    /**
     * @description gameId로 게임 존재 여부 조회
     */
    async findByGameId(gameId: string): Promise<{ gameId: string } | null> {
        const [game] = await this.db
            .select({ gameId: schema.games.gameId })
            .from(schema.games)
            .where(eq(schema.games.gameId, gameId))
            .limit(1);

        return game ?? null;
    }

    /**
     * @description gameId로 전체 게임 정보 조회
     */
    async findFullByGameId(gameId: string) {
        const [game] = await this.db
            .select()
            .from(schema.games)
            .where(eq(schema.games.gameId, gameId))
            .limit(1);

        return game ?? null;
    }

    /**
     * @description txHash와 이벤트 데이터로 게임 생성 (V2)
     * @returns 생성된 게임 ID 또는 null (중복/실패 시)
     */
    async createFromTx(data: {
        txHash: string;
        gameId: string;
        initiator: string;
        gameToken: string;
        cost: string;
        gameTime: string;
        tokenSymbol: string;
        endTime: string;
        lastCommentor: string;
        totalFunding: string;
        tokenImageUrl?: string;
    }): Promise<{ gameId: string } | null> {
        // 중복 체크 (txHash)
        const existingByTx = await this.findByTxHash(data.txHash);
        if (existingByTx) {
            this.logger.warn(`중복 게임 생성 요청: txHash ${data.txHash}`);
            return { gameId: data.gameId };
        }

        // 중복 체크 (gameId)
        const existingByGameId = await this.findByGameId(data.gameId);
        if (existingByGameId) {
            this.logger.warn(`중복 게임 등록 요청: gameId ${data.gameId}`);
            return existingByGameId;
        }

        try {
            const [game] = await this.db
                .insert(schema.games)
                .values({
                    txHash: data.txHash,
                    gameId: data.gameId,
                    gameToken: data.gameToken.toLowerCase(),
                    tokenSymbol: data.tokenSymbol,
                    tokenImageUrl: data.tokenImageUrl,
                    initiator: data.initiator.toLowerCase(),
                    gameTime: data.gameTime,
                    endTime: new Date(Number(data.endTime) * 1000),
                    cost: data.cost,
                    prizePool: data.totalFunding, // 초기 prizePool = totalFunding
                    lastCommentor: data.lastCommentor.toLowerCase(),
                    isClaimed: false,
                    isEnded: false,
                    totalFunding: data.totalFunding,
                    funderCount: '1', // 생성자가 첫 펀더
                })
                .returning({ gameId: schema.games.gameId });

            this.logger.log(`✅ 게임 생성 완료 (txHash): ${game.gameId}`);
            return { gameId: game.gameId };
        } catch (error) {
            this.logger.error(`❌ 게임 생성 실패: ${error.message}`);
            return null;
        }
    }

    /**
     * @description 블록체인에서 조회한 게임 데이터를 검증하고 저장 (txHash 없음)
     * @returns 생성된 게임 ID 또는 null (중복/실패 시)
     */
    async registerFromBlockchain(
        rawData: unknown,
    ): Promise<{ gameId: string } | null> {
        const result = RegisterGameDtoSchema.safeParse(rawData);
        if (!result.success) {
            this.logger.error(
                `Invalid register game data: ${result.error.message}`,
            );
            return null;
        }

        const dto = result.data;

        // 중복 체크 (gameId로)
        const existing = await this.findByGameId(dto.gameId);
        if (existing) {
            this.logger.warn(`중복 게임 등록 요청: gameId ${dto.gameId}`);
            return existing;
        }

        try {
            const [game] = await this.db
                .insert(schema.games)
                .values({
                    gameId: dto.gameId,
                    gameToken: dto.gameToken,
                    tokenSymbol: dto.tokenSymbol,
                    initiator: dto.initiator,
                    gameTime: dto.gameTime,
                    endTime: new Date(Number(dto.endTime) * 1000),
                    cost: dto.cost,
                    prizePool: dto.prizePool,
                    lastCommentor: dto.lastCommentor,
                    isClaimed: dto.isClaimed,
                    isEnded: dto.isEnded,
                    totalFunding: dto.totalFunding,
                    funderCount: dto.funderCount,
                })
                .returning({ gameId: schema.games.gameId });

            this.logger.log(`✅ 블록체인 게임 등록 완료: ${game.gameId}`);
            return { gameId: game.gameId };
        } catch (error) {
            this.logger.error(`❌ 블록체인 게임 등록 실패: ${error.message}`);
            return null;
        }
    }

    /**
     * @description 게임 ID 목록으로 활성 게임 정보 조회 (isEnded = false, isClaimed = false)
     * @returns API 응답 형식에 맞게 매핑된 게임 목록
     */
    async findActiveGamesByIds(gameIds: string[]): Promise<
        {
            gameId: string;
            tokenImageUrl: string | null;
            tokenSymbol: string | null;
            currentPrizePool: string | null;
            endTime: Date | null;
        }[]
    > {
        if (gameIds.length === 0) {
            return [];
        }

        try {
            const games = await this.db
                .select({
                    gameId: schema.games.gameId,
                    tokenImageUrl: schema.games.tokenImageUrl,
                    tokenSymbol: schema.games.tokenSymbol,
                    prizePool: schema.games.prizePool,
                    endTime: schema.games.endTime,
                })
                .from(schema.games)
                .where(
                    and(
                        inArray(schema.games.gameId, gameIds),
                        eq(schema.games.isEnded, false),
                        eq(schema.games.isClaimed, false),
                    ),
                );

            return games.map((game) => ({
                gameId: game.gameId,
                tokenImageUrl: game.tokenImageUrl,
                tokenSymbol: game.tokenSymbol,
                currentPrizePool: game.prizePool,
                endTime: game.endTime,
            }));
        } catch (error) {
            this.logger.error(
                `❌ 활성 게임 목록 조회 실패: ${error.message}`,
            );
            return [];
        }
    }

    /**
     * @description 토큰별 총 상금 랭킹 조회 (claim된 게임 기준, 상위 N개)
     */
    async getGameRankingByToken(
        limit: number = 5,
    ): Promise<
        {
            tokenAddress: string;
            tokenSymbol: string | null;
            tokenImageUrl: string | null;
            totalPrize: string;
        }[]
    > {
        try {
            const result = await this.db
                .select({
                    tokenAddress: schema.games.gameToken,
                    tokenSymbol: schema.games.tokenSymbol,
                    tokenImageUrl: schema.games.tokenImageUrl,
                    totalPrize: sql<string>`COALESCE(SUM(CAST(${schema.games.prizePool} AS NUMERIC)), 0)::TEXT`,
                })
                .from(schema.games)
                .where(eq(schema.games.isClaimed, true))
                .groupBy(
                    schema.games.gameToken,
                    schema.games.tokenSymbol,
                    schema.games.tokenImageUrl,
                )
                .orderBy(
                    desc(
                        sql`SUM(CAST(${schema.games.prizePool} AS NUMERIC))`,
                    ),
                )
                .limit(limit);

            return result;
        } catch (error) {
            this.logger.error(`❌ 토큰별 상금 랭킹 조회 실패: ${error.message}`);
            return [];
        }
    }

    /**
     * @description 유저별 총 획득 상금 랭킹 조회 (claim한 게임의 prizePool 합계)
     */
    async getPrizeRankingByUser(limit: number = 5): Promise<
        {
            walletAddress: string;
            totalAmount: string;
        }[]
    > {
        try {
            // isClaimed = true인 게임의 lastCommentor별 prizePool 합계
            const result = await this.db
                .select({
                    walletAddress: schema.games.lastCommentor,
                    totalAmount: sql<string>`COALESCE(SUM(CAST(${schema.games.prizePool} AS NUMERIC)), 0)::TEXT`,
                })
                .from(schema.games)
                .where(eq(schema.games.isClaimed, true))
                .groupBy(schema.games.lastCommentor)
                .orderBy(
                    desc(
                        sql`SUM(CAST(${schema.games.prizePool} AS NUMERIC))`,
                    ),
                )
                .limit(limit);

            return result;
        } catch (error) {
            this.logger.error(`❌ 유저별 상금 랭킹 조회 실패: ${error.message}`);
            return [];
        }
    }
}
