import { injected } from '@wagmi/core';
import { defineChain } from 'viem';
import { createConfig, http, type Config } from 'wagmi';

const MEMECORE_CHAIN_ID = 43522;
const MEMECORE_RPC_URL = 'https://rpc.insectarium.memecore.net'
const MEMECORE_EXPLORER_URL = 'https://insectarium.blockscout.memecore.com';

export const memeCoreChain = defineChain({
    id: MEMECORE_CHAIN_ID,
    name: 'MemeCore',
    network: 'Insectarium',
    nativeCurrency: {
        decimals: 18,
        name: 'Insectarium',
        symbol: 'M',
    },
    rpcUrls: {
        default: { http: [MEMECORE_RPC_URL] },
        public: { http: [MEMECORE_RPC_URL] },
    },
    blockExplorers: {
        default: { name: 'MemeScan', url: MEMECORE_EXPLORER_URL },
    },
});


let _config: Config | null = null;

export const getWagmiConfig = (): Config => {
    if (!_config) {
        _config = createConfig({
            chains: [memeCoreChain],
            connectors: [
                // window.ethereum이 있는 경우를 위한 fallback
                injected({
                    target: 'metaMask',
                }),
            ],
            multiInjectedProviderDiscovery: false,
            ssr: false,
            transports: {
                [memeCoreChain.id]: http(MEMECORE_RPC_URL),
            },
        });
    }
    return _config;
};
