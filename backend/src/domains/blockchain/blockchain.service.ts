import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    createPublicClient,
    parseAbiItem,
    PublicClient,
    webSocket,
} from 'viem';
import { INSECTARIUM_CHAIN } from './blockchain.constant';

@Injectable()
export class BlockchainService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(BlockchainService.name);
    private client: PublicClient;
    private unwatch: () => void;

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        this.connect();
    }

    onModuleDestroy() {
        this.logger.log('🛑 Blockchain Service Stopping...');
        if (this.unwatch) this.unwatch();
    }

    private connect() {
        this.logger.log('🔌 Connecting to Insectarium Testnet...');

        this.client = createPublicClient({
            chain: INSECTARIUM_CHAIN,
            transport: webSocket(),
        });

        this.logger.log('✅ Connected via WebSocket!');

        this.startListening();
    }

    public getClient() {
        return this.client;
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

        const gameCreatedEvent = parseAbiItem(
            'event GameCreated(uint256 gameId, address indexed gameAddr, address indexed gameTokenAddr, address initiator, uint256 remainTime, uint256 endTime, uint256 cost, uint256 prizePool, bool isEnded, address lastCommentor)',
        );

        this.unwatch = this.client.watchContractEvent({
            address: factoryAddress as `0x${string}`,
            abi: [gameCreatedEvent],
            eventName: 'GameCreated',
            onLogs: (logs) => {
                logs.forEach((log) => {
                    const {
                        gameAddr,
                        gameTokenAddr,
                        endTime,
                        cost,
                        prizePool,
                    } = log.args;

                    this.logger.log(`🏭 New Game Created!`);
                    this.logger.log(` - Address: ${gameAddr}`);
                    this.logger.log(` - Token: ${gameTokenAddr}`);
                    this.logger.log(` - Cost: ${cost?.toString()}`);
                    this.logger.log(` - Prize Pool: ${prizePool?.toString()}`);
                    this.logger.log(` - End Time: ${endTime?.toString()}`);
                });
            },
        });
    }
}
