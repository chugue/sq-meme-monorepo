import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonRpcProvider, Network } from 'ethers';

// Insectarium Testnet 설정
const INSECTARIUM_NETWORK = Network.from({
    chainId: 43522,
    name: 'insectarium',
});

const DEFAULT_RPC_URL = 'https://rpc.insectarium.memecore.net';

@Injectable()
export class EthereumProvider {
    private readonly logger = new Logger(EthereumProvider.name);
    private provider: JsonRpcProvider;

    constructor(private readonly configService: ConfigService) {
        this.connect();
    }

    private connect() {
        const rpcUrl =
            this.configService.get<string>('ETHEREUM_RPC_URL') ||
            DEFAULT_RPC_URL;

        this.logger.log(`🔌 Ethereum HTTP RPC 연결 중... (${rpcUrl})`);

        this.provider = new JsonRpcProvider(rpcUrl, INSECTARIUM_NETWORK, {
            staticNetwork: INSECTARIUM_NETWORK,
        });

        this.logger.log('✅ JsonRpc Provider 생성 완료!');
    }

    /**
     * @description 트랜잭션 영수증 조회
     */
    async getTransactionReceipt(txHash: string) {
        return this.provider.getTransactionReceipt(txHash);
    }
}
