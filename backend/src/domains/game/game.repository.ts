import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/common/db/db.module';
import * as schema from 'src/common/db/schema';
import { CreateGameDtoSchema } from 'src/common/validator/game.validator';

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
     * @description 게임 상태를 업데이트합니다 (종료시간, 상금풀, 마지막 댓글 작성자 등)
     */
    async updateGameState(
        gameAddress: string,
        updates: {
            endTime?: Date;
            prizePool?: string;
            lastCommentor?: string;
            isClaimed?: boolean;
        },
    ) {
        try {
            await this.db
                .update(schema.games)
                .set(updates)
                .where(eq(schema.games.gameAddress, gameAddress));
        } catch (error) {
            this.logger.error(
                `❌ 게임 업데이트 실패 ${gameAddress}: ${error.message}`,
            );
            throw error;
        }
    }

    /**
     * @description 프론트엔드에서 전송한 게임 데이터를 검증하고 저장
     * @returns 생성된 게임 주소 또는 null (중복/실패 시)
     */
    async createFromFrontend(
        rawData: unknown,
    ): Promise<{ gameAddress: string } | null> {
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
                    gameAddress: dto.gameAddr,
                    gameToken: dto.gameTokenAddr,
                    tokenSymbol: dto.tokenSymbol,
                    tokenName: dto.tokenName,
                    initiator: dto.initiator,
                    gameTime: dto.gameTime,
                    endTime: new Date(Number(dto.endTime) * 1000),
                    cost: dto.cost,
                    prizePool: dto.prizePool,
                    lastCommentor: dto.lastCommentor,
                    isClaimed: dto.isClaimed,
                })
                .returning({ gameAddress: schema.games.gameAddress });

            this.logger.log(`✅ 게임 저장 완료: ${game.gameAddress}`);
            return { gameAddress: game.gameAddress };
        } catch (error) {
            this.logger.error(`❌ 게임 저장 실패: ${error.message}`);
            return null;
        }
    }

    /**
     * @description txHash로 게임 조회
     */
    async findByTxHash(txHash: string): Promise<{ gameAddress: string } | null> {
        const [game] = await this.db
            .select({ gameAddress: schema.games.gameAddress })
            .from(schema.games)
            .where(eq(schema.games.txHash, txHash))
            .limit(1);

        return game ?? null;
    }
}
