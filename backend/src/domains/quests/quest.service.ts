import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/common/types';
import { QuestItem, QuestRespDto } from './dto/quest.resp.dto';
import { QuestRepository } from './quest.repository';
import { QuestType, UserQuest } from 'src/common/db/schema/quest.schema';

// 유효한 퀘스트 타입 목록
const VALID_QUEST_TYPES = Object.values(QuestType);

// 퀘스트 정렬 순서 (작은 목표가 먼저)
const QUEST_ORDER: Record<string, number> = {
    [QuestType.ATTENDANCE_5]: 1,
    [QuestType.ATTENDANCE_20]: 2,
    [QuestType.COMMENT_20]: 3,
    [QuestType.COMMENT_50]: 4,
};

@Injectable()
export class QuestService {
    private readonly logger = new Logger(QuestService.name);

    constructor(private readonly questRepository: QuestRepository) {}

    /**
     * @description 퀘스트 목록 조회 (Quests 탭)
     */
    async getQuests(walletAddress: string): Promise<Result<QuestRespDto>> {
        try {
            this.logger.log(`getQuests called with walletAddress: ${walletAddress}`);

            const userQuests =
                await this.questRepository.findByWalletAddress(walletAddress);

            // 유효한 퀘스트 타입만 필터링 후 정렬
            const validQuests = userQuests
                .filter((q) => VALID_QUEST_TYPES.includes(q.questType))
                .sort((a, b) => (QUEST_ORDER[a.questType] ?? 99) - (QUEST_ORDER[b.questType] ?? 99));

            this.logger.log(`Found ${validQuests.length} valid quests for ${walletAddress} (total: ${userQuests.length})`);

            const quests: QuestItem[] = validQuests.map((quest) => ({
                id: quest.id,
                type: quest.questType.toLowerCase().startsWith('attendance')
                    ? 'attendance'
                    : 'comments',
                title: quest.questTitle,
                description: quest.description,
                currentNumber: quest.currentNumber,
                targetNumber: quest.targetNumber,
                isClaimed: quest.isClaimed,
            }));

            return Result.ok({
                today: new Date().toISOString(),
                quests,
            });
        } catch (error) {
            this.logger.error(`Get quests failed: ${error.message}`);
            return Result.fail(
                '퀘스트 조회에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * @description 퀘스트 보상 수령
     */
    async claimQuest(
        walletAddress: string,
        questId: number,
    ): Promise<Result<{ quest: QuestItem }>> {
        try {
            const quest = await this.questRepository.findById(questId);

            if (!quest) {
                return Result.fail(
                    '퀘스트를 찾을 수 없습니다.',
                    HttpStatus.NOT_FOUND,
                );
            }

            if (quest.userWalletAddress !== walletAddress.toLowerCase()) {
                return Result.fail(
                    '해당 퀘스트에 대한 권한이 없습니다.',
                    HttpStatus.FORBIDDEN,
                );
            }

            if (quest.isClaimed) {
                return Result.fail(
                    '이미 보상을 수령한 퀘스트입니다.',
                    HttpStatus.BAD_REQUEST,
                );
            }

            if (quest.currentNumber < quest.targetNumber) {
                return Result.fail(
                    '퀘스트 목표를 아직 달성하지 못했습니다.',
                    HttpStatus.BAD_REQUEST,
                );
            }

            const claimed = await this.questRepository.markClaimedById(questId);

            if (!claimed) {
                return Result.fail(
                    '퀘스트 보상 수령에 실패했습니다.',
                    HttpStatus.INTERNAL_SERVER_ERROR,
                );
            }

            const questItem: QuestItem = {
                id: claimed.id,
                type: claimed.questType.toLowerCase().startsWith('attendance')
                    ? 'attendance'
                    : 'comments',
                title: claimed.questTitle,
                description: claimed.description,
                currentNumber: claimed.currentNumber,
                targetNumber: claimed.targetNumber,
                isClaimed: claimed.isClaimed,
            };

            this.logger.log(
                `Quest claimed: ${walletAddress} - ${claimed.questType}`,
            );

            return Result.ok({ quest: questItem });
        } catch (error) {
            this.logger.error(`Claim quest failed: ${error.message}`);
            return Result.fail(
                '퀘스트 보상 수령에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * @description 유저에게 퀘스트 초기화 (테스트용)
     */
    async initializeQuests(
        walletAddress: string,
    ): Promise<Result<{ quests: UserQuest[] }>> {
        try {
            // 이미 퀘스트가 있는지 확인
            const existing =
                await this.questRepository.findByWalletAddress(walletAddress);
            if (existing.length > 0) {
                this.logger.warn(
                    `Quests already exist for ${walletAddress}, count: ${existing.length}`,
                );
                return Result.ok({ quests: existing });
            }

            const quests =
                await this.questRepository.initializeQuestsForUser(
                    walletAddress,
                );

            this.logger.log(
                `Quests initialized for ${walletAddress}, count: ${quests.length}`,
            );

            return Result.ok({ quests });
        } catch (error) {
            this.logger.error(`Initialize quests failed: ${error.message}`);
            return Result.fail(
                '퀘스트 초기화에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
