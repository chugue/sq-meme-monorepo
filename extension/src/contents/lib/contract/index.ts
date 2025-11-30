/**
 * 컨트랙트 통신 모듈
 * 
 * 사용 예시:
 * 
 * ```typescript
 * import { createContractClient, contractRegistry } from '@/contents/lib/contract';
 * import { myContractABI } from './abis/myContract';
 * 
 * // 컨트랙트 클라이언트 생성
 * const client = createContractClient({
 *   address: '0x...',
 *   abi: myContractABI,
 * });
 * 
 * // 읽기
 * const result = await client.read({
 *   functionName: 'getValue',
 *   args: [123],
 * });
 * 
 * // 쓰기
 * const tx = await client.write({
 *   functionName: 'setValue',
 *   args: [456],
 * }, '0x...');
 * ```
 */

export { ContractClient, createContractClient } from './contractClient';
export { contractRegistry } from './contractRegistry';
export type {
    ContractConfig,
    ReadContractParams,
    WriteContractParams,
    ReadContractResult,
    WriteContractResult,
} from './types';

