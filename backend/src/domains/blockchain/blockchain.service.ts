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
import { GameRepository } from '../game/game.repository';
import { CommentRepository } from '../comment/comment.repository';

@Injectable()
export class BlockchainService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(BlockchainService.name);
    private client: PublicClient;
    private unwatchGameCreated: () => void;
    private unwatchCommentAdded: () => void;

    constructor(
        private readonly configService: ConfigService,
        private readonly gameRepository: GameRepository,
        private readonly commentRepository: CommentRepository,
    ) {}

    onModuleInit() {
        this.connect();
    }

    onModuleDestroy() {
        this.logger.log('🛑 Blockchain Service 종료 중...');
        if (this.unwatchGameCreated) this.unwatchGameCreated();
        if (this.unwatchCommentAdded) this.unwatchCommentAdded();
    }

    public getClient() {
        return this.client;
    }

    private connect() {
        this.logger.log('🔌 Insectarium Testnet 연결 중...');

        this.client = viem.createPublicClient({
            chain: INSECTARIUM_CHAIN,
            transport: viem.webSocket(),
        });

        this.logger.log('✅ WebSocket 연결 완료!');

        this.startListening();
    }

    private startListening() {
        this.logger.log('🎧 컨트랙트 이벤트 리스너 시작...');
        this.watchGameCreated();
        this.watchCommentAdded();
    }

    private watchGameCreated() {
        const factoryAddress = this.configService.get<string>(
            'GAME_FACTORY_ADDRESS',
        );

        if (!factoryAddress) {
            this.logger.error('🚨 GAME_FACTORY_ADDRESS가 .env에 없습니다');
            return;
        }

        const gameCreatedEvent = viem.parseAbiItem(
            'event GameCreated(uint256 gameId, address indexed gameAddr, address indexed gameTokenAddr, address initiator, uint256 remainTime, uint256 endTime, uint256 cost, uint256 prizePool, bool isEnded, address lastCommentor)',
        );

        this.unwatchGameCreated = this.client.watchContractEvent({
            address: factoryAddress as `0x${string}`,
            abi: [gameCreatedEvent],
            eventName: 'GameCreated',
            onLogs: async (logs: any[]) => {
                const rawEvents = logs.map((log) => log.args);

                if (rawEvents.length > 0) {
                    await this.gameRepository.createGames(rawEvents);
                }
            },
        });
    }

    private watchCommentAdded() {
        const commentAddedEvent = viem.parseAbiItem(
            'event CommentAdded(address indexed commentor, string message, uint256 newEndTime, uint256 prizePool, uint256 timestamp)',
        );

        this.unwatchCommentAdded = this.client.watchEvent({
            event: commentAddedEvent,
            onLogs: async (logs: any[]) => {
                const rawEvents = logs.map((log) => ({
                    ...log.args,
                    gameAddress: log.address, // 이벤트 발생 주소 = 게임 주소
                }));

                if (rawEvents.length > 0) {
                    await this.commentRepository.addComments(rawEvents);
                }
            },
        });
    }
}
