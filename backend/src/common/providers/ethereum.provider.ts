import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, WebSocketProvider, Network } from 'ethers';

// Insectarium Testnet 설정
const INSECTARIUM_NETWORK = Network.from({
    chainId: 43522,
    name: 'insectarium',
});

@Injectable()
export class EthereumProvider implements OnModuleDestroy {
    private readonly logger = new Logger(EthereumProvider.name);
    private provider: WebSocketProvider;

    constructor(private readonly configService: ConfigService) {
        this.connect();
    }

    private connect() {
        const wsUrl =
            this.configService.get<string>('ETHEREUM_WS_URL') ||
            'wss://ws.insectarium.memecore.net';

        this.logger.log(`🔌 Ethereum WebSocket 연결 중... (${wsUrl})`);

        this.provider = new WebSocketProvider(wsUrl, INSECTARIUM_NETWORK);

        // ethers v6에서는 provider 레벨에서 이벤트 처리
        this.provider.on('error', (error: Error) => {
            this.logger.error(`❌ Provider 에러: ${error.message}`);
        });

        this.logger.log('✅ WebSocket Provider 생성 완료!');
    }

    onModuleDestroy() {
        this.logger.log('🛑 Ethereum Provider 종료 중...');
        if (this.provider) {
            this.provider.destroy();
        }
    }

    /**
     * @description WebSocketProvider 인스턴스 반환
     */
    getProvider(): WebSocketProvider {
        return this.provider;
    }

    /**
     * @description 이벤트 토픽 해시 생성 헬퍼
     */
    getEventTopic(eventSignature: string): string {
        return ethers.id(eventSignature);
    }

    /**
     * @description Interface 생성 헬퍼
     */
    createInterface(abi: string[]): ethers.Interface {
        return new ethers.Interface(abi);
    }
}
