/**
 * 체인 설정 및 네트워크 전환 유틸리티
 */

import { memeCoreChain } from '../../config/wagmi';

/**
 * 체인 정보를 MetaMask 형식으로 변환
 */
export function getChainConfig() {
    return {
        chainId: `0x${memeCoreChain.id.toString(16)}`, // hex 형식
        chainName: memeCoreChain.name,
        nativeCurrency: {
            name: memeCoreChain.nativeCurrency.name,
            symbol: memeCoreChain.nativeCurrency.symbol,
            decimals: memeCoreChain.nativeCurrency.decimals,
        },
        rpcUrls: [...memeCoreChain.rpcUrls.default.http], // readonly 배열을 일반 배열로 변환
        blockExplorerUrls: memeCoreChain.blockExplorers?.default
            ? [memeCoreChain.blockExplorers.default.url]
            : undefined,
    };
}

/**
 * 체인 ID를 hex 문자열로 변환
 */
export function chainIdToHex(chainId: number): string {
    return `0x${chainId.toString(16)}`;
}

/**
 * hex 문자열을 체인 ID로 변환
 */
export function hexToChainId(hex: string): number {
    return parseInt(hex, 16);
}

