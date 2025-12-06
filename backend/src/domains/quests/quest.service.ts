import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/common/types';
import { QuestItem, QuestRespDto } from './dto/quest.resp.dto';
import { QuestRepository } from './quest.repository';

@Injectable()
export class QuestService {
    private readonly logger = new Logger(QuestService.name);

    constructor(private readonly questRepository: QuestRepository) {}

    /**
     * @description 퀘스트 목록 조회 (Quests 탭)
     */
    async getQuests(walletAddress: string): Promise<Result<QuestRespDto>> {
        try {
            const userQuests =
                await this.questRepository.findByWalletAddress(walletAddress);

            const quests: QuestItem[] = userQuests.map((quest) => ({
                id: quest.id,
                type: quest.questType.startsWith('ATTENDANCE')
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
                type: claimed.questType.startsWith('ATTENDANCE')
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
}
