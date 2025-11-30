/**
 * 컨트랙트 클라이언트
 * 
 * 시니어급 기준으로 설계:
 * - 타입 안정성
 * - 확장 가능한 구조
 * - 에러 처리
 * - 재사용성
 */

import type { Abi, Address } from 'viem';
import { encodeFunctionData, decodeFunctionResult, getAddress } from 'viem';
import type {
    ContractConfig,
    ReadContractParams,
    WriteContractParams,
    ReadContractResult,
    WriteContractResult,
} from './types';
import { injectedApi } from '../injectedApi';
import { logger } from '../injected/logger';

/**
 * 컨트랙트 클라이언트 클래스
 */
export class ContractClient {
    private readonly address: Address;
    private readonly abi: Abi;
    private readonly chainId?: number;

    constructor(config: ContractConfig) {
        this.address = getAddress(config.address); // 주소 검증 및 정규화
        this.abi = config.abi;
        this.chainId = config.chainId;
    }

    /**
     * 컨트랙트 읽기 (view/pure 함수)
     */
    async read<T = unknown>(params: ReadContractParams): Promise<ReadContractResult<T>> {
        try {
            logger.debug('컨트랙트 읽기 요청', {
                address: this.address,
                functionName: params.functionName,
                args: params.args,
            });

            // 함수 데이터 인코딩
            const data = encodeFunctionData({
                abi: this.abi,
                functionName: params.functionName,
                args: params.args || [],
            });

            // eth_call 실행
            const result = await injectedApi.sendEthereumRequest<string>('eth_call', [
                {
                    to: this.address,
                    data: data,
                },
                'latest',
            ]);

            // 결과 디코딩
            const decoded = decodeFunctionResult({
                abi: this.abi,
                functionName: params.functionName,
                data: result as `0x${string}`,
            });

            logger.debug('컨트랙트 읽기 완료', {
                address: this.address,
                functionName: params.functionName,
                result: decoded,
            });

            return {
                data: decoded as T,
                status: 'success',
            };
        } catch (error) {
            logger.error('컨트랙트 읽기 실패', error, {
                address: this.address,
                functionName: params.functionName,
            });
            throw error;
        }
    }

    /**
     * 컨트랙트 쓰기 (상태 변경 함수)
     */
    async write(
        params: WriteContractParams,
        from: Address
    ): Promise<WriteContractResult> {
        try {
            logger.debug('컨트랙트 쓰기 요청', {
                address: this.address,
                functionName: params.functionName,
                args: params.args,
                from,
            });

            // 함수 데이터 인코딩
            const data = encodeFunctionData({
                abi: this.abi,
                functionName: params.functionName,
                args: params.args || [],
            });

            // 트랜잭션 전송
            const hash = await injectedApi.sendTransaction({
                from: from,
                to: this.address,
                data: data,
                value: params.value ? `0x${params.value.toString(16)}` : undefined,
                gas: params.gas ? `0x${params.gas.toString(16)}` : undefined,
                gasPrice: params.gasPrice ? `0x${params.gasPrice.toString(16)}` : undefined,
            });

            logger.info('컨트랙트 쓰기 완료', {
                address: this.address,
                functionName: params.functionName,
                hash,
            });

            return {
                hash,
                status: 'pending',
            };
        } catch (error) {
            logger.error('컨트랙트 쓰기 실패', error, {
                address: this.address,
                functionName: params.functionName,
            });
            throw error;
        }
    }

    /**
     * 컨트랙트 주소 반환
     */
    getAddress(): Address {
        return this.address;
    }

    /**
     * ABI 반환
     */
    getAbi(): Abi {
        return this.abi;
    }
}

/**
 * 컨트랙트 클라이언트 생성 헬퍼
 */
export function createContractClient(config: ContractConfig): ContractClient {
    return new ContractClient(config);
}

