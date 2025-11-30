import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/common/db/db.module';
import * as schema from 'src/common/db/schema';
import { NewGame } from 'src/common/db/schema/game.schema';
import { GameCreatedEventSchema } from 'src/common/validator/game.validator';

@Injectable()
export class GameRepository {
    private readonly logger = new Logger(GameRepository.name);

    constructor(
        @Inject(DrizzleAsyncProvider)
        private readonly db: NodePgDatabase<typeof schema>,
    ) {}

    /**
     * @description 블록체인에서 발생한 GameCreated 이벤트를 수신하여 DB에 새 게임 정보를 저장합니다.
     * @param rawEvents 블록체인 로그에서 추출한 원본 이벤트 데이터 배열 (검증 전 상태)
     * @returns 저장된 게임 주소 배열
     */
    async createGames(
        rawEvents: unknown[],
    ): Promise<{ gameAddress: string }[]> {
        if (rawEvents.length === 0) return [];

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
                    tokenSymbol: data.tokenSymbol,
                    tokenName: data.tokenName,
                    initiator: data.initiator,
                    gameTime: data.gameTime,
                    endTime: data.endTime,
                    cost: data.cost,
                    prizePool: data.prizePool,
                    isEnded: data.isEnded,
                    lastCommentor: data.lastCommentor,
                } as NewGame;
            })
            .filter((game) => game !== null) as NewGame[];

        if (games.length === 0) return [];

        try {
            const savedGames = await this.db
                .insert(schema.games)
                .values(games)
                .returning({ gameAddress: schema.games.gameAddress });

            this.logger.log(
                `✅ ${savedGames.length}개 게임 저장 완료: ${savedGames.map((g) => g.gameAddress).join(', ')}`,
            );
            return savedGames;
        } catch (error) {
            this.logger.error(`❌ 게임 저장 실패: ${error.message}`);
            return [];
        }
    }

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
            isEnded?: boolean;
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
}
