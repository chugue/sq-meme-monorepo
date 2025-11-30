/**
 * 컨트랙트 통신 훅
 * 
 * 시니어급 기준으로 설계:
 * - 타입 안정성
 * - 에러 처리
 * - 로딩 상태 관리
 * - 재사용성
 */

import { useCallback, useState } from 'react';
import type { Address } from 'viem';
import { ContractClient } from '../lib/contract/contractClient';
import type { ReadContractParams, WriteContractParams } from '../lib/contract/types';
import { logger } from '../lib/injected/logger';
import { ERROR_CODES } from '../lib/injectedApi';

/**
 * 컨트랙트 읽기 훅 반환 타입
 */
export interface UseContractReadReturn<T = unknown> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * 컨트랙트 쓰기 훅 반환 타입
 */
export interface UseContractWriteReturn {
    write: (params: WriteContractParams) => Promise<string>;
    isLoading: boolean;
    error: string | null;
    hash: string | null;
}

/**
 * 컨트랙트 읽기 훅
 */
export function useContractRead<T = unknown>(
    client: ContractClient | null,
    params: ReadContractParams | null
): UseContractReadReturn<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const execute = useCallback(async () => {
        if (!client || !params) {
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const result = await client.read<T>(params);
            setData(result.data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            logger.error('컨트랙트 읽기 실패', err);
        } finally {
            setIsLoading(false);
        }
    }, [client, params]);

    return {
        data,
        isLoading,
        error,
        refetch: execute,
    };
}

/**
 * 컨트랙트 쓰기 훅
 */
export function useContractWrite(
    client: ContractClient | null,
    from: Address | null
): UseContractWriteReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hash, setHash] = useState<string | null>(null);

    const write = useCallback(
        async (params: WriteContractParams): Promise<string> => {
            if (!client) {
                throw new Error('Contract client is not available');
            }

            if (!from) {
                throw new Error('Wallet address is not available');
            }

            try {
                setIsLoading(true);
                setError(null);
                setHash(null);

                const result = await client.write(params, from);
                setHash(result.hash);

                return result.hash;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                setError(errorMessage);
                logger.error('컨트랙트 쓰기 실패', err);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [client, from]
    );

    return {
        write,
        isLoading,
        error,
        hash,
    };
}

