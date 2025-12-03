/**
 * 지갑 연결 및 상태 관리 훅
 *
 * backgroundApi를 통해 지갑 상태를 관리하여
 * SidePanel과 Content Script 간 상태 동기화
 */

import { useCallback, useEffect, useState } from 'react';
import { backgroundApi } from '../lib/backgroundApi';
import { memeCoreChain } from '../config/wagmi';
import { getChainConfig } from '../lib/injected/chainConfig';
import { logger } from '../lib/injected/logger';
import {
    isAccountsChangedMessage,
    isChainChangedMessage,
} from '../lib/injected/messageValidator';
import { ERROR_CODES, injectedApi } from '../lib/injectedApi';

export interface WalletState {
    isConnected: boolean;
    address: string | null;
    chainId: string | null;
    isLoading: boolean;
    error: string | null;
    errorCode: string | null;
}

export interface UseWalletReturn extends WalletState {
    connect: () => Promise<void>;
    disconnect: () => void;
    refresh: () => Promise<void>;
    ensureNetwork: () => Promise<void>;
}

/**
 * 지갑 연결 및 상태 관리 훅
 * backgroundApi를 통해 SidePanel과 동일한 진실의 원천 사용
 */
export function useWallet(): UseWalletReturn {
    const [state, setState] = useState<WalletState>({
        isConnected: false,
        address: null,
        chainId: null,
        isLoading: true,
        error: null,
        errorCode: null,
    });

    /**
     * 상태 업데이트 헬퍼
     */
    const updateState = useCallback((updates: Partial<WalletState>) => {
        setState((prev) => ({ ...prev, ...updates }));
    }, []);

    /**
     * 에러 상태 설정
     */
    const setError = useCallback(
        (error: Error | unknown, code: string = 'UNKNOWN_ERROR') => {
            const message = error instanceof Error ? error.message : String(error);
            logger.error('지갑 오류', error);
            updateState({
                error: message,
                errorCode: code,
                isLoading: false,
            });
        },
        [updateState]
    );

    /**
     * 지갑 상태 조회 (backgroundApi 사용)
     */
    const fetchWalletState = useCallback(async () => {
        try {
            updateState({ isLoading: true, error: null, errorCode: null });

            const result = await backgroundApi.walletGetAccount();
            logger.debug('지갑 상태 조회 결과', result);

            updateState({
                isConnected: result.isConnected,
                address: result.address,
                isLoading: false,
                error: null,
                errorCode: null,
            });

            // chainId는 별도로 조회 (injectedApi 사용)
            if (result.isConnected) {
                try {
                    const chainId = await injectedApi.getChainId();
                    updateState({ chainId: chainId || null });
                } catch {
                    // chainId 조회 실패는 무시
                }
            }

            return result.isConnected;
        } catch (error) {
            logger.error('지갑 상태 조회 실패', error);
            updateState({
                isConnected: false,
                address: null,
                isLoading: false,
                error: null, // 초기 로드 에러는 표시하지 않음
                errorCode: null,
            });
            return false;
        }
    }, [updateState]);

    /**
     * 네트워크 전환 (필요시 체인 추가)
     * 실제 상호작용 전에 호출되어야 함
     */
    const switchToTargetNetwork = useCallback(async () => {
        try {
            const targetChainId = memeCoreChain.id;
            const currentChainId = await injectedApi.getChainId();
            const currentChainIdNumber = parseInt(currentChainId, 16);

            // 이미 올바른 네트워크면 전환 불필요
            if (currentChainIdNumber === targetChainId) {
                logger.debug('이미 올바른 네트워크에 연결됨', { chainId: targetChainId });
                return;
            }

            logger.info('네트워크 전환 시도', {
                current: currentChainIdNumber,
                target: targetChainId,
            });

            try {
                // 먼저 전환 시도
                await injectedApi.switchNetwork(targetChainId);
            } catch (switchError) {
                // 4902 에러면 체인 추가 필요
                if (
                    switchError instanceof Error &&
                    (switchError.message.includes('4902') ||
                        switchError.message.includes('Unrecognized chain') ||
                        switchError.message.includes('not added'))
                ) {
                    logger.info('체인 추가 후 전환', { chainId: targetChainId });
                    const chainConfig = getChainConfig();
                    await injectedApi.addAndSwitchNetwork(chainConfig);
                } else {
                    throw switchError;
                }
            }
        } catch (error) {
            logger.error('네트워크 전환 실패', error);
            throw error; // 상호작용 시에는 에러를 throw하여 사용자에게 알림
        }
    }, []);

    /**
     * 네트워크 확인 및 필요시 전환
     * 상호작용 전에 호출
     */
    const ensureNetwork = useCallback(async () => {
        await switchToTargetNetwork();
        // 전환 후 체인 ID 업데이트
        const chainId = await injectedApi.getChainId();
        updateState({ chainId: chainId || null });
    }, [switchToTargetNetwork, updateState]);

    /**
     * 지갑 연결 (backgroundApi 사용)
     */
    const connect = useCallback(async () => {
        try {
            updateState({ isLoading: true, error: null, errorCode: null });

            const result = await backgroundApi.walletConnect();
            logger.info('지갑 연결 성공', result);

            // 연결 후 chainId 조회
            let chainId: string | null = null;
            try {
                chainId = await injectedApi.getChainId();
            } catch {
                // chainId 조회 실패는 무시
            }

            updateState({
                isConnected: true,
                address: result.address,
                chainId,
                isLoading: false,
                error: null,
                errorCode: null,
            });
        } catch (error) {
            const errorCode =
                error instanceof Error && 'code' in error
                    ? String(error.code)
                    : ERROR_CODES.UNKNOWN_ERROR;
            setError(error, errorCode);
        }
    }, [updateState, setError]);

    /**
     * 지갑 연결 해제
     */
    const disconnect = useCallback(() => {
        updateState({
            isConnected: false,
            address: null,
            chainId: null,
            isLoading: false,
            error: null,
            errorCode: null,
        });
    }, [updateState]);

    /**
     * 지갑 상태 새로고침 (backgroundApi 사용)
     */
    const refresh = useCallback(async () => {
        await fetchWalletState();
    }, [fetchWalletState]);

    /**
     * MetaMask 이벤트 리스너 설정
     * accountsChanged, chainChanged 이벤트 수신
     */
    useEffect(() => {
        const handleAccountsChanged = (accounts: string[]) => {
            logger.info('계정 변경 감지', { accounts });

            if (accounts.length === 0) {
                // 연결 해제
                logger.info('지갑 연결 해제 감지');
                disconnect();
            } else {
                // 계정 변경 (다른 계정으로 전환)
                updateState({
                    isConnected: true,
                    address: accounts[0] || null,
                    error: null,
                    errorCode: null,
                });
            }
        };

        const handleChainChanged = async (chainId: string) => {
            logger.info('체인 변경 감지', { chainId });

            // 체인 ID만 업데이트 (자동 전환하지 않음)
            updateState({
                chainId: chainId || null,
            });
        };

        const messageListener = (event: MessageEvent) => {
            // 계정 변경 메시지
            if (isAccountsChangedMessage(event)) {
                handleAccountsChanged(event.data.accounts);
            }

            // 체인 변경 메시지
            if (isChainChangedMessage(event)) {
                handleChainChanged(event.data.chainId);
            }
        };

        window.addEventListener('message', messageListener);

        return () => {
            window.removeEventListener('message', messageListener);
        };
    }, [disconnect, updateState]);

    // 초기화: backgroundApi를 통해 현재 지갑 상태 조회
    useEffect(() => {
        fetchWalletState();
    }, [fetchWalletState]);

    return {
        ...state,
        connect,
        disconnect,
        refresh,
        ensureNetwork,
    };
}
