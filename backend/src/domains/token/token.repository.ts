import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/common/db/db.module';
import * as schema from 'src/common/db/schema';
import { NewToken, Token } from 'src/common/db/schema/token.schema';

@Injectable()
export class TokenRepository {
    private readonly logger = new Logger(TokenRepository.name);

    constructor(
        @Inject(DrizzleAsyncProvider)
        private readonly db: NodePgDatabase<typeof schema>,
    ) {}

    /**
     * 토큰 주소로 조회
     */
    async findByTokenAddress(tokenAddress: string): Promise<Token | null> {
        const [token] = await this.db
            .select()
            .from(schema.tokens)
            .where(eq(schema.tokens.tokenAddress, tokenAddress.toLowerCase()))
            .limit(1);

        return token ?? null;
    }

    /**
     * username과 usertag로 조회
     */
    async findByUsernameAndUsertag(
        username: string,
        usertag: string,
    ): Promise<Token | null> {
        const [token] = await this.db
            .select()
            .from(schema.tokens)
            .where(
                and(
                    eq(schema.tokens.tokenUsername, username),
                    eq(schema.tokens.tokenUsertag, usertag),
                ),
            )
            .limit(1);

        return token ?? null;
    }

    /**
     * 토큰 생성
     */
    async create(data: NewToken): Promise<Token> {
        const [token] = await this.db
            .insert(schema.tokens)
            .values({
                ...data,
                tokenAddress: data.tokenAddress.toLowerCase(),
            })
            .returning();

        this.logger.log(`Token created: ${data.tokenAddress}`);
        return token;
    }

    /**
     * 토큰 정보 업데이트 (upsert)
     */
    async upsert(data: NewToken): Promise<Token> {
        const existing = await this.findByTokenAddress(data.tokenAddress);

        if (existing) {
            const [updated] = await this.db
                .update(schema.tokens)
                .set({
                    tokenImageUrl: data.tokenImageUrl,
                    tokenSymbol: data.tokenSymbol,
                })
                .where(
                    eq(
                        schema.tokens.tokenAddress,
                        data.tokenAddress.toLowerCase(),
                    ),
                )
                .returning();

            this.logger.log(`Token updated: ${data.tokenAddress}`);
            return updated;
        }

        return this.create(data);
    }

    /**
     * 여러 토큰 주소로 조회
     */
    async findByTokenAddresses(tokenAddresses: string[]): Promise<Token[]> {
        if (tokenAddresses.length === 0) {
            return [];
        }

        const normalizedAddresses = tokenAddresses.map((addr) =>
            addr.toLowerCase(),
        );

        const tokens = await this.db
            .select()
            .from(schema.tokens)
            .where(inArray(schema.tokens.tokenAddress, normalizedAddresses));

        return tokens;
    }
}
