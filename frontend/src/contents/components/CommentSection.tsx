/**
 * 댓글 섹션 컴포넌트
 *
 * - 컨트랙트 직접 호출로 댓글 작성
 * - cost 입력 UI 추가
 * - 백엔드 API로 댓글 조회
 */

import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import type { Address } from 'viem';
import { currentChallengeIdAtom } from '../atoms/commentAtoms';
import { useCommentContract } from '../hooks/useCommentContract';
import { useComments } from '../hooks/useComments';
import { useWallet } from '../hooks/useWallet';
import { logger } from '../lib/injected/logger';
import { ERROR_CODES } from '../lib/injectedApi';
import { formatAddress, formatRelativeTime } from '../utils/messageFormatter';
import './CommentSection.css';

/**
 * 지갑 연결 UI 컴포넌트
 */
function WalletConnectionUI({
    isConnected,
    address,
    isLoading,
    error,
    onConnect,
    onDisconnect,
}: {
    isConnected: boolean;
    address: string | null;
    isLoading: boolean;
    error: string | null;
    onConnect: () => Promise<void>;
    onDisconnect: () => void;
}) {
    if (isLoading) {
        return <div className="squid-wallet-notice">CONNECTING WALLET...</div>;
    }

    if (!isConnected) {
        return (
            <div className="squid-wallet-buttons">
                <button
                    type="button"
                    onClick={onConnect}
                    className="squid-wallet-button"
                    disabled={isLoading}
                >
                    CONNECT WALLET
                </button>
                {error && (
                    <div className="squid-tx-error" style={{ marginTop: '8px' }}>
                        {error}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="squid-wallet-connected">
            <div className="squid-wallet-notice">
                CONNECTED: {formatAddress(address || '')}
            </div>
            <button
                type="button"
                onClick={onDisconnect}
                className="squid-wallet-button"
                style={{ fontSize: '8px', padding: '4px 8px' }}
            >
                DISCONNECT
            </button>
        </div>
    );
}

/**
 * 댓글 폼 컴포넌트
 */
function CommentForm({
    value,
    onChange,
    cost,
    onSubmit,
    isSubmitting,
    isConnected,
    disabled,
}: {
    value: string;
    onChange: (value: string) => void;
    cost: string | null;
    onSubmit: () => Promise<void>;
    isSubmitting: boolean;
    isConnected: boolean;
    disabled?: boolean;
}) {
    const getButtonText = () => {
        if (!isConnected) return 'CONNECT WALLET FIRST';
        if (isSubmitting) return 'SUBMITTING...';
        if (cost) return `SUBMIT (${cost} TOKEN)`;
        return 'SUBMIT';
    };

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="squid-comment-form">
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="TYPE YOUR COMMENT..."
                className="squid-comment-input"
                rows={3}
                disabled={disabled || isSubmitting}
            />
            {cost && (
                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                    Comment cost: {cost} TOKEN
                </div>
            )}
            <button
                type="submit"
                className="squid-comment-submit"
                disabled={!value.trim() || isSubmitting || !isConnected || disabled}
                style={{ marginTop: '8px' }}
            >
                {getButtonText()}
            </button>
        </form>
    );
}

/**
 * 댓글 목록 컴포넌트
 */
function CommentList({
    comments,
    isLoading,
}: {
    comments: Array<{
        id: number;
        commentor: string;
        message: string;
        createdAt: string;
    }>;
    isLoading: boolean;
}) {
    if (isLoading) {
        return <div className="squid-comment-loading">LOADING...</div>;
    }

    if (comments.length === 0) {
        return <div className="squid-comment-empty">NO COMMENTS YET. BE THE FIRST!</div>;
    }

    return (
        <>
            {comments.map((comment) => (
                <div key={comment.id} className="squid-comment-item">
                    <div className="squid-comment-content">{comment.message}</div>
                    <div className="squid-comment-meta">
                        <span className="squid-comment-address">
                            {formatAddress(comment.commentor)}
                        </span>
                        <span className="squid-comment-date">
                            {formatRelativeTime(comment.createdAt)}
                        </span>
                    </div>
                </div>
            ))}
        </>
    );
}

/**
 * 댓글 섹션 메인 컴포넌트
 */
export function CommentSection() {
    logger.debug('CommentSection 렌더링', {
        timestamp: new Date().toISOString(),
        location: window.location.href,
    });

    // gameAddress = currentChallengeId
    const gameAddress = useAtomValue(currentChallengeIdAtom);

    const { comments, isLoading, refetch } = useComments();
    const {
        isConnected,
        address,
        connect,
        disconnect,
        ensureNetwork,
        isLoading: walletLoading,
        error: walletError,
    } = useWallet();

    // 컨트랙트 훅
    const { addComment, isSubmitting } = useCommentContract(
        gameAddress as Address | null,
        address as Address | null
    );

    const [newComment, setNewComment] = useState('');
    const [gameCost, setGameCost] = useState<string | null>(null);

    // 게임 정보(cost) 조회
    const { getGameInfo } = useCommentContract(
        gameAddress as Address | null,
        address as Address | null
    );

    // 컴포넌트 마운트 시 cost 조회
    useEffect(() => {
        const fetchGameCost = async () => {
            if (gameAddress) {
                try {
                    const info = await getGameInfo();
                    // cost를 토큰 단위로 변환 (18 decimals 가정)
                    const costInTokens = Number(info.cost) / 1e18;
                    setGameCost(costInTokens.toString());
                } catch (error) {
                    logger.error('게임 정보 조회 실패', error);
                }
            }
        };
        fetchGameCost();
    }, [gameAddress, getGameInfo]);

    /**
     * 댓글 제출 핸들러 (컨트랙트 호출)
     */
    const handleSubmit = useCallback(async () => {
        if (!newComment.trim()) {
            return;
        }

        // 지갑 연결 확인
        if (!isConnected || !address) {
            try {
                await connect();
            } catch (error) {
                logger.error('지갑 연결 실패', error);
            }
            return;
        }

        try {
            // 네트워크 확인 및 전환 (필요시)
            await ensureNetwork();

            logger.info('댓글 작성 시작 (컨트랙트 호출)', {
                gameAddress,
                message: newComment.trim(),
            });

            // 컨트랙트 addComment 호출
            const txHash = await addComment(newComment.trim());

            logger.info('댓글 작성 트랜잭션 전송됨', { txHash });

            // 성공 시 입력 초기화
            setNewComment('');

            // 잠시 후 댓글 목록 새로고침 (이벤트 리스너가 DB에 저장할 시간)
            setTimeout(() => {
                refetch();
            }, 3000);

            alert(`댓글이 등록되었습니다!\n트랜잭션: ${txHash.slice(0, 10)}...`);
        } catch (error) {
            logger.error('댓글 작성 오류', error);

            // 사용자 거부 에러는 조용히 처리
            if (error && typeof error === 'object' && 'code' in error) {
                if ((error as { code: string }).code === ERROR_CODES.USER_REJECTED) {
                    return;
                }
                if ((error as { code: string }).code === ERROR_CODES.PROVIDER_NOT_AVAILABLE) {
                    alert('네트워크 전환이 필요합니다. MetaMask에서 MemeCore 네트워크로 전환해주세요.');
                    return;
                }
            }

            // 다른 에러는 사용자에게 알림
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            alert(`댓글 작성에 실패했습니다: ${errorMessage}`);
        }
    }, [newComment, isConnected, address, connect, ensureNetwork, gameAddress, addComment, refetch]);

    return (
        <div className="squid-comment-section" data-testid="squid-comment-section">
            <div className="squid-comment-header">
                <h3 className="squid-comment-title">COMMENTS</h3>
                <span className="squid-comment-count">{comments.length}</span>
            </div>

            <div className="squid-wallet-actions">
                <WalletConnectionUI
                    isConnected={isConnected}
                    address={address}
                    isLoading={walletLoading}
                    error={walletError}
                    onConnect={connect}
                    onDisconnect={disconnect}
                />
            </div>

            <CommentForm
                value={newComment}
                onChange={setNewComment}
                cost={gameCost}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                isConnected={isConnected}
            />

            <div className="squid-comments-list">
                <CommentList comments={comments} isLoading={isLoading} />
            </div>
        </div>
    );
}
