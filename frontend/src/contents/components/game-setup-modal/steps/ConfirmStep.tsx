/**
 * 3단계: 확인 및 실행 컴포넌트
 */

import type { Address } from 'viem';
import { useCreateGame, type CreateGameStep } from '../../../hooks/useCreateGame';
import type { GameSettings } from '../types';

interface ConfirmStepProps {
    settings: GameSettings;
    tokenAddress: Address;
    tokenSymbol: string;
    decimals: number;
    isProcessing: boolean;
    onConfirm: () => void;
    onBack: () => void;
    onComplete: (gameId: string) => void;
}

export function ConfirmStep({
    settings,
    tokenAddress,
    tokenSymbol,
    decimals,
    isProcessing,
    onConfirm,
    onBack,
    onComplete,
}: ConfirmStepProps) {
    const {
        step: txStep,
        status: txStatus,
        error: txError,
        createGame,
        reset: resetCreateGame,
    } = useCreateGame();

    const handleConfirm = async () => {
        onConfirm();
        resetCreateGame();

        // 토큰 단위를 wei로 변환 (decimals 적용)
        const costInWei = BigInt(settings.cost) * (10n ** BigInt(decimals));
        const initialFundingInWei = BigInt(settings.initialFunding) * (10n ** BigInt(decimals));

        // createGame이 반환하는 게임 ID를 직접 사용
        // 분 단위 입력을 초 단위로 변환
        const createdGameId = await createGame({
            tokenAddress,
            initialFunding: initialFundingInWei,
            cost: costInWei,
            time: Number(settings.time) * 60,
            firstComment: settings.firstComment,
        });

        // 게임 ID가 반환되면 완료 콜백 호출
        if (createdGameId) {
            onComplete(createdGameId);
        }
    };

    const formatTime = (minutes: string) => {
        const m = Number(minutes);
        if (m >= 1440) return `${Math.floor(m / 1440)}일`;
        if (m >= 60) return `${Math.floor(m / 60)}시간`;
        return `${m}분`;
    };

    // 트랜잭션 단계별 상태 메시지
    const getStatusMessage = (step: CreateGameStep): string => {
        switch (step) {
            case 'approve':
                return '1/3 토큰 승인 중...';
            case 'create':
                return '2/3 게임 생성 중...';
            case 'firstComment':
                return '3/3 첫 댓글 작성 중...';
            case 'complete':
                return '완료!';
            case 'error':
                return '오류 발생';
            default:
                return txStatus || 'Processing...';
        }
    };

    const showProcessing = isProcessing || txStep === 'approve' || txStep === 'create' || txStep === 'firstComment';

    return (
        <div className="squid-step-content">
            <div className="squid-step-icon">🚀</div>
            <h3 className="squid-step-title">Confirm & Create</h3>

            <div className="squid-confirm-summary">
                <div className="squid-confirm-item">
                    <span className="squid-confirm-label">Token</span>
                    <span className="squid-confirm-value">{tokenAddress.slice(0, 8)}...{tokenAddress.slice(-6)}</span>
                </div>
                <div className="squid-confirm-item">
                    <span className="squid-confirm-label">Initial Funding</span>
                    <span className="squid-confirm-value">{settings.initialFunding} {tokenSymbol}</span>
                </div>
                <div className="squid-confirm-item">
                    <span className="squid-confirm-label">Comment Cost</span>
                    <span className="squid-confirm-value">{settings.cost} {tokenSymbol}</span>
                </div>
                <div className="squid-confirm-item">
                    <span className="squid-confirm-label">Timer</span>
                    <span className="squid-confirm-value">{formatTime(settings.time)}</span>
                </div>
                <div className="squid-confirm-item">
                    <span className="squid-confirm-label">First Comment</span>
                    <span className="squid-confirm-value squid-comment-preview">
                        {settings.firstComment.length > 50
                            ? settings.firstComment.slice(0, 50) + '...'
                            : settings.firstComment}
                    </span>
                </div>
            </div>

            {showProcessing && (
                <div className="squid-processing-status">
                    <div className="squid-loading-spinner" />
                    <span>{getStatusMessage(txStep)}</span>
                </div>
            )}

            {txError && (
                <div className="squid-error-box">
                    {txError}
                </div>
            )}

            <div className="squid-button-group">
                <button
                    type="button"
                    className="squid-btn-secondary"
                    onClick={onBack}
                    disabled={showProcessing}
                >
                    Back
                </button>
                <button
                    type="button"
                    className="squid-btn-primary squid-btn-create"
                    onClick={handleConfirm}
                    disabled={showProcessing}
                >
                    {showProcessing ? 'Creating...' : 'CREATE GAME'}
                </button>
            </div>
        </div>
    );
}
