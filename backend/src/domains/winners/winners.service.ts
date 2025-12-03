import { Injectable, Logger } from '@nestjs/common';
import { WinnersRepository, CreateWinnerDto } from './winners.repository';

@Injectable()
export class WinnersService {
    private readonly logger = new Logger(WinnersService.name);

    constructor(private readonly winnersRepository: WinnersRepository) {}

    /**
     * Get top winners by total prize amount
     * @param limit Number of top winners to return
     */
    async getTopWinners(limit = 10) {
        return this.winnersRepository.getTopWinners(limit);
    }

    /**
     * Get all winner records for a specific wallet
     * @param walletAddress User's wallet address
     */
    async getWinnersByWallet(walletAddress: string) {
        return this.winnersRepository.findByWalletAddress(walletAddress);
    }

    /**
     * Create a new winner record when prize is claimed
     * @param data Winner data
     */
    async createWinner(data: CreateWinnerDto) {
        return this.winnersRepository.create(data);
    }
}
