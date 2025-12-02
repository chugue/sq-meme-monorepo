import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/common/db/db.module';
import * as schema from 'src/common/db/schema';
import { NewUser, User } from 'src/common/db/schema/user.schema';
import { JoinDto } from './dto/join.dto';

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
     * @description 사용자 조회 또는 생성 (있으면 조회, 없으면 초기 체크인과 함께 생성)
     */
    async findOrCreate(
        dto: JoinDto,
        today: string,
    ): Promise<{ user: User; isNew: boolean }> {
        const existing = await this.findByWalletAddress(dto.walletAddress);

        if (existing) {
            return { user: existing, isNew: false };
        }

        const newUser: NewUser = {
            walletAddress: dto.walletAddress,
            userName: dto.userName,
            userTag: dto.userTag,
            profileImage: dto.profileImage,
            memexLink: dto.memexLink,
            memexWalletAddress: dto.memexWalletAddress,
            myTokenAddr: dto.myTokenAddr,
            myTokenSymbol: dto.myTokenSymbol,
            checkInHistory: [{ day: today, currentStreak: 1 }],
        };

        const user = await this.create(newUser);
        return { user, isNew: true };
    }
}
