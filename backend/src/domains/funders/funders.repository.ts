import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/common/db/db.module';
import * as schema from 'src/common/db/schema';

@Injectable()
export class FundersRepository {
    private readonly logger = new Logger(FundersRepository.name);

    constructor(
        @Inject(DrizzleAsyncProvider)
        private readonly db: NodePgDatabase<typeof schema>,
    ) {}

    /**
     * @description 펀딩 정보 저장
     */
    async create(data: {
        gameId: string;
        funderAddress: string;
        amount: string;
        totalFunding: string;
        txHash: string;
    }): Promise<{ id: number } | null> {
        // 중복 체크 (txHash)
        const existing = await this.findByTxHash(data.txHash);
        if (existing) {
            this.logger.warn(`중복 펀딩 등록 요청: txHash ${data.txHash}`);
            return { id: existing.id };
        }

        try {
            const [funder] = await this.db
                .insert(schema.funders)
                .values({
                    gameId: data.gameId,
                    funderAddress: data.funderAddress.toLowerCase(),
                    amount: data.amount,
                    totalFunding: data.totalFunding,
                    txHash: data.txHash,
                })
                .returning({ id: schema.funders.id });

            this.logger.log(
                `✅ 펀딩 저장 완료: gameId=${data.gameId}, funder=${data.funderAddress}, amount=${data.amount}`,
            );
            return { id: funder.id };
        } catch (error) {
            this.logger.error(`❌ 펀딩 저장 실패: ${error.message}`);
            return null;
        }
    }

    /**
     * @description txHash로 펀딩 조회
     */
    async findByTxHash(txHash: string): Promise<{ id: number } | null> {
        const [funder] = await this.db
            .select({ id: schema.funders.id })
            .from(schema.funders)
            .where(eq(schema.funders.txHash, txHash))
            .limit(1);

        return funder ?? null;
    }

    /**
     * @description gameId로 펀더 목록 조회
     */
    async findByGameId(gameId: string) {
        return this.db
            .select()
            .from(schema.funders)
            .where(eq(schema.funders.gameId, gameId));
    }
}
