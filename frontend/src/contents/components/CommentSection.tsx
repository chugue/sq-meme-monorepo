/**
 * 댓글 섹션 컴포넌트
 * 
 * 시니어급 기준으로 개선:
 * - 관심사 분리
 * - 에러 처리 개선
 * - 재사용 가능한 로직 추출
 */

import { useCallback, useEffect, useState } from 'react';
import { formatUnits, type Address } from 'viem';
import { useReadContract } from 'wagmi';
import { useComments } from '../hooks/useComments';
import { useWallet } from '../hooks/useWallet';
import { erc20ABI } from '../lib/contract/abis/erc20';
import { logger } from '../lib/injected/logger';
import { ERROR_CODES, injectedApi } from '../lib/injectedApi';
import { createCommentSignatureMessage, formatAddress, formatRelativeTime } from '../utils/messageFormatter';
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
                    🔗 CONNECT WALLET
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
                ✅ CONNECTED: {formatAddress(address || '')}
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
 * 토큰 잔액 조회 컴포넌트
 */
function TokenBalanceChecker() {
    const [inputAddress, setInputAddress] = useState<string>('');
    const [queryAddress, setQueryAddress] = useState<Address | null>(null);
    const [decimals, setDecimals] = useState<number>(18);

    const contractAddress = '0x0000000000000000000000000000000000000000';
    const hasContractAddress = Boolean(contractAddress);
    const hasQueryAddress = Boolean(queryAddress);

    // decimals 조회 (컨트랙트 주소만 있으면 조회 가능)
    const { data: decimalsData } = useReadContract({
        address: contractAddress,
        abi: erc20ABI,
        functionName: 'decimals',
        query: {
            enabled: hasContractAddress,
        },
    });

    // balanceOf 조회 (컨트랙트 주소와 조회할 주소가 모두 있어야 함)
    // args가 없으면 쿼리를 비활성화하여 에러 방지
    const balanceQueryEnabled = hasContractAddress && hasQueryAddress && queryAddress !== null;

    const {
        data: balanceData,
        isLoading: isBalanceLoading,
        error: balanceError,
        refetch: refetchBalance,
    } = useReadContract({
        address: contractAddress,
        abi: erc20ABI,
        functionName: 'balanceOf',
        ...(queryAddress && { args: [queryAddress] }),
        query: {
            enabled: balanceQueryEnabled,
        },
    });

    // decimals 업데이트
    useEffect(() => {
        if (decimalsData !== undefined && typeof decimalsData === 'number') {
            setDecimals(decimalsData);
        }
    }, [decimalsData]);

    const handleCheckBalance = useCallback(() => {
        if (!inputAddress.trim()) {
            alert('주소를 입력해주세요.');
            return;
        }

        // 주소 형식 검증
        if (!/^0x[a-fA-F0-9]{40}$/.test(inputAddress.trim())) {
            alert('올바른 이더리움 주소 형식이 아닙니다.');
            return;
        }

        setQueryAddress(inputAddress.trim() as Address);
    }, [inputAddress]);

    const handleUseContractAddress = useCallback(() => {

    }, []);

    const balance = balanceData && typeof balanceData === 'bigint'
        ? formatUnits(balanceData, decimals)
        : null;

    return (
        <div className="squid-token-balance-checker" style={{ marginTop: '12px', padding: '12px', border: '1px solid #333', borderRadius: '4px' }}>
            <div style={{ fontSize: '10px', marginBottom: '8px', fontWeight: 'bold' }}>
                💰 TOKEN BALANCE CHECKER
            </div>

            {/* {tokenContract ? (
                <div style={{ fontSize: '9px', marginBottom: '8px', color: '#888' }}>
                    Contract: {formatAddress(tokenContract.contractAddress)}
                </div>
            ) : (
                <div style={{ fontSize: '9px', marginBottom: '8px', color: '#ff6b6b' }}>
                    ⚠️ 토큰 컨트랙트 주소를 찾을 수 없습니다
                </div>
            )} */}

            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                <input
                    type="text"
                    value={inputAddress}
                    onChange={(e) => setInputAddress(e.target.value)}
                    placeholder="0x..."
                    style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '10px',
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '2px',
                        color: '#fff',
                    }}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            handleCheckBalance();
                        }
                    }}
                />
                {/* <button
                    type="button"
                    onClick={handleCheckBalance}
                    disabled={!tokenContract || isBalanceLoading}
                    className="squid-wallet-button"
                    style={{ fontSize: '10px', padding: '6px 12px' }}
                >
                    {isBalanceLoading ? '⏳' : '조회'}
                </button> */}
            </div>

            {/* {tokenContract && (
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    <button
                        type="button"
                        onClick={handleUseContractAddress}
                        className="squid-wallet-button"
                        style={{ fontSize: '9px', padding: '4px 8px', flex: 1 }}
                    >
                        컨트랙트 주소 사용
                    </button>
                </div>
            )} */}

            {balanceError && (
                <div className="squid-tx-error" style={{ marginTop: '8px', fontSize: '9px' }}>
                    {balanceError.message || '잔액 조회 실패'}
                </div>
            )}

            {balance !== null && !isBalanceLoading && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#4ade80', fontWeight: 'bold' }}>
                    ✅ Balance: {parseFloat(balance).toLocaleString()} tokens
                </div>
            )}

            {queryAddress && (
                <div style={{ marginTop: '4px', fontSize: '9px', color: '#888' }}>
                    Address: {formatAddress(queryAddress)}
                </div>
            )}
        </div>
    );
}

/**
 * 댓글 폼 컴포넌트
 */
function CommentForm({
    value,
    onChange,
    onSubmit,
    isSubmitting,
    isSigning,
    isConnected,
    disabled,
}: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => Promise<void>;
    isSubmitting: boolean;
    isSigning: boolean;
    isConnected: boolean;
    disabled?: boolean;
}) {
    const getButtonText = () => {
        if (!isConnected) return 'CONNECT WALLET FIRST';
        if (isSigning) return '✍️ SIGNING...';
        if (isSubmitting) return 'SUBMITTING...';
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
                disabled={disabled || isSubmitting || isSigning}
            />
            <button
                type="submit"
                className="squid-comment-submit"
                disabled={!value.trim() || isSubmitting || isSigning || !isConnected || disabled}
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
    comments: Array<{ id: string; content: string; player_address: string; created_at: string }>;
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
                    <div className="squid-comment-content">{comment.content}</div>
                    <div className="squid-comment-meta">
                        <span className="squid-comment-address">
                            {formatAddress(comment.player_address)}
                        </span>
                        <span className="squid-comment-date">
                            {formatRelativeTime(comment.created_at)}
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

    const { comments, isLoading, createComment, isSubmitting } = useComments();
    const {
        isConnected,
        address,
        connect,
        disconnect,
        ensureNetwork,
        isLoading: walletLoading,
        error: walletError,
    } = useWallet();
    const [newComment, setNewComment] = useState('');
    const [isSigning, setIsSigning] = useState(false);

    /**
     * 댓글 제출 핸들러
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
                // 에러는 useWallet에서 이미 처리됨
            }
            return;
        }

        try {
            setIsSigning(true);

            // 네트워크 확인 및 전환 (필요시)
            await ensureNetwork();

            // 서명할 메시지 생성
            const messageToSign = createCommentSignatureMessage(newComment.trim(), address);

            // MetaMask에서 서명 요청
            const signature = await injectedApi.signMessage({
                message: messageToSign,
                address,
            });

            logger.info('서명 완료', { signature: signature.slice(0, 20) + '...' });

            // 서명과 함께 댓글 작성
            await createComment({
                player_address: address,
                content: newComment.trim(),
                signature,
                message: messageToSign,
            });

            setNewComment('');
        } catch (error) {
            logger.error('댓글 작성 오류', error);

            // 사용자 거부 에러는 조용히 처리
            if (error && typeof error === 'object' && 'code' in error) {
                if (error.code === ERROR_CODES.USER_REJECTED) {
                    // 사용자가 서명을 거부한 경우 - 조용히 처리
                    return;
                }
                if (error.code === ERROR_CODES.PROVIDER_NOT_AVAILABLE) {
                    // 네트워크 전환 실패
                    alert('네트워크 전환이 필요합니다. MetaMask에서 MemeCore 네트워크로 전환해주세요.');
                    return;
                }
            }

            // 다른 에러는 사용자에게 알림
            const errorMessage =
                error instanceof Error ? error.message : '알 수 없는 오류';
            alert(`댓글 작성에 실패했습니다: ${errorMessage}`);
        } finally {
            setIsSigning(false);
        }
    }, [newComment, isConnected, address, connect, createComment]);

    return (
        <div className="squid-comment-section" data-testid="squid-comment-section">
            <div className="squid-comment-header">
                <h3 className="squid-comment-title">💬 COMMENTS</h3>
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
                <TokenBalanceChecker />
            </div>

            <CommentForm
                value={newComment}
                onChange={setNewComment}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                isSigning={isSigning}
                isConnected={isConnected}
            />

            <div className="squid-comments-list">
                <CommentList comments={comments} isLoading={isLoading} />
            </div>
        </div>
    );
}
