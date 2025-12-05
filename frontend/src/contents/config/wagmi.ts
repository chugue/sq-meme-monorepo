import { injected } from '@wagmi/core';
import { defineChain } from 'viem';
import { createConfig, http, type Config } from 'wagmi';

const MEMECORE_CHAIN_ID = 43521;
const MEMECORE_RPC_URL = 'https://rpc.formicarium.memecore.net'
// const MEMECORE_EXPLORER_URL = 'https://formicarium.blockscout.memecore.com';
const MEMECORE_EXPLORER_URL = 'https://formicarium.memecorescan.io';

// 블록 탐색기 URL (외부에서 사용)
export const EXPLORER_URL = MEMECORE_EXPLORER_URL;

export const memeCoreChain = defineChain({
    id: MEMECORE_CHAIN_ID,
    name: 'MemeCore',
    network: 'Formicarium',
    nativeCurrency: {
        decimals: 18,
        name: 'Formicarium',
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
