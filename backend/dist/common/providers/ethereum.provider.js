"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EthereumProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ethers_1 = require("ethers");
const INSECTARIUM_NETWORK = ethers_1.Network.from({
    chainId: 43522,
    name: 'insectarium',
});
const DEFAULT_RPC_URL = 'https://rpc.insectarium.memecore.net';
let EthereumProvider = EthereumProvider_1 = class EthereumProvider {
    configService;
    logger = new common_1.Logger(EthereumProvider_1.name);
    provider;
    constructor(configService) {
        this.configService = configService;
        this.connect();
    }
    connect() {
        const rpcUrl = this.configService.get('ETHEREUM_RPC_URL') ||
            DEFAULT_RPC_URL;
        this.logger.log(`🔌 Ethereum HTTP RPC 연결 중... (${rpcUrl})`);
        this.provider = new ethers_1.JsonRpcProvider(rpcUrl, INSECTARIUM_NETWORK, {
            staticNetwork: INSECTARIUM_NETWORK,
        });
        this.logger.log('✅ JsonRpc Provider 생성 완료!');
    }
    getProvider() {
        return this.provider;
    }
    async getTransactionReceipt(txHash) {
        return this.provider.getTransactionReceipt(txHash);
    }
    getEventTopic(eventSignature) {
        return ethers_1.ethers.id(eventSignature);
    }
    createInterface(abi) {
        return new ethers_1.ethers.Interface(abi);
    }
};
exports.EthereumProvider = EthereumProvider;
exports.EthereumProvider = EthereumProvider = EthereumProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EthereumProvider);
//# sourceMappingURL=ethereum.provider.js.map