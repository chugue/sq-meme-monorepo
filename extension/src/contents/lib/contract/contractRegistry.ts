/**
 * 컨트랙트 레지스트리
 * 
 * 모든 컨트랙트를 중앙에서 관리
 */

import type { Abi, Address } from 'viem';
import { createContractClient, ContractClient } from './contractClient';
import type { ContractConfig } from './types';

/**
 * 컨트랙트 레지스트리 클래스
 */
class ContractRegistry {
    private contracts = new Map<string, ContractClient>();

    /**
     * 컨트랙트 등록
     */
    register(name: string, config: ContractConfig): ContractClient {
        if (this.contracts.has(name)) {
            console.warn(`컨트랙트 ${name}이(가) 이미 등록되어 있습니다. 덮어씁니다.`);
        }

        const client = createContractClient(config);
        this.contracts.set(name, client);
        return client;
    }

    /**
     * 컨트랙트 가져오기
     */
    get(name: string): ContractClient | undefined {
        return this.contracts.get(name);
    }

    /**
     * 컨트랙트 존재 여부 확인
     */
    has(name: string): boolean {
        return this.contracts.has(name);
    }

    /**
     * 모든 컨트랙트 이름 목록
     */
    list(): string[] {
        return Array.from(this.contracts.keys());
    }

    /**
     * 컨트랙트 제거
     */
    remove(name: string): boolean {
        return this.contracts.delete(name);
    }

    /**
     * 모든 컨트랙트 제거
     */
    clear(): void {
        this.contracts.clear();
    }
}

// 싱글톤 인스턴스
export const contractRegistry = new ContractRegistry();

