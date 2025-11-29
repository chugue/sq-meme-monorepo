import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as viem from 'viem';
import { PublicClient } from 'viem';
import { INSECTARIUM_CHAIN } from './blockchain.constant';
import { BlockchainRepository } from './blockchain.repository';

@Injectable()
export class BlockchainService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(BlockchainService.name);
    private client: PublicClient;
    private unwatch: () => void;

    constructor(
        private readonly configService: ConfigService,
        private readonly blockchainQuery: BlockchainRepository,
    ) {}

    onModuleInit() {
        this.connect();
    }

    onModuleDestroy() {
        this.logger.log('🛑 Blockchain Service Stopping...');
        if (this.unwatch) this.unwatch();
    }

    public getClient() {
        return this.client;
    }

    private connect() {
        this.logger.log('🔌 Connecting to Insectarium Testnet...');

        this.client = viem.createPublicClient({
            chain: INSECTARIUM_CHAIN,
            transport: viem.webSocket(),
        });

        this.logger.log('✅ Connected via WebSocket!');

        this.startListening();
    }

    private startListening() {
        this.logger.log('🎧 Starting Contract Event Listener...');
        this.watchGameCreated();
        // TODO: this.watchCommentAdded();
    }

    private watchGameCreated() {
        const factoryAddress = this.configService.get<string>(
            'GAME_FACTORY_ADDRESS',
        );

        if (!factoryAddress) {
            this.logger.error('🚨 GAME_FACTORY_ADDRESS is missing in .env');
            return;
        }

        const gameCreatedEvent = viem.parseAbiItem(
            'event GameCreated(uint256 gameId, address indexed gameAddr, address indexed gameTokenAddr, address initiator, uint256 remainTime, uint256 endTime, uint256 cost, uint256 prizePool, bool isEnded, address lastCommentor)',
        );

        this.unwatch = this.client.watchContractEvent({
            address: factoryAddress as `0x${string}`,
            abi: [gameCreatedEvent],
            eventName: 'GameCreated',
            onLogs: async (logs: any[]) => {
                const rawEvents = logs.map((log) => log.args);

                if (rawEvents.length > 0) {
                    await this.blockchainQuery.createGames(rawEvents);
                }
            },
        });
    }
}
