import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EthereumProvider } from 'src/common/providers';
import { GameRepository } from './game.repository';
export declare class GameService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly ethereumProvider;
    private readonly gameRepository;
    private readonly logger;
    private iface;
    private isListening;
    constructor(configService: ConfigService, ethereumProvider: EthereumProvider, gameRepository: GameRepository);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private startListening;
    private stopListening;
    private handleGameCreatedLog;
}
