import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/common/db/db.module';
import * as schema from 'src/common/db/schema';
import { User, NewUser } from 'src/common/db/schema/user.schema';

@Injectable()
export class UsersRepository {
    private readonly logger = new Logger(UsersRepository.name);

    constructor(
        @Inject(DrizzleAsyncProvider)
        private readonly db: NodePgDatabase<typeof schema>,
    ) {}

    /**
     * @description 지갑 주소로 사용자 조회
     */
    async findByWalletAddress(walletAddress: string): Promise<User | null> {
        const [user] = await this.db
            .select()
            .from(schema.users)
            .where(eq(schema.users.walletAddress, walletAddress.toLowerCase()))
            .limit(1);

        return user ?? null;
    }

    /**
     * @description 새 사용자 생성
     */
    async create(data: NewUser): Promise<User> {
        const [user] = await this.db
            .insert(schema.users)
            .values({
                ...data,
                walletAddress: data.walletAddress.toLowerCase(),
            })
            .returning();

        return user;
    }

    /**
     * @description 사용자 정보 업데이트
     */
    async update(
        walletAddress: string,
        data: Partial<Omit<NewUser, 'walletAddress'>>,
    ): Promise<User | null> {
        const [user] = await this.db
            .update(schema.users)
            .set(data)
            .where(eq(schema.users.walletAddress, walletAddress.toLowerCase()))
            .returning();

        return user ?? null;
    }

    /**
     * @description 사용자 생성 또는 업데이트 (upsert)
     */
    async upsert(data: NewUser): Promise<User> {
        const existing = await this.findByWalletAddress(data.walletAddress);

        if (existing) {
            const updated = await this.update(data.walletAddress, {
                userName: data.userName ?? existing.userName,
                userTag: data.userTag ?? existing.userTag,
                profileImage: data.profileImage ?? existing.profileImage,
                memexLink: data.memexLink ?? existing.memexLink,
                memexWalletAddress:
                    data.memexWalletAddress ?? existing.memexWalletAddress,
                myTokenAddr: data.myTokenAddr ?? existing.myTokenAddr,
                myTokenSymbol: data.myTokenSymbol ?? existing.myTokenSymbol,
            });
            return updated!;
        }

        return await this.create(data);
    }
}
