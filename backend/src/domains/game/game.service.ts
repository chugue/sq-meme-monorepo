import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { EthereumProvider } from 'src/common/providers';
import { GameRepository } from './game.repository';

const GAME_CREATED_EVENT =
    'event GameCreated(uint256 gameId, address indexed gameAddr, address indexed gameTokenAddr, address initiator, uint256 gameTime, uint256 endTime, uint256 cost, uint256 prizePool, address lastCommentor, bool isEnded)';

@Injectable()
export class GameService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(GameService.name);
    private iface: ethers.Interface;
    private isListening = false;

    constructor(
        private readonly configService: ConfigService,
        private readonly ethereumProvider: EthereumProvider,
        private readonly gameRepository: GameRepository,
    ) {
        this.iface = new ethers.Interface([GAME_CREATED_EVENT]);
    }

    onModuleInit() {
        this.startListening();
    }

    onModuleDestroy() {
        this.stopListening();
    }

    private startListening() {
        const factoryAddress = this.configService.get<string>(
            'GAME_FACTORY_ADDRESS',
        );

        if (!factoryAddress) {
            this.logger.warn(
                'GAME_FACTORY_ADDRESS is not configured, skipping listener',
            );
            return;
        }

        const provider = this.ethereumProvider.getProvider();
        const topic = this.iface.getEvent('GameCreated')?.topicHash;

        if (!topic) {
            this.logger.error('Failed to generate GameCreated event topic');
            return;
        }

        const filter = {
            address: factoryAddress,
            topics: [topic],
        };

        provider.on(filter, (log) => this.handleGameCreatedLog(log));
        this.isListening = true;

        this.logger.log(
            `GameCreated event listener started (Factory: ${factoryAddress})`,
        );
    }

    private stopListening() {
        if (this.isListening) {
            this.ethereumProvider.getProvider().removeAllListeners();
            this.isListening = false;
            this.logger.log('GameCreated event listener stopped');
        }
    }

    private async handleGameCreatedLog(log: ethers.Log) {
        try {
            const decoded = this.iface.decodeEventLog(
                'GameCreated',
                log.data,
                log.topics,
            );

            // Convert ethers.Result to plain object and pass to repository
            const rawEvent = decoded.toObject();
            await this.gameRepository.createGames([rawEvent]);
        } catch (error) {
            this.logger.error(`Event processing failed: ${error.message}`);
        }
    }
}
