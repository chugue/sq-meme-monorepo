import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, lt } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/common/db/db.module';
import * as schema from 'src/common/db/schema';
import {
    NewUserQuest,
    QuestMeta,
    QuestType,
    QuestTypeValue,
    UserQuest,
} from 'src/common/db/schema/quest.schema';

@Injectable()
export class QuestRepository {
    constructor(
        @Inject(DrizzleAsyncProvider)
        private readonly db: NodePgDatabase<typeof schema>,
    ) {}

    /**
     * @description 신규 유저에게 모든 퀘스트 초기화 (4개)
     */
    async initializeQuestsForUser(walletAddress: string): Promise<UserQuest[]> {
        const questTypes = Object.values(QuestType) as QuestTypeValue[];

        const newQuests: NewUserQuest[] = questTypes.map((questType) => ({
            userWalletAddress: walletAddress.toLowerCase(),
            questType,
            questTitle: QuestMeta[questType].title,
            description: QuestMeta[questType].description,
            currentNumber: 0,
            targetNumber: QuestMeta[questType].target,
            isClaimed: false,
        }));

        const quests = await this.db
            .insert(schema.userQuests)
            .values(newQuests)
            .returning();

        return quests;
    }

    /**
     * @description 유저의 모든 퀘스트 조회
     */
    async findByWalletAddress(walletAddress: string): Promise<UserQuest[]> {
        return this.db
            .select()
            .from(schema.userQuests)
            .where(
                eq(
                    schema.userQuests.userWalletAddress,
                    walletAddress.toLowerCase(),
                ),
            );
    }

    /**
     * @description 특정 퀘스트 조회
     */
    async findByWalletAndType(
        walletAddress: string,
        questType: QuestTypeValue,
    ): Promise<UserQuest | null> {
        const [quest] = await this.db
            .select()
            .from(schema.userQuests)
            .where(
                and(
                    eq(
                        schema.userQuests.userWalletAddress,
                        walletAddress.toLowerCase(),
                    ),
                    eq(schema.userQuests.questType, questType),
                ),
            )
            .limit(1);

        return quest ?? null;
    }

    /**
     * @description ID로 퀘스트 조회
     */
    async findById(questId: number): Promise<UserQuest | null> {
        const [quest] = await this.db
            .select()
            .from(schema.userQuests)
            .where(eq(schema.userQuests.id, questId))
            .limit(1);

        return quest ?? null;
    }

    /**
     * @description 퀘스트 보상 수령 처리 (by ID)
     */
    async markClaimedById(questId: number): Promise<UserQuest | null> {
        const [quest] = await this.db
            .update(schema.userQuests)
            .set({
                isClaimed: true,
                claimedAt: new Date(),
            })
            .where(eq(schema.userQuests.id, questId))
            .returning();

        return quest ?? null;
    }

    /**
     * @description 출석 streak 기반 퀘스트 currentNumber 업데이트
     */
    async updateAttendanceQuests(user: schema.User): Promise<void> {
        const history = user.checkInHistory ?? [];
        const lastCheckIn = history[history.length - 1];
        const currentStreak = lastCheckIn?.currentStreak ?? 0;
        const walletAddress = user.walletAddress.toLowerCase();

        await this.db
            .update(schema.userQuests)
            .set({ currentNumber: currentStreak })
            .where(
                and(
                    eq(schema.userQuests.userWalletAddress, walletAddress),
                    eq(schema.userQuests.isClaimed, false),
                    lt(schema.userQuests.currentNumber, currentStreak),
                    inArray(schema.userQuests.questType, [
                        QuestType.ATTENDANCE_5,
                        QuestType.ATTENDANCE_20,
                    ]),
                ),
            );
    }

    /**
     * @description 댓글 수 기반 퀘스트 currentNumber 업데이트
     */
    async updateCommentQuestsForUser(
        commentor: string,
        commentCount: number,
    ): Promise<void> {
        const walletAddress = commentor.toLowerCase();

        await this.db
            .update(schema.userQuests)
            .set({ currentNumber: commentCount })
            .where(
                and(
                    eq(schema.userQuests.userWalletAddress, walletAddress),
                    eq(schema.userQuests.isClaimed, false),
                    lt(schema.userQuests.currentNumber, commentCount),
                    inArray(schema.userQuests.questType, [
                        QuestType.COMMENT_20,
                        QuestType.COMMENT_50,
                    ]),
                ),
            );
    }
}
