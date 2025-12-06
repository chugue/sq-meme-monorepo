import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
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
    private readonly logger = new Logger(QuestRepository.name);

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
            isEligible: false,
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
     * @description 퀘스트 자격 달성 처리
     */
    async markEligible(
        walletAddress: string,
        questType: QuestTypeValue,
    ): Promise<UserQuest | null> {
        const [quest] = await this.db
            .update(schema.userQuests)
            .set({
                isEligible: true,
                eligibleAt: new Date(),
            })
            .where(
                and(
                    eq(
                        schema.userQuests.userWalletAddress,
                        walletAddress.toLowerCase(),
                    ),
                    eq(schema.userQuests.questType, questType),
                ),
            )
            .returning();

        return quest ?? null;
    }

    /**
     * @description 퀘스트 보상 수령 처리
     */
    async markClaimed(
        walletAddress: string,
        questType: QuestTypeValue,
    ): Promise<UserQuest | null> {
        const [quest] = await this.db
            .update(schema.userQuests)
            .set({
                isClaimed: true,
                claimedAt: new Date(),
            })
            .where(
                and(
                    eq(
                        schema.userQuests.userWalletAddress,
                        walletAddress.toLowerCase(),
                    ),
                    eq(schema.userQuests.questType, questType),
                ),
            )
            .returning();

        return quest ?? null;
    }

    /**
     * @description 출석 streak 기반 퀘스트 eligible 업데이트
     */
    async updateAttendanceQuests(user: schema.User): Promise<void> {
        const history = user.checkInHistory ?? [];
        const lastCheckIn = history[history.length - 1];
        const currentStreak = lastCheckIn?.currentStreak ?? 0;

        const walletAddress = user.walletAddress.toLowerCase();

        // 5일 연속 출석 달성 체크
        if (currentStreak >= 5) {
            const quest5 = await this.findByWalletAndType(
                walletAddress,
                QuestType.ATTENDANCE_5,
            );
            if (quest5 && !quest5.isEligible) {
                await this.markEligible(walletAddress, QuestType.ATTENDANCE_5);
                this.logger.log(
                    `ATTENDANCE_5 eligible: ${walletAddress} (streak: ${currentStreak})`,
                );
            }
        }

        // 10일 연속 출석 달성 체크
        if (currentStreak >= 10) {
            const quest10 = await this.findByWalletAndType(
                walletAddress,
                QuestType.ATTENDANCE_10,
            );
            if (quest10 && !quest10.isEligible) {
                await this.markEligible(walletAddress, QuestType.ATTENDANCE_10);
                this.logger.log(
                    `ATTENDANCE_10 eligible: ${walletAddress} (streak: ${currentStreak})`,
                );
            }
        }
    }
}
