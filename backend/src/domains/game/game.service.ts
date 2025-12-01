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
    'event GameCreated(uint256 gameId, address indexed gameAddr, address indexed gameTokenAddr, string tokenSymbol, string tokenName, address initiator, uint256 gameTime, uint256 endTime, uint256 cost, uint256 prizePool, address lastCommentor, bool isClaimed)';

const PRIZE_CLAIMED_EVENT =
    'event PrizeClaimed(address indexed winner, uint256 winnerShare, uint256 platformShare, uint256 timestamp)';

@Injectable()
export class GameService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(GameService.name);
    private gameCreatedIface: ethers.Interface;
    private prizeClaimedIface: ethers.Interface;
    private isListening = false;

    constructor(
        private readonly configService: ConfigService,
        private readonly ethereumProvider: EthereumProvider,
        private readonly gameRepository: GameRepository,
    ) {
        this.gameCreatedIface = new ethers.Interface([GAME_CREATED_EVENT]);
        this.prizeClaimedIface = new ethers.Interface([PRIZE_CLAIMED_EVENT]);
    }

    onModuleInit() {
        this.startListening();
    }

    onModuleDestroy() {
        this.stopListening();
    }

    private async startListening() {
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
        const topic = this.gameCreatedIface.getEvent('GameCreated')?.topicHash;

        if (!topic) {
            this.logger.error('Failed to generate GameCreated event topic');
            return;
        }

        this.logger.log(`📋 Event topic hash: ${topic}`);

        // WebSocket 연결 상태 확인
        try {
            const network = await provider.getNetwork();
            this.logger.log(
                `🌐 Connected to network: ${network.name} (chainId: ${network.chainId})`,
            );

            const blockNumber = await provider.getBlockNumber();
            this.logger.log(`📦 Current block number: ${blockNumber}`);
        } catch (error) {
            this.logger.error(
                `❌ WebSocket connection check failed: ${error.message}`,
            );
        }

        const filter = {
            address: factoryAddress,
            topics: [topic],
        };

        this.logger.log(`🔍 Filter: ${JSON.stringify(filter)}`);

        provider.on(filter, (log) => {
            this.logger.log(
                `📨 Raw log received: ${JSON.stringify(log, (_, v) => (typeof v === 'bigint' ? v.toString() : v))}`,
            );
            this.handleGameCreatedLog(log);
        });

        this.logger.log(
            `✅ GameCreated event listener started (Factory: ${factoryAddress})`,
        );

        // PrizeClaimed 이벤트 리스너 (모든 CommentGame 컨트랙트에서 발생)
        const prizeClaimedTopic =
            this.prizeClaimedIface.getEvent('PrizeClaimed')?.topicHash;
        if (prizeClaimedTopic) {
            this.logger.log(`📋 PrizeClaimed topic hash: ${prizeClaimedTopic}`);

            const prizeClaimedFilter = {
                topics: [prizeClaimedTopic],
            };

            this.logger.log(
                `🔍 PrizeClaimed Filter: ${JSON.stringify(prizeClaimedFilter)}`,
            );

            provider.on(prizeClaimedFilter, (log) => {
                this.logger.log(
                    `🏆 PrizeClaimed log received: ${JSON.stringify(log, (_, v) => (typeof v === 'bigint' ? v.toString() : v))}`,
                );
                this.handlePrizeClaimedLog(log);
            });

            this.logger.log(`✅ PrizeClaimed event listener started`);
        }

        this.isListening = true;
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
            const decoded = this.gameCreatedIface.decodeEventLog(
                'GameCreated',
                log.data,
                log.topics,
            );

            // Convert ethers.Result to plain object and pass to repository
            const rawEvent = decoded.toObject();

            this.logger.log(
                `📥 GameCreated 이벤트 수신: ${JSON.stringify(rawEvent, (_, v) => (typeof v === 'bigint' ? v.toString() : v))}`,
            );

            const result = await this.gameRepository.createGames([rawEvent]);

            if (result.length === 0) {
                this.logger.warn(
                    '⚠️ 게임 저장 결과가 비어있음 - 검증 실패 또는 DB 오류',
                );
            }
        } catch (error) {
            this.logger.error(`Event processing failed: ${error.message}`);
        }
    }

    /**
     * PrizeClaimed 이벤트 처리
     * - 게임 주소(log.address)로 DB 업데이트
     * - isClaimed = true로 설정
     */
    private async handlePrizeClaimedLog(log: ethers.Log) {
        try {
            const decoded = this.prizeClaimedIface.decodeEventLog(
                'PrizeClaimed',
                log.data,
                log.topics,
            );

            const rawEvent = decoded.toObject();
            const gameAddress = log.address.toLowerCase();

            this.logger.log(
                `🏆 PrizeClaimed 이벤트 수신: gameAddress=${gameAddress}, winner=${rawEvent.winner}`,
            );

            // DB 업데이트: isClaimed = true
            await this.gameRepository.updateGameState(gameAddress, {
                isClaimed: true,
            });

            this.logger.log(`✅ 게임 상금 수령 완료 처리: ${gameAddress}`);
        } catch (error) {
            this.logger.error(
                `PrizeClaimed event processing failed: ${error.message}`,
            );
        }
    }
}
