/**
 * 게임 없음 섹션 컴포넌트
 *
 * - 토큰은 있지만 게임이 없는 경우 표시
 * - 게임 생성 버튼 제공 (휘황찬란한 UI)
 */

import { useAtomValue } from 'jotai';
import { useCallback, useState } from 'react';
import type { Address } from 'viem';
import { tokenContractAtom } from '../atoms/tokenContractAtoms';
import { useWallet } from '../hooks/useWallet';
import { useGameFactory } from '../hooks/useGameFactory';
import { logger } from '../lib/injected/logger';
import { ERROR_CODES } from '../lib/injectedApi';
import { formatAddress } from '../utils/messageFormatter';
import './CommentSection.css';

interface NoGameSectionProps {
    onGameCreated?: (gameAddress: string) => void;
}

/**
 * 게임 없음 섹션 (게임 생성 CTA)
 */
export function NoGameSection({ onGameCreated }: NoGameSectionProps) {
    const tokenContract = useAtomValue(tokenContractAtom);
    const {
        isConnected,
        address,
        connect,
        ensureNetwork,
        isLoading: walletLoading,
        error: walletError,
    } = useWallet();

    const { createGame, isCreating } = useGameFactory();

    const [txHash, setTxHash] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);

    /**
     * 게임 생성 핸들러
     */
    const handleCreateGame = useCallback(async () => {
        if (!tokenContract?.contractAddress) {
            setCreateError('토큰 주소를 찾을 수 없습니다.');
            return;
        }

        // 지갑 연결 확인
        if (!isConnected || !address) {
            try {
                await connect();
            } catch (error) {
                logger.error('지갑 연결 실패', error);
                return;
            }
            return;
        }

        setCreateError(null);
        setTxHash(null);

        try {
            // 네트워크 확인 및 전환
            await ensureNetwork();

            logger.info('게임 생성 시작', {
                tokenAddress: tokenContract.contractAddress,
                creator: address,
            });

            // GameFactory.createGame 호출
            const hash = await createGame(tokenContract.contractAddress as Address);

            setTxHash(hash);
            logger.info('게임 생성 트랜잭션 전송됨', { txHash: hash });

            // 성공 알림
            alert(`게임 생성 트랜잭션이 전송되었습니다!\n트랜잭션: ${hash.slice(0, 10)}...\n\n잠시 후 페이지를 새로고침해주세요.`);

            // 콜백 호출 (있으면)
            if (onGameCreated) {
                // 실제 게임 주소는 이벤트에서 얻어야 하지만, 일단 트랜잭션 해시로 대체
                onGameCreated(hash);
            }
        } catch (error) {
            logger.error('게임 생성 오류', error);

            // 사용자 거부는 조용히 처리
            if (error && typeof error === 'object' && 'code' in error) {
                if ((error as { code: string }).code === ERROR_CODES.USER_REJECTED) {
                    return;
                }
                if ((error as { code: string }).code === ERROR_CODES.PROVIDER_NOT_AVAILABLE) {
                    setCreateError('네트워크 전환이 필요합니다. MetaMask에서 MemeCore 네트워크로 전환해주세요.');
                    return;
                }
            }

            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            setCreateError(errorMessage);
        }
    }, [tokenContract, isConnected, address, connect, ensureNetwork, createGame, onGameCreated]);

    // 토큰이 없으면 표시하지 않음
    if (!tokenContract) {
        return (
            <div className="squid-comment-section" data-testid="squid-comment-section">
                <div className="squid-comment-header">
                    <h3 className="squid-comment-title">COMMENTS</h3>
                </div>
                <div style={{ padding: '16px', textAlign: 'center', color: '#888' }}>
                    토큰 정보를 불러오는 중...
                </div>
            </div>
        );
    }

    return (
        <div className="squid-comment-section" data-testid="squid-comment-section">
            <div className="squid-no-game-section">
                {/* 바운싱 아이콘 */}
                <div className="squid-no-game-icon">🎮</div>

                {/* 타이틀 */}
                <h3 className="squid-no-game-title">NO GAME YET!</h3>

                {/* 토큰 정보 */}
                <div className="squid-token-info">
                    <div style={{ marginBottom: '4px', fontSize: '10px', color: '#888' }}>
                        TOKEN ADDRESS
                    </div>
                    <div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {formatAddress(tokenContract.contractAddress)}
                    </div>
                    {tokenContract.username && (
                        <div style={{ marginTop: '8px', fontSize: '11px' }}>
                            @{tokenContract.username}#{tokenContract.userTag}
                        </div>
                    )}
                </div>

                {/* 상금 정보 */}
                <div className="squid-prize-info">
                    BE THE FIRST TO CREATE A GAME FOR THIS TOKEN!
                </div>

                {/* 지갑 연결 상태 */}
                {walletLoading && (
                    <div style={{ color: '#888', marginBottom: '12px' }}>
                        CONNECTING WALLET...
                    </div>
                )}

                {!isConnected && !walletLoading && (
                    <button
                        type="button"
                        onClick={connect}
                        className="squid-create-game-button"
                        style={{ marginBottom: '12px' }}
                    >
                        CONNECT WALLET
                    </button>
                )}

                {isConnected && (
                    <div style={{ marginBottom: '12px', fontSize: '10px', color: '#4ade80' }}>
                        CONNECTED: {formatAddress(address || '')}
                    </div>
                )}

                {/* 게임 생성 버튼 */}
                <button
                    type="button"
                    onClick={handleCreateGame}
                    className="squid-create-game-button"
                    disabled={isCreating || !isConnected}
                >
                    {isCreating ? (
                        <>
                            <span className="squid-loading-spinner" />
                            CREATING GAME...
                        </>
                    ) : (
                        'CREATE GAME'
                    )}
                </button>

                {/* 에러 메시지 */}
                {(createError || walletError) && (
                    <div className="squid-tx-error" style={{ marginTop: '12px' }}>
                        {createError || walletError}
                    </div>
                )}

                {/* 트랜잭션 해시 */}
                {txHash && (
                    <div style={{ marginTop: '12px', fontSize: '10px', color: '#4ade80' }}>
                        TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </div>
                )}
            </div>
        </div>
    );
}
