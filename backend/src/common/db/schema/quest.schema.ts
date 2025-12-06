import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import {
    boolean,
    index,
    serial,
    timestamp,
    varchar,
} from 'drizzle-orm/pg-core';
import { squidSchema } from './common';
import { users } from './user.schema';

// 퀘스트 타입 enum
export const QuestType = {
    ATTENDANCE_5: 'ATTENDANCE_5', // 연속 출석 5일
    ATTENDANCE_10: 'ATTENDANCE_10', // 연속 출석 10일
    COMMENT_20: 'COMMENT_20', // 댓글 20개
    COMMENT_50: 'COMMENT_50', // 댓글 50개
} as const;

export type QuestTypeValue = (typeof QuestType)[keyof typeof QuestType];

// 퀘스트 정보 (타입별 메타데이터)
export const QuestMeta: Record<
    QuestTypeValue,
    { title: string; target: number }
> = {
    ATTENDANCE_5: { title: '5일 연속 출석', target: 5 },
    ATTENDANCE_10: { title: '10일 연속 출석', target: 10 },
    COMMENT_20: { title: '댓글 20개 작성', target: 20 },
    COMMENT_50: { title: '댓글 50개 작성', target: 50 },
};

export const userQuests = squidSchema.table(
    'user_quests',
    {
        id: serial('id').primaryKey(),

        // 유저 지갑 주소
        userWalletAddress: varchar('user_wallet_address', { length: 42 }).notNull(),

        // 퀘스트 타입
        questType: varchar('quest_type', { length: 32 }).notNull().$type<QuestTypeValue>(),

        // 퀘스트 제목 (조회 편의용)
        questTitle: varchar('quest_title', { length: 100 }).notNull(),

        // 자격 충족 여부 (목표 달성했는지)
        isEligible: boolean('is_eligible').default(false).notNull(),

        // 보상 수령 여부
        isClaimed: boolean('is_claimed').default(false).notNull(),

        // 자격 충족 시간
        eligibleAt: timestamp('eligible_at'),

        // 보상 수령 시간
        claimedAt: timestamp('claimed_at'),

        createdAt: timestamp('created_at').defaultNow(),
        updatedAt: timestamp('updated_at')
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => {
        return {
            userWalletIdx: index('quest_user_wallet_idx').on(table.userWalletAddress),
            questTypeIdx: index('quest_type_idx').on(table.questType),
            // 유저+퀘스트 타입 복합 인덱스 (중복 방지용 조회)
            userQuestIdx: index('user_quest_idx').on(
                table.userWalletAddress,
                table.questType,
            ),
        };
    },
);

// Relations: userQuests -> users (many-to-one via walletAddress)
export const userQuestsRelations = relations(userQuests, ({ one }) => ({
    user: one(users, {
        fields: [userQuests.userWalletAddress],
        references: [users.walletAddress],
    }),
}));

export type UserQuest = InferSelectModel<typeof userQuests>;
export type NewUserQuest = InferInsertModel<typeof userQuests>;
