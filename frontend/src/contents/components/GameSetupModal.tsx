/**
 * 게임 설정 모달 컴포넌트
 *
 * - CREATE GAME 버튼 클릭 시 표시
 * - 토큰 잔액 확인, 게임 설정 입력, 트랜잭션 실행
 */

import { useCallback, useState } from 'react';
import type { Address } from 'viem';
import './GameSetupModal.css';

// 게임 설정 단계
type SetupStep = 'balance-check' | 'settings' | 'confirm' | 'processing' | 'complete';

interface GameSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    tokenAddress: Address;
    tokenSymbol?: string;
    onGameCreated?: (gameAddress: string) => void;
}

interface GameSettings {
    cost: string;      // 댓글 비용 (토큰 단위)
    time: string;      // 타이머 (초)
    firstComment: string; // 첫 댓글 내용
}

/**
 * 게임 설정 모달
 */
export function GameSetupModal({
    isOpen,
    onClose,
    tokenAddress,
    tokenSymbol = 'TOKEN',
    onGameCreated,
}: GameSetupModalProps) {
    const [step, setStep] = useState<SetupStep>('balance-check');
    const [settings, setSettings] = useState<GameSettings>({
        cost: '100',      // 기본값: 100 토큰
        time: '3600',     // 기본값: 1시간 (3600초)
        firstComment: '',
    });

    // 모달이 닫히지 않았으면 렌더링하지 않음
    if (!isOpen) return null;

    // 모달 닫기 핸들러
    const handleClose = () => {
        // processing 중에는 닫기 방지
        if (step === 'processing') return;
        setStep('balance-check');
        onClose();
    };

    // 배경 클릭 시 닫기
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    return (
        <div className="squid-modal-backdrop" onClick={handleBackdropClick}>
            <div className="squid-modal-container">
                {/* 헤더 */}
                <div className="squid-modal-header">
                    <h2 className="squid-modal-title">CREATE GAME</h2>
                    <button
                        type="button"
                        className="squid-modal-close"
                        onClick={handleClose}
                        disabled={step === 'processing'}
                    >
                        &times;
                    </button>
                </div>

                {/* 단계 표시 */}
                <div className="squid-modal-steps">
                    <div className={`squid-step ${step === 'balance-check' ? 'active' : ''}`}>
                        1. Balance
                    </div>
                    <div className={`squid-step ${step === 'settings' ? 'active' : ''}`}>
                        2. Settings
                    </div>
                    <div className={`squid-step ${step === 'confirm' || step === 'processing' ? 'active' : ''}`}>
                        3. Create
                    </div>
                </div>

                {/* 컨텐츠 영역 */}
                <div className="squid-modal-content">
                    {step === 'balance-check' && (
                        <BalanceCheckStep
                            tokenAddress={tokenAddress}
                            tokenSymbol={tokenSymbol}
                            onNext={() => setStep('settings')}
                            onClose={handleClose}
                        />
                    )}

                    {step === 'settings' && (
                        <SettingsStep
                            settings={settings}
                            tokenSymbol={tokenSymbol}
                            onChange={setSettings}
                            onNext={() => setStep('confirm')}
                            onBack={() => setStep('balance-check')}
                        />
                    )}

                    {(step === 'confirm' || step === 'processing') && (
                        <ConfirmStep
                            settings={settings}
                            tokenAddress={tokenAddress}
                            tokenSymbol={tokenSymbol}
                            isProcessing={step === 'processing'}
                            onConfirm={() => setStep('processing')}
                            onBack={() => setStep('settings')}
                            onComplete={(gameAddress) => {
                                setStep('complete');
                                onGameCreated?.(gameAddress);
                            }}
                        />
                    )}

                    {step === 'complete' && (
                        <CompleteStep onClose={handleClose} />
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * 1단계: 잔액 확인
 */
function BalanceCheckStep({
    tokenAddress,
    tokenSymbol,
    onNext,
    onClose,
}: {
    tokenAddress: Address;
    tokenSymbol: string;
    onNext: () => void;
    onClose: () => void;
}) {
    // TODO: 실제 잔액 조회 구현 (2단계에서)
    const [isLoading, setIsLoading] = useState(false);
    const [balance, setBalance] = useState<string | null>(null);
    const [hasBalance, setHasBalance] = useState<boolean | null>(null);

    // 임시: 잔액이 있다고 가정
    const checkBalance = useCallback(async () => {
        setIsLoading(true);
        // TODO: 실제 balanceOf 호출
        await new Promise(resolve => setTimeout(resolve, 1000));
        setBalance('1000');
        setHasBalance(true);
        setIsLoading(false);
    }, []);

    return (
        <div className="squid-step-content">
            <div className="squid-step-icon">💰</div>
            <h3 className="squid-step-title">Check Token Balance</h3>
            <p className="squid-step-description">
                게임을 생성하려면 {tokenSymbol} 토큰이 필요합니다.
                <br />
                첫 댓글 비용으로 사용됩니다.
            </p>

            <div className="squid-token-address-box">
                <span className="squid-label">Token Address</span>
                <span className="squid-value">{tokenAddress.slice(0, 8)}...{tokenAddress.slice(-6)}</span>
            </div>

            {balance !== null && (
                <div className="squid-balance-box">
                    <span className="squid-label">Your Balance</span>
                    <span className={`squid-value ${hasBalance ? 'has-balance' : 'no-balance'}`}>
                        {balance} {tokenSymbol}
                    </span>
                </div>
            )}

            {hasBalance === false && (
                <div className="squid-warning-box">
                    <p>토큰 잔액이 부족합니다.</p>
                    <p>Trade 버튼을 눌러 토큰을 구매해주세요.</p>
                    <button type="button" className="squid-trade-button">
                        TRADE {tokenSymbol}
                    </button>
                </div>
            )}

            <div className="squid-button-group">
                <button type="button" className="squid-btn-secondary" onClick={onClose}>
                    Cancel
                </button>
                {balance === null ? (
                    <button
                        type="button"
                        className="squid-btn-primary"
                        onClick={checkBalance}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Checking...' : 'Check Balance'}
                    </button>
                ) : hasBalance ? (
                    <button type="button" className="squid-btn-primary" onClick={onNext}>
                        Next
                    </button>
                ) : null}
            </div>
        </div>
    );
}

/**
 * 2단계: 게임 설정 입력
 */
function SettingsStep({
    settings,
    tokenSymbol,
    onChange,
    onNext,
    onBack,
}: {
    settings: GameSettings;
    tokenSymbol: string;
    onChange: (settings: GameSettings) => void;
    onNext: () => void;
    onBack: () => void;
}) {
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!settings.cost || Number(settings.cost) <= 0) {
            newErrors.cost = '댓글 비용은 0보다 커야 합니다';
        }

        if (!settings.time || Number(settings.time) < 60) {
            newErrors.time = '타이머는 최소 60초 이상이어야 합니다';
        }

        if (!settings.firstComment.trim()) {
            newErrors.firstComment = '첫 댓글을 입력해주세요';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validate()) {
            onNext();
        }
    };

    return (
        <div className="squid-step-content">
            <div className="squid-step-icon">⚙️</div>
            <h3 className="squid-step-title">Game Settings</h3>

            {/* 댓글 비용 */}
            <div className="squid-input-group">
                <label className="squid-input-label">
                    Comment Cost
                    <span className="squid-input-hint">댓글 1개당 필요한 토큰 수량</span>
                </label>
                <div className="squid-input-with-suffix">
                    <input
                        type="number"
                        className={`squid-input ${errors.cost ? 'error' : ''}`}
                        value={settings.cost}
                        onChange={(e) => onChange({ ...settings, cost: e.target.value })}
                        placeholder="100"
                        min="1"
                    />
                    <span className="squid-input-suffix">{tokenSymbol}</span>
                </div>
                {errors.cost && <span className="squid-input-error">{errors.cost}</span>}
            </div>

            {/* 타이머 */}
            <div className="squid-input-group">
                <label className="squid-input-label">
                    Timer
                    <span className="squid-input-hint">마지막 댓글 후 종료까지 시간</span>
                </label>
                <div className="squid-input-with-suffix">
                    <input
                        type="number"
                        className={`squid-input ${errors.time ? 'error' : ''}`}
                        value={settings.time}
                        onChange={(e) => onChange({ ...settings, time: e.target.value })}
                        placeholder="3600"
                        min="60"
                    />
                    <span className="squid-input-suffix">초</span>
                </div>
                <div className="squid-time-presets">
                    <button type="button" onClick={() => onChange({ ...settings, time: '300' })}>5분</button>
                    <button type="button" onClick={() => onChange({ ...settings, time: '1800' })}>30분</button>
                    <button type="button" onClick={() => onChange({ ...settings, time: '3600' })}>1시간</button>
                    <button type="button" onClick={() => onChange({ ...settings, time: '86400' })}>24시간</button>
                </div>
                {errors.time && <span className="squid-input-error">{errors.time}</span>}
            </div>

            {/* 첫 댓글 */}
            <div className="squid-input-group">
                <label className="squid-input-label">
                    First Comment
                    <span className="squid-input-hint">게임 생성과 함께 작성할 첫 댓글</span>
                </label>
                <textarea
                    className={`squid-textarea ${errors.firstComment ? 'error' : ''}`}
                    value={settings.firstComment}
                    onChange={(e) => onChange({ ...settings, firstComment: e.target.value })}
                    placeholder="게임을 시작합니다! 마지막 댓글 작성자가 상금을 가져갑니다."
                    rows={3}
                />
                {errors.firstComment && <span className="squid-input-error">{errors.firstComment}</span>}
            </div>

            <div className="squid-button-group">
                <button type="button" className="squid-btn-secondary" onClick={onBack}>
                    Back
                </button>
                <button type="button" className="squid-btn-primary" onClick={handleNext}>
                    Next
                </button>
            </div>
        </div>
    );
}

/**
 * 3단계: 확인 및 실행
 */
function ConfirmStep({
    settings,
    tokenAddress,
    tokenSymbol,
    isProcessing,
    onConfirm,
    onBack,
    onComplete,
}: {
    settings: GameSettings;
    tokenAddress: Address;
    tokenSymbol: string;
    isProcessing: boolean;
    onConfirm: () => void;
    onBack: () => void;
    onComplete: (gameAddress: string) => void;
}) {
    const [status, setStatus] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        onConfirm();
        setError(null);

        try {
            // TODO: 실제 트랜잭션 구현 (4단계에서)
            setStatus('1/3 토큰 승인 중...');
            await new Promise(resolve => setTimeout(resolve, 1500));

            setStatus('2/3 게임 생성 중...');
            await new Promise(resolve => setTimeout(resolve, 1500));

            setStatus('3/3 첫 댓글 작성 중...');
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 임시 게임 주소
            onComplete('0x1234567890123456789012345678901234567890');
        } catch (err) {
            setError(err instanceof Error ? err.message : '트랜잭션 실패');
        }
    };

    const formatTime = (seconds: string) => {
        const s = Number(seconds);
        if (s >= 86400) return `${Math.floor(s / 86400)}일`;
        if (s >= 3600) return `${Math.floor(s / 3600)}시간`;
        if (s >= 60) return `${Math.floor(s / 60)}분`;
        return `${s}초`;
    };

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

            {isProcessing && (
                <div className="squid-processing-status">
                    <div className="squid-loading-spinner" />
                    <span>{status || 'Processing...'}</span>
                </div>
            )}

            {error && (
                <div className="squid-error-box">
                    {error}
                </div>
            )}

            <div className="squid-button-group">
                <button
                    type="button"
                    className="squid-btn-secondary"
                    onClick={onBack}
                    disabled={isProcessing}
                >
                    Back
                </button>
                <button
                    type="button"
                    className="squid-btn-primary squid-btn-create"
                    onClick={handleConfirm}
                    disabled={isProcessing}
                >
                    {isProcessing ? 'Creating...' : 'CREATE GAME'}
                </button>
            </div>
        </div>
    );
}

/**
 * 완료 단계
 */
function CompleteStep({ onClose }: { onClose: () => void }) {
    return (
        <div className="squid-step-content">
            <div className="squid-step-icon squid-success-icon">✅</div>
            <h3 className="squid-step-title">Game Created!</h3>
            <p className="squid-step-description">
                게임이 성공적으로 생성되었습니다.
                <br />
                이제 다른 사용자들이 댓글을 달 수 있습니다!
            </p>

            <div className="squid-button-group">
                <button type="button" className="squid-btn-primary" onClick={onClose}>
                    Done
                </button>
            </div>
        </div>
    );
}
