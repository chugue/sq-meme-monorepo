/**
 * 게임 없음 섹션 컴포넌트
 *
 * - 토큰은 있지만 게임이 없는 경우 표시
 * - 게임 생성 버튼 제공 (휘황찬란한 UI)
 * - CREATE GAME 클릭 시 GameSetupModal 오픈
 */

import { useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';
import type { Address } from 'viem';
import { tokenContractAtom } from '../atoms/tokenContractAtoms';
import { endedGameInfoAtom } from '../atoms/commentAtoms';
import { useWallet } from '../hooks/useWallet';
import { formatAddress } from '../utils/messageFormatter';
import { GameSetupModal } from './GameSetupModal';
import { TransactionSuccessModal } from './TransactionSuccessModal';
import { commentGameABI } from '../lib/contract/abis/commentGame';
import { injectedApi } from '../lib/injectedApi';
import { backgroundApi } from '../lib/backgroundApi';
import './CommentSection.css';

interface NoGameSectionProps {
    onGameCreated?: (gameAddress: string) => void;
}

/**
 * 게임 없음 섹션 (게임 생성 CTA)
 */
export function NoGameSection({ onGameCreated }: NoGameSectionProps) {
    const tokenContract = useAtomValue(tokenContractAtom);
    const endedGameInfo = useAtomValue(endedGameInfoAtom);
    const setEndedGameInfo = useSetAtom(endedGameInfoAtom);
    const {
        isConnected,
        address,
        connect,
        isLoading: walletLoading,
        error: walletError,
    } = useWallet();

    // 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Claim 관련 상태
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimTxHash, setClaimTxHash] = useState<string | null>(null);
    const [claimError, setClaimError] = useState<string | null>(null);

    // 트랜잭션 성공 모달 상태
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [successTxHash, setSuccessTxHash] = useState<string | null>(null);

    // 현재 사용자가 우승자인지 확인 (대소문자 무시)
    const isWinner = endedGameInfo &&
        !endedGameInfo.isClaimed &&
        address &&
        endedGameInfo.lastCommentor.toLowerCase() === address.toLowerCase();

    /**
     * CLAIM PRIZE 버튼 클릭 핸들러
     */
    const handleClaimPrize = async () => {
        if (!endedGameInfo || !address) return;

        setIsClaiming(true);
        setClaimError(null);
        setClaimTxHash(null);

        try {
            // claimPrize 함수 호출
            const txHash = await injectedApi.writeContract({
                address: endedGameInfo.gameAddress as Address,
                abi: commentGameABI,
                functionName: 'claimPrize',
                args: [],
            });

            setClaimTxHash(txHash);

            // 트랜잭션 확정 대기
            await injectedApi.waitForTransaction(txHash);

            // 트랜잭션 확정 후 백엔드에 txHash 등록 (Background Script를 통해 CORS 우회)
            try {
                await backgroundApi.registerClaimPrizeTx(
                    endedGameInfo.gameAddress,
                    txHash
                );
                console.log('백엔드에 claimPrize 등록 완료');
            } catch (apiError) {
                console.warn('백엔드 claimPrize 등록 실패', apiError);
            }

            // 트랜잭션 확정 시 성공 모달 표시
            setSuccessTxHash(txHash);
            setIsSuccessModalOpen(true);

            // endedGameInfo 업데이트 (isClaimed = true)
            setEndedGameInfo({
                ...endedGameInfo,
                isClaimed: true,
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Claim 실패';
            setClaimError(errorMessage);
            console.error('Claim 실패', err);
        } finally {
            setIsClaiming(false);
        }
    };

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

                {/* 우승자 Claim 안내 */}
                {isWinner && endedGameInfo && (
                    <div className="squid-winner-notice">
                        <div className="squid-winner-icon">🏆</div>
                        <div className="squid-winner-text">
                            <strong>Congratulations! You won the last game!</strong>
                            <p>Claim your prize before starting a new game.</p>
                            <div className="squid-winner-prize">
                                Prize Pool: {(BigInt(endedGameInfo.prizePool) / BigInt(10 ** 18)).toString()} ${tokenContract?.symbol?.toUpperCase() || 'TOKENS'}
                            </div>
                            <button
                                type="button"
                                onClick={handleClaimPrize}
                                className="squid-claim-button"
                                disabled={isClaiming}
                            >
                                {isClaiming ? 'CLAIMING...' : 'CLAIM PRIZE'}
                            </button>
                            {claimTxHash && (
                                <div className="squid-tx-hash" style={{ marginTop: '8px' }}>
                                    TX: <a href={`https://explorer.memecore.org/tx/${claimTxHash}`} target="_blank" rel="noopener noreferrer">
                                        {claimTxHash.slice(0, 10)}...{claimTxHash.slice(-8)}
                                    </a>
                                </div>
                            )}
                            {claimError && (
                                <div className="squid-tx-error" style={{ marginTop: '8px' }}>
                                    {claimError}
                                </div>
                            )}
                        </div>
                    </div>
                )}

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
                tokenSymbol={tokenContract.symbol ? `$${tokenContract.symbol.toUpperCase()}` : 'TOKEN'}
                onGameCreated={handleGameCreated}
                onExistingGameFound={(gameAddress) => {
                    // 기존 게임 발견 시 모달 닫고 게임 UI로 전환
                    setIsModalOpen(false);
                    onGameCreated?.(gameAddress);
                    window.location.reload();
                }}
            />

            {/* 트랜잭션 성공 모달 */}
            {successTxHash && (
                <TransactionSuccessModal
                    isOpen={isSuccessModalOpen}
                    onClose={() => setIsSuccessModalOpen(false)}
                    txHash={successTxHash}
                    title="Prize Claimed!"
                    description="Your prize has been successfully transferred to your wallet."
                />
            )}
        </div>
    );
}
