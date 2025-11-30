/**
 * 컨트랙트 관련 타입 정의
 */

import type { Abi, Address } from 'viem';

/**
 * 컨트랙트 설정
 */
export interface ContractConfig {
    address: Address;
    abi: Abi;
    chainId?: number;
}

/**
 * 컨트랙트 읽기 함수 파라미터
 */
export interface ReadContractParams {
    functionName: string;
    args?: unknown[];
}

/**
 * 컨트랙트 쓰기 함수 파라미터
 */
export interface WriteContractParams {
    functionName: string;
    args?: unknown[];
    value?: bigint;
    gas?: bigint;
    gasPrice?: bigint;
}

/**
 * 컨트랙트 읽기 결과
 */
export interface ReadContractResult<T = unknown> {
    data: T;
    status: 'success';
}

/**
 * 컨트랙트 쓰기 결과
 */
export interface WriteContractResult {
    hash: string;
    status: 'pending' | 'success' | 'reverted';
}

