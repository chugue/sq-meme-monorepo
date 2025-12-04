/**
 * MEMEX 지갑의 토큰 목록 조회 훅
 *
 * Blockscout API를 사용하여 memexWalletAddress의 보유 토큰 목록을 조회합니다.
 */

import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { sessionAtom } from "../atoms/sessionAtoms";

// Blockscout API 설정
const BLOCKSCOUT_API_URL = "https://insectarium.blockscout.memecore.com/api";

// 토큰 정보 타입
export interface TokenAsset {
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  balanceFormatted: string;
  type: "ERC-20" | "ERC-721" | "ERC-1155";
}

// 네이티브 코인 정보 타입
export interface NativeAsset {
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  balanceFormatted: string;
}

export interface WalletAssets {
  native: NativeAsset | null;
  tokens: TokenAsset[];
}

interface UseWalletAssetsReturn {
  assets: WalletAssets;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Blockscout API 응답 타입
interface BlockscoutTokenItem {
  balance: string;
  contractAddress: string;
  decimals: string;
  name: string;
  symbol: string;
  type: string;
}

interface BlockscoutTokenListResponse {
  status: string;
  message: string;
  result: BlockscoutTokenItem[];
}

interface BlockscoutBalanceResponse {
  status: string;
  message: string;
  result: string;
}

/**
 * 잔액 포맷팅 (decimals 적용)
 */
function formatBalance(balance: string, decimals: number): string {
  if (!balance || balance === "0") return "0";

  try {
    const balanceBigInt = BigInt(balance);
    if (balanceBigInt === 0n) return "0";

    const divisor = 10n ** BigInt(decimals);
    const integerPart = balanceBigInt / divisor;
    const fractionalPart = balanceBigInt % divisor;

    if (fractionalPart === 0n) {
      return integerPart.toLocaleString();
    }

    // 소수점 이하 최대 4자리까지 표시
    const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
    const trimmedFractional = fractionalStr.slice(0, 4).replace(/0+$/, "");

    if (trimmedFractional === "") {
      return integerPart.toLocaleString();
    }

    return `${integerPart.toLocaleString()}.${trimmedFractional}`;
  } catch {
    return "0";
  }
}

export function useWalletAssets(): UseWalletAssetsReturn {
  const session = useAtomValue(sessionAtom);
  const { memexWalletAddress } = session;

  const [assets, setAssets] = useState<WalletAssets>({
    native: null,
    tokens: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!memexWalletAddress) {
      setAssets({ native: null, tokens: [] });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 네이티브 코인 잔액과 토큰 목록을 병렬로 조회
      const [nativeResponse, tokensResponse] = await Promise.all([
        fetch(
          `${BLOCKSCOUT_API_URL}?module=account&action=balance&address=${memexWalletAddress}`
        ),
        fetch(
          `${BLOCKSCOUT_API_URL}?module=account&action=tokenlist&address=${memexWalletAddress}`
        ),
      ]);

      // 네이티브 코인 잔액 파싱
      let native: NativeAsset | null = null;
      if (nativeResponse.ok) {
        const nativeData: BlockscoutBalanceResponse =
          await nativeResponse.json();
        if (nativeData.status === "1" && nativeData.result) {
          native = {
            symbol: "M",
            name: "Insectarium",
            decimals: 18,
            balance: nativeData.result,
            balanceFormatted: formatBalance(nativeData.result, 18),
          };
        }
      }

      // 토큰 목록 파싱
      let tokens: TokenAsset[] = [];
      if (tokensResponse.ok) {
        const tokensData: BlockscoutTokenListResponse =
          await tokensResponse.json();
        if (tokensData.status === "1" && Array.isArray(tokensData.result)) {
          tokens = tokensData.result
            .filter((item) => item.type === "ERC-20")
            .map((item) => {
              const decimals = parseInt(item.decimals, 10) || 18;
              return {
                contractAddress: item.contractAddress,
                symbol: item.symbol,
                name: item.name,
                decimals,
                balance: item.balance,
                balanceFormatted: formatBalance(item.balance, decimals),
                type: "ERC-20" as const,
              };
            });
        }
      }

      setAssets({ native, tokens });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "토큰 목록 조회 실패";
      console.error("❌ [useWalletAssets] 조회 실패:", err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [memexWalletAddress]);

  // memexWalletAddress가 변경되면 자동으로 조회
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return {
    assets,
    isLoading,
    error,
    refetch: fetchAssets,
  };
}
