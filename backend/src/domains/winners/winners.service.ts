import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/common/types';
import {
    WinnersRepository,
    CreateWinnerDto,
    TopWinner,
} from './winners.repository';

@Injectable()
export class WinnersService {
    private readonly logger = new Logger(WinnersService.name);

    constructor(private readonly winnersRepository: WinnersRepository) {}

    /**
     * Get top winners by total prize amount
     * @param limit Number of top winners to return
     */
    async getTopWinners(limit = 10): Promise<Result<TopWinner[]>> {
        try {
            const winners = await this.winnersRepository.getTopWinners(limit);
            return Result.ok(winners);
        } catch (error) {
            this.logger.error(`상위 우승자 조회 실패: ${error.message}`);
            return Result.fail(
                '상위 우승자 조회에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Get all winner records for a specific wallet
     * @param walletAddress User's wallet address
     */
    async getWinnersByWallet(walletAddress: string) {
        try {
            const winners =
                await this.winnersRepository.findByWalletAddress(walletAddress);
            return Result.ok(winners);
        } catch (error) {
            this.logger.error(`지갑 우승 기록 조회 실패: ${error.message}`);
            return Result.fail(
                '우승 기록 조회에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Create a new winner record when prize is claimed
     * @param data Winner data
     */
    async createWinner(data: CreateWinnerDto): Promise<Result<{ id: number }>> {
        try {
            const result = await this.winnersRepository.create(data);

            if (!result) {
                return Result.fail(
                    '우승자 저장에 실패했습니다.',
                    HttpStatus.INTERNAL_SERVER_ERROR,
                );
            }

            return Result.ok(result);
        } catch (error) {
            this.logger.error(`우승자 생성 실패: ${error.message}`);
            return Result.fail(
                '우승자 생성에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
