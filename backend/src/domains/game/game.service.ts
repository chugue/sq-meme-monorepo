import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { EthereumProvider } from 'src/common/providers';
import { Result } from 'src/common/types';
import { GameRepository } from './game.repository';

const PRIZE_CLAIMED_EVENT =
    'event PrizeClaimed(address indexed winner, uint256 winnerShare, uint256 platformShare, uint256 timestamp)';

@Injectable()
export class GameService {
    private readonly logger = new Logger(GameService.name);
    private prizeClaimedIface: ethers.Interface;

    constructor(
        private readonly ethereumProvider: EthereumProvider,
        private readonly gameRepository: GameRepository,
    ) {
        this.prizeClaimedIface = new ethers.Interface([PRIZE_CLAIMED_EVENT]);
    }

    /**
     * 트랜잭션 영수증에서 PrizeClaimed 이벤트를 파싱하고 DB 업데이트
     * @param txHash 트랜잭션 해시
     * @param gameAddress 게임 컨트랙트 주소
     * @returns 성공 여부
     */
    async processPrizeClaimedTransaction(
        txHash: string,
        gameAddress: string,
    ): Promise<boolean> {
        try {
            const receipt =
                await this.ethereumProvider.getTransactionReceipt(txHash);

            if (!receipt) {
                this.logger.warn(`트랜잭션 영수증 없음: ${txHash}`);
                return false;
            }

            if (receipt.status === 0) {
                this.logger.warn(`트랜잭션 실패 (revert): ${txHash}`);
                return false;
            }

            // PrizeClaimed 이벤트 찾기
            const prizeClaimedTopic =
                this.prizeClaimedIface.getEvent('PrizeClaimed')?.topicHash;

            const prizeClaimedLog = receipt.logs.find(
                (log) =>
                    log.topics[0] === prizeClaimedTopic &&
                    log.address.toLowerCase() === gameAddress.toLowerCase(),
            );

            if (!prizeClaimedLog) {
                this.logger.warn(
                    `PrizeClaimed 이벤트 없음: ${txHash}, game: ${gameAddress}`,
                );
                return false;
            }

            // 이벤트 디코딩
            const decoded = this.prizeClaimedIface.decodeEventLog(
                'PrizeClaimed',
                prizeClaimedLog.data,
                prizeClaimedLog.topics,
            );

            const rawEvent = decoded.toObject();

            this.logger.log(
                `🏆 PrizeClaimed 확인: gameAddress=${gameAddress}, winner=${rawEvent.winner}`,
            );

            // DB 업데이트
            await this.gameRepository.updateGameState(
                gameAddress.toLowerCase(),
                {
                    isClaimed: true,
                },
            );

            this.logger.log(`✅ 게임 상금 수령 완료 처리: ${gameAddress}`);
            return true;
        } catch (error) {
            this.logger.error(
                `PrizeClaimed 처리 실패: ${error.message}`,
                error.stack,
            );
            return false;
        }
    }

    /**
     * @description 프론트엔드에서 전송한 게임 데이터를 저장
     */
    async createGame(data: unknown): Promise<Result<{ gameAddress: string }>> {
        try {
            const result = await this.gameRepository.createFromFrontend(data);

            if (!result) {
                return Result.fail('게임 저장에 실패했습니다.');
            }

            return Result.ok(result);
        } catch (error) {
            this.logger.error(`Create game failed: ${error.message}`);
            return Result.fail('게임 저장에 실패했습니다.');
        }
    }
}
