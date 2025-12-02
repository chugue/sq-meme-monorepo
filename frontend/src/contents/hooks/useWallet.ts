/**
 * 지갑 연결 및 상태 관리 훅
 *
 * 시니어급 기준으로 개선:
 * - 상태 관리 개선
 * - 에러 처리 강화
 * - 이벤트 리스너 정리
 * - 타입 안정성
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { memeCoreChain } from '../config/wagmi';
import { getChainConfig } from '../lib/injected/chainConfig';
import { logger } from '../lib/injected/logger';
import {
    isAccountsChangedMessage,
    isChainChangedMessage,
} from '../lib/injected/messageValidator';
import { ERROR_CODES, injectedApi, waitForInjectedScript } from '../lib/injectedApi';

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

// 모듈 레벨 초기화 플래그 (여러 컴포넌트에서 중복 초기화 방지)
let isGlobalInitialized = false;
let globalInitPromise: Promise<{ accounts: string[]; chainId: string } | null> | null = null;

/**
 * 지갑 연결 및 상태 관리 훅
 */
export function useWallet(): UseWalletReturn {
    const [state, setState] = useState<WalletState>({
        isConnected: false,
        address: null,
        chainId: null,
        isLoading: !isGlobalInitialized, // 이미 초기화됐으면 로딩 false
        error: null,
        errorCode: null,
    });

    const abortControllerRef = useRef<AbortController | null>(null);

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
     * 지갑 상태 초기화 (모듈 레벨에서 중복 방지)
     */
    const initializeWallet = useCallback(async () => {
        // 이미 초기화 중이면 기존 Promise 재사용
        if (globalInitPromise) {
            try {
                const result = await globalInitPromise;
                if (result) {
                    updateState({
                        isConnected: result.accounts.length > 0,
                        address: result.accounts[0] || null,
                        chainId: result.chainId || null,
                        isLoading: false,
                        error: null,
                        errorCode: null,
                    });
                }
            } catch {
                // 에러는 첫 번째 호출에서 처리됨
            }
            return;
        }

        // 이미 초기화됐으면 스킵
        if (isGlobalInitialized) {
            return;
        }

        // 초기화 Promise 생성 및 저장
        globalInitPromise = (async () => {
            try {
                updateState({ isLoading: true, error: null, errorCode: null });

                // Injected script 준비 대기
                const isReady = await waitForInjectedScript(3000);
                if (!isReady) {
                    throw new Error('Injected script가 준비되지 않았습니다');
                }

                // 현재 연결 상태 확인
                const [accounts, chainId] = await Promise.all([
                    injectedApi.getAccounts(),
                    injectedApi.getChainId(),
                ]);

                isGlobalInitialized = true;
                return { accounts, chainId };
            } catch (error) {
                globalInitPromise = null; // 실패 시 재시도 가능하도록
                throw error;
            }
        })();

        try {
            const result = await globalInitPromise;
            if (result) {
                updateState({
                    isConnected: result.accounts.length > 0,
                    address: result.accounts[0] || null,
                    chainId: result.chainId || null,
                    isLoading: false,
                    error: null,
                    errorCode: null,
                });
            }
        } catch (error) {
            setError(error, error instanceof Error && 'code' in error ? String(error.code) : ERROR_CODES.UNKNOWN_ERROR);
        }
    }, [updateState, setError]);

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
     * 지갑 연결
     */
    const connect = useCallback(async () => {
        try {
            updateState({ isLoading: true, error: null, errorCode: null });

            // 계정 연결
            const accounts = await injectedApi.requestAccounts();

            // 최종 체인 ID 확인
            const chainId = await injectedApi.getChainId();

            updateState({
                isConnected: accounts.length > 0,
                address: accounts[0] || null,
                chainId: chainId || null,
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
     * 지갑 상태 새로고침
     */
    const refresh = useCallback(async () => {
        try {
            updateState({ isLoading: true, error: null, errorCode: null });

            const [accounts, chainId] = await Promise.all([
                injectedApi.getAccounts(),
                injectedApi.getChainId(),
            ]);

            updateState({
                isConnected: accounts.length > 0,
                address: accounts[0] || null,
                chainId: chainId || null,
                isLoading: false,
                error: null,
                errorCode: null,
            });
        } catch (error) {
            setError(error, error instanceof Error && 'code' in error ? String(error.code) : ERROR_CODES.UNKNOWN_ERROR);
        }
    }, [updateState, setError]);

    /**
     * MetaMask 이벤트 리스너 설정
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
    }, [disconnect, updateState, switchToTargetNetwork]);

    // 초기화
    useEffect(() => {
        initializeWallet();

        // Cleanup
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [initializeWallet]);

    return {
        ...state,
        connect,
        disconnect,
        refresh,
        ensureNetwork,
    };
}
