/**
 * Sidepanel 전용 지갑 연결 훅
 *
 * Chrome Extension sidepanel에서는 window.ethereum에 직접 접근할 수 없으므로
 * background script를 통해 content script로 메시지를 전달하여 지갑에 연결합니다.
 *
 * 흐름: sidepanel -> background -> content script -> injected script -> MetaMask
 */

import { useAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import { backgroundApi } from '../../contents/lib/backgroundApi';
import {
    isWalletConnectedAtom,
    isWalletLoadingAtom,
    walletAddressAtom,
    walletErrorAtom,
} from '../atoms/walletAtoms';

export interface SidepanelWalletState {
    isConnected: boolean;
    address: string | null;
    isLoading: boolean;
    error: string | null;
}

export interface UseSidepanelWalletReturn extends SidepanelWalletState {
    connect: () => Promise<void>;
    disconnect: () => void;
    refetch: () => Promise<boolean>;
}

export function useSidepanelWallet(): UseSidepanelWalletReturn {
    const [isConnected, setIsConnected] = useAtom(isWalletConnectedAtom);
    const [address, setAddress] = useAtom(walletAddressAtom);
    const [isLoading, setIsLoading] = useAtom(isWalletLoadingAtom);
    const [error, setError] = useAtom(walletErrorAtom);

    // 지갑 상태 확인 함수
    const checkAccount = useCallback(async () => {
        try {
            const result = await backgroundApi.walletGetAccount();
            console.log('🔐 [SidePanel] checkAccount 결과:', result);
            setIsConnected(result.isConnected);
            setAddress(result.address);
            setIsLoading(false);
            setError(null);
            return result.isConnected;
        } catch (err) {
            console.error('Failed to get wallet account:', err);
            setIsConnected(false);
            setAddress(null);
            setIsLoading(false);
            setError(null); // 초기 로드 에러는 표시하지 않음
            return false;
        }
    }, [setIsConnected, setAddress, setIsLoading, setError]);

    // 초기 상태 확인
    useEffect(() => {
        checkAccount();
    }, [checkAccount]);

    const handleConnect = useCallback(async () => {
        console.log('🔐 [SidePanel] handleConnect 시작');
        setIsLoading(true);
        setError(null);

        try {
            console.log('🔐 [SidePanel] backgroundApi.walletConnect() 호출');
            const result = await backgroundApi.walletConnect();
            console.log('🔐 [SidePanel] walletConnect 결과:', result);

            setIsConnected(true);
            setAddress(result.address);
            setIsLoading(false);
            setError(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
            console.error('❌ [SidePanel] Wallet connection error:', err);
            setIsLoading(false);
            setError(errorMessage);
        }
    }, [setIsConnected, setAddress, setIsLoading, setError]);

    const handleDisconnect = useCallback(() => {
        setIsConnected(false);
        setAddress(null);
        setIsLoading(false);
        setError(null);
    }, [setIsConnected, setAddress, setIsLoading, setError]);

    return {
        isConnected,
        address,
        isLoading,
        error,
        connect: handleConnect,
        disconnect: handleDisconnect,
        refetch: checkAccount,
    };
}
