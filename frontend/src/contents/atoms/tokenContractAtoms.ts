import { atom } from 'jotai';

export interface TokenContractInfo {
    id: string;
    contractAddress: string;
    username: string;
    userTag: string;
    symbol: string | null;
    timestamp: number;
}

// 현재 프로필의 토큰 컨트랙트 정보
export const tokenContractAtom = atom<TokenContractInfo | null>(null);

// 토큰 컨트랙트 로딩 상태
export const isTokenContractLoadingAtom = atom<boolean>(false);

// 토큰 컨트랙트 에러
export const tokenContractErrorAtom = atom<string | null>(null);

