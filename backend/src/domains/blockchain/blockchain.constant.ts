import { defineChain } from 'viem';

export const INSECTARIUM_CHAIN = defineChain({
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
