import { useCallback, useEffect, useState } from "react";
import { useSidepanelWallet } from "./useSidepanelWallet";

export interface MyAsset {
    tokenAddress: string;
    tokenSymbol: string;
    balance: string;
    tokenImage: string;
}

export interface MyAssetsRespDto {
    memex: MyAsset;
    myToken: MyAsset;
    otherTokens: MyAsset[];
}

export function useUserAssets() {
    const { address: memexWalletAddress } = useSidepanelWallet();
    const [isLoading, setIsLoading] = useState(true);
    const [userAssets, setUserAssets] = useState<MyAssetsRespDto | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchUserAssets = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            if (!memexWalletAddress) {
                setUserAssets(null);
                // 최소 0.5초 로딩 시간 보장
                await Promise.all([
                    new Promise(resolve => setTimeout(resolve, 500)),
                ]);
                setIsLoading(false);
                return;
            }

            // API 호출과 최소 로딩 시간을 동시에 실행
            const [response] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/v1/users/my-assets`, {
                    headers: {
                        "x-wallet-address": memexWalletAddress,
                    },
                    method: "GET",
                }),
                new Promise(resolve => setTimeout(resolve, 500)), // 최소 0.5초 대기
            ]);

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error);
            }
            setUserAssets(data.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "토큰 목록 조회 실패");
            setUserAssets(null);
        } finally {
            setIsLoading(false);
        }
    }, [memexWalletAddress]);

    useEffect(() => {
        fetchUserAssets();
    }, [fetchUserAssets]);

    return {
        userAssets,
        isLoading,
        error,
        refetch: fetchUserAssets,
    };
}