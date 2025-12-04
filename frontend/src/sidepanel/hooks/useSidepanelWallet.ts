/**
 * Sidepanel 전용 지갑 연결 훅
 *
 * Chrome Extension sidepanel에서는 window.ethereum에 직접 접근할 수 없으므로
 * background script를 통해 content script로 메시지를 전달하여 지갑에 연결합니다.
 *
 * 흐름: sidepanel -> background -> content script -> injected script -> MetaMask
 */

import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';
import { backgroundApi } from '../../contents/lib/backgroundApi';
import {
    sessionAtom,
    setErrorAtom,
    setLoadingAtom,
    setWalletConnectedAtom,
} from '../atoms/sessionAtoms';

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
    const session = useAtomValue(sessionAtom);
    const setWalletConnected = useSetAtom(setWalletConnectedAtom);
    const setLoading = useSetAtom(setLoadingAtom);
    const setError = useSetAtom(setErrorAtom);

    const { isWalletConnected: isConnected, walletAddress: address, isLoading, error } = session;

    // 초기 상태 확인 중복 방지
    const initialCheckDone = useRef(false);
    // 지갑 상태 확인 중복 방지
    const checkAccountInProgress = useRef(false);

    // 지갑 상태 확인 함수
    const checkAccount = useCallback(async () => {
        // 중복 요청 방지
        if (checkAccountInProgress.current) {
            console.log('🔐 [SidePanel] checkAccount 진행 중, 스킵');
            return false;
        }

        checkAccountInProgress.current = true;

        try {
            const result = await backgroundApi.walletGetAccount();
            console.log('🔐 [SidePanel] checkAccount 결과:', result);
            setWalletConnected({ isConnected: result.isConnected, address: result.address });
            setLoading(false);
            setError(null);
            return result.isConnected;
        } catch (err) {
            console.error('Failed to get wallet account:', err);
            setWalletConnected({ isConnected: false, address: null });
            setLoading(false);
            setError(null); // 초기 로드 에러는 표시하지 않음
            return false;
        } finally {
            checkAccountInProgress.current = false;
        }
    }, [setWalletConnected, setLoading, setError]);

    // 초기 상태 확인 (마운트 시 한 번만)
    useEffect(() => {
        if (initialCheckDone.current) {
            return;
        }
        initialCheckDone.current = true;
        checkAccount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleConnect = useCallback(async () => {
        console.log('🔐 [SidePanel] handleConnect 시작');
        setLoading(true);
        setError(null);

        try {
            console.log('🔐 [SidePanel] backgroundApi.walletConnect() 호출');
            const result = await backgroundApi.walletConnect();
            console.log('🔐 [SidePanel] walletConnect 결과:', result);

            setWalletConnected({ isConnected: true, address: result.address });
            setLoading(false);
            setError(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
            console.error('❌ [SidePanel] Wallet connection error:', err);
            setLoading(false);
            setError(errorMessage);
            throw err; // 호출자가 에러를 처리할 수 있도록 다시 throw
        }
    }, [setWalletConnected, setLoading, setError]);

    const handleDisconnect = useCallback(() => {
        setWalletConnected({ isConnected: false, address: null });
        setLoading(false);
        setError(null);
    }, [setWalletConnected, setLoading, setError]);

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
