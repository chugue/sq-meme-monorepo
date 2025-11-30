/**
 * 게임 없음 섹션 컴포넌트
 *
 * - 토큰은 있지만 게임이 없는 경우 표시
 * - 게임 생성 버튼 제공 (휘황찬란한 UI)
 * - CREATE GAME 클릭 시 GameSetupModal 오픈
 */

import { useAtomValue } from 'jotai';
import { useState } from 'react';
import type { Address } from 'viem';
import { tokenContractAtom } from '../atoms/tokenContractAtoms';
import { useWallet } from '../hooks/useWallet';
import { formatAddress } from '../utils/messageFormatter';
import { GameSetupModal } from './GameSetupModal';
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
        isLoading: walletLoading,
        error: walletError,
    } = useWallet();

    // 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false);

    /**
     * CREATE GAME 버튼 클릭 핸들러
     */
    const handleCreateGameClick = async () => {
        // 지갑 연결 확인
        if (!isConnected || !address) {
            try {
                await connect();
            } catch (error) {
                console.error('지갑 연결 실패', error);
            }
            return;
        }

        // 모달 오픈
        setIsModalOpen(true);
    };

    /**
     * 게임 생성 완료 핸들러
     */
    const handleGameCreated = (gameAddress: string) => {
        setIsModalOpen(false);
        onGameCreated?.(gameAddress);
        // 페이지 새로고침하여 게임 UI 표시
        window.location.reload();
    };

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
                    onClick={handleCreateGameClick}
                    className="squid-create-game-button"
                    disabled={!isConnected}
                >
                    CREATE GAME
                </button>

                {/* 에러 메시지 */}
                {walletError && (
                    <div className="squid-tx-error" style={{ marginTop: '12px' }}>
                        {walletError}
                    </div>
                )}
            </div>

            {/* 게임 설정 모달 */}
            <GameSetupModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tokenAddress={tokenContract.contractAddress as Address}
                tokenSymbol={tokenContract.username ? `$${tokenContract.username.toUpperCase()}` : 'TOKEN'}
                onGameCreated={handleGameCreated}
                onExistingGameFound={(gameAddress) => {
                    // 기존 게임 발견 시 모달 닫고 게임 UI로 전환
                    setIsModalOpen(false);
                    onGameCreated?.(gameAddress);
                    window.location.reload();
                }}
            />
        </div>
    );
}
