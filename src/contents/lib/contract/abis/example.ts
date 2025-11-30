/**
 * 예시 컨트랙트 ABI
 * 
 * 실제 사용 시 이 파일을 수정하거나 새로운 ABI 파일을 추가하세요.
 */

import type { Abi } from 'viem';

/**
 * 예시 컨트랙트 ABI
 * 
 * 실제 ABI로 교체하세요.
 */
export const exampleContractABI: Abi = [
    {
        type: 'function',
        name: 'getValue',
        inputs: [{ name: 'id', type: 'uint256' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'setValue',
        inputs: [
            { name: 'id', type: 'uint256' },
            { name: 'value', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
] as const;

/**
 * 컨트랙트 주소 (예시)
 */
export const EXAMPLE_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

