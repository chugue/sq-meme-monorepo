"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSECTARIUM_CHAIN = void 0;
const viem_1 = require("viem");
exports.INSECTARIUM_CHAIN = (0, viem_1.defineChain)({
    id: 43522,
    name: 'Insectarium Testnet',
    network: 'insectarium',
    nativeCurrency: {
        decimals: 18,
        name: 'Meme',
        symbol: 'M',
    },
    rpcUrls: {
        default: {
            http: ['https://rpc.insectarium.memceore.net'],
            webSocket: ['wss://ws.insectarium.memecore.net'],
        },
        public: {
            http: ['https://rpc.insectarium.memecore.net'],
            webSocket: ['wss://ws.insectarium.memecore.net'],
        },
    },
    testnet: true,
});
//# sourceMappingURL=blockchain.constant.js.map