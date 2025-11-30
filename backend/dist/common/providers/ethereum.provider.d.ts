import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, WebSocketProvider } from 'ethers';
export declare class EthereumProvider implements OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private provider;
    constructor(configService: ConfigService);
    private connect;
    onModuleDestroy(): void;
    getProvider(): WebSocketProvider;
    getEventTopic(eventSignature: string): string;
    createInterface(abi: string[]): ethers.Interface;
}
