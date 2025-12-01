import { ConfigService } from '@nestjs/config';
import { ethers, JsonRpcProvider } from 'ethers';
export declare class EthereumProvider {
    private readonly configService;
    private readonly logger;
    private provider;
    constructor(configService: ConfigService);
    private connect;
    getProvider(): JsonRpcProvider;
    getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null>;
    getEventTopic(eventSignature: string): string;
    createInterface(abi: string[]): ethers.Interface;
}
