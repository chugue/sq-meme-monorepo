import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { EthereumProvider } from 'src/common/providers';
import { Result } from 'src/common/types';
import { GameRepository } from '../game/game.repository';
import { FundersRepository } from './funders.repository';

// V2 컨트랙트 이벤트 시그니처
const PRIZE_POOL_FUNDED_EVENT =
    'event PrizePoolFunded(uint256 indexed gameId, address indexed funder, uint256 amount, uint256 totalFunding)';

@Injectable()
export class FundersService {
    private readonly logger = new Logger(FundersService.name);
    private prizePoolFundedIface: ethers.Interface;
    private readonly contractAddress: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly ethereumProvider: EthereumProvider,
        private readonly fundersRepository: FundersRepository,
        private readonly gameRepository: GameRepository,
    ) {
        this.prizePoolFundedIface = new ethers.Interface([
            PRIZE_POOL_FUNDED_EVENT,
        ]);
        this.contractAddress =
            this.configService.get<string>('COMMENT_GAME_V2_ADDRESS') || '';
    }

    /**
     * @description txHash로 PrizePoolFunded 이벤트를 파싱하여 펀딩 정보 저장
     * @param txHash 트랜잭션 해시
     */
    async saveFundingByTx(
        txHash: string,
    ): Promise<Result<{ id: number; totalFunding: string }>> {
        if (!txHash) {
            return Result.fail('txHash is required', HttpStatus.BAD_REQUEST);
        }

        try {
            const receipt =
                await this.ethereumProvider.getTransactionReceipt(txHash);

            if (!receipt) {
                this.logger.warn(`트랜잭션 영수증 없음: ${txHash}`);
                return Result.fail(
                    '트랜잭션 영수증을 찾을 수 없습니다.',
                    HttpStatus.NOT_FOUND,
                );
            }

            if (receipt.status === 0) {
                this.logger.warn(`트랜잭션 실패 (revert): ${txHash}`);
                return Result.fail(
                    '트랜잭션이 실패했습니다.',
                    HttpStatus.UNPROCESSABLE_ENTITY,
                );
            }

            // PrizePoolFunded 이벤트 찾기
            const prizePoolFundedTopic =
                this.prizePoolFundedIface.getEvent(
                    'PrizePoolFunded',
                )?.topicHash;

            const prizePoolFundedLog = receipt.logs.find(
                (log) =>
                    log.topics[0] === prizePoolFundedTopic &&
                    log.address.toLowerCase() ===
                        this.contractAddress.toLowerCase(),
            );

            if (!prizePoolFundedLog) {
                this.logger.warn(`PrizePoolFunded 이벤트 없음: ${txHash}`);
                this.logger.warn(`조회 조건 - topic: ${prizePoolFundedTopic}`);
                this.logger.warn(
                    `조회 조건 - contractAddress: ${this.contractAddress}`,
                );
                return Result.fail(
                    'PrizePoolFunded 이벤트를 찾을 수 없습니다.',
                    HttpStatus.NOT_FOUND,
                );
            }

            // 이벤트 디코딩
            const decoded = this.prizePoolFundedIface.decodeEventLog(
                'PrizePoolFunded',
                prizePoolFundedLog.data,
                prizePoolFundedLog.topics,
            );

            const rawEvent = decoded.toObject();
            const gameId = rawEvent.gameId.toString();
            const funder = rawEvent.funder as string;
            const amount = rawEvent.amount.toString();
            const totalFunding = rawEvent.totalFunding.toString();

            this.logger.log(
                `💰 PrizePoolFunded 확인: gameId=${gameId}, funder=${funder}, amount=${amount}, totalFunding=${totalFunding}`,
            );

            // 기존 펀더 조회
            const existingFunder =
                await this.fundersRepository.findByGameIdAndFunder(
                    gameId,
                    funder,
                );

            let result: { id: number } | null;

            if (existingFunder) {
                // 기존 펀더가 있으면 업데이트 (txHash 배열에 추가)
                result = await this.fundersRepository.update(
                    existingFunder.id,
                    {
                        totalFunding,
                        txHash,
                    },
                );
                this.logger.log(
                    `🔄 기존 펀더 업데이트: id=${existingFunder.id}, funder=${funder}`,
                );
            } else {
                // 새 펀더 생성
                result = await this.fundersRepository.create({
                    gameId,
                    funderAddress: funder,
                    totalFunding,
                    txHash,
                });
                this.logger.log(`➕ 새 펀더 생성: funder=${funder}`);
            }

            if (!result) {
                return Result.fail(
                    '펀딩 저장에 실패했습니다.',
                    HttpStatus.INTERNAL_SERVER_ERROR,
                );
            }

            // 게임의 prizePool 업데이트
            await this.gameRepository.updateGameState(gameId, {
                prizePool: totalFunding,
            });

            this.logger.log(
                `✅ 펀딩 처리 완료: gameId=${gameId}, prizePool=${totalFunding}`,
            );

            return Result.ok({ id: result.id, totalFunding });
        } catch (error) {
            this.logger.error(
                `PrizePoolFunded 처리 실패: ${error.message}`,
                error.stack,
            );
            return Result.fail(
                '펀딩 처리에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * @description gameId로 펀더 목록 조회
     */
    async getFundersByGameId(gameId: string) {
        const funders = await this.fundersRepository.findByGameId(gameId);
        return Result.ok(funders);
    }
}
