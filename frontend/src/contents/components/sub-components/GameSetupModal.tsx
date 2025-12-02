/**
 * 게임 설정 모달 컴포넌트
 *
 * - CREATE GAME 버튼 클릭 시 표시
 * - 토큰 잔액 확인, 게임 설정 입력, 트랜잭션 실행
 */

import { useCallback, useEffect, useState } from 'react';
import type { Address } from 'viem';
import { useCreateGame, type CreateGameStep, type ExistingGameInfo } from '../hooks/useCreateGame';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useWallet } from '../hooks/useWallet';
import './GameSetupModal.css';

// 게임 설정 단계
type SetupStep = 'balance-check' | 'settings' | 'confirm' | 'processing' | 'complete';

interface GameSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    tokenAddress: Address;
    tokenSymbol?: string;
    onGameCreated?: (gameAddress: string) => void;
    onExistingGameFound?: (gameAddress: string) => void; // 진행 중인 게임 발견 시
}

interface GameSettings {
    cost: string;      // 댓글 비용 (토큰 단위)
    time: string;      // 타이머 (분)
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
    onExistingGameFound,
}: GameSetupModalProps) {
    const [step, setStep] = useState<SetupStep>('balance-check');
    const [settings, setSettings] = useState<GameSettings>({
        cost: '100',      // 기본값: 100 토큰
        time: '60',       // 기본값: 1시간 (60분)
        firstComment: '',
    });
    const [tokenDecimals, setTokenDecimals] = useState<number>(18); // 토큰 decimals (기본값 18)
    const [realTokenSymbol, setRealTokenSymbol] = useState<string>(tokenSymbol); // 실제 토큰 심볼
    const [isCheckingExistingGame, setIsCheckingExistingGame] = useState(false);

    const { checkExistingGame } = useCreateGame();

    // 모달 열릴 때 기존 게임 확인
    useEffect(() => {
        if (!isOpen) return;

        const checkGame = async () => {
            setIsCheckingExistingGame(true);
            const existingGame = await checkExistingGame(tokenAddress);
            setIsCheckingExistingGame(false);

            // 진행 중인 게임이 있으면 콜백 호출하고 모달 닫기
            if (existingGame && !existingGame.isEnded) {
                onExistingGameFound?.(existingGame.gameAddress);
                onClose();
            }
        };

        checkGame();
    }, [isOpen, tokenAddress, checkExistingGame, onExistingGameFound, onClose]);

    // 모달이 닫히지 않았으면 렌더링하지 않음
    if (!isOpen) return null;

    // 기존 게임 확인 중이면 로딩 표시
    if (isCheckingExistingGame) {
        return (
            <div className="squid-modal-backdrop">
                <div className="squid-modal-container">
                    <div className="squid-modal-header">
                        <h2 className="squid-modal-title">CREATE GAME</h2>
                    </div>
                    <div className="squid-modal-content">
                        <div className="squid-step-content">
                            <div className="squid-loading-spinner" />
                            <p style={{ marginTop: '16px', textAlign: 'center' }}>기존 게임 확인 중...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                            onNext={(decimals, symbol) => {
                                setTokenDecimals(decimals);
                                setRealTokenSymbol(symbol);
                                setStep('settings');
                            }}
                            onClose={handleClose}
                        />
                    )}

                    {step === 'settings' && (
                        <SettingsStep
                            settings={settings}
                            tokenSymbol={realTokenSymbol}
                            onChange={setSettings}
                            onNext={() => setStep('confirm')}
                            onBack={() => setStep('balance-check')}
                        />
                    )}

                    {(step === 'confirm' || step === 'processing') && (
                        <ConfirmStep
                            settings={settings}
                            tokenAddress={tokenAddress}
                            tokenSymbol={realTokenSymbol}
                            decimals={tokenDecimals}
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
    onNext: (decimals: number, symbol: string) => void;
    onClose: () => void;
}) {
    const { address } = useWallet();
    const { tokenInfo, isLoading, error, checkBalance, hasBalance } = useTokenBalance();
    const [isChecked, setIsChecked] = useState(false);

    // 잔액 조회 핸들러
    const handleCheckBalance = useCallback(async () => {
        if (!address) return;
        // 세 번째 인자로 사이트 심볼 전달 (MockToken 사용 시 UI에 표시될 심볼)
        await checkBalance(tokenAddress, address as Address, tokenSymbol);
        setIsChecked(true);
    }, [address, tokenAddress, tokenSymbol, checkBalance]);

    // 모달 열릴 때 자동으로 잔액 조회
    useEffect(() => {
        if (address && !isChecked && !isLoading) {
            handleCheckBalance();
        }
    }, [address, isChecked, isLoading, handleCheckBalance]);

    // Trade 버튼 클릭 - MemeX Trade 페이지로 이동
    const handleTrade = () => {
        // 현재 페이지의 Trade 버튼 클릭 시뮬레이션
        const tradeButton = document.querySelector('button:has-text("Trade")') as HTMLButtonElement;
        if (tradeButton) {
            tradeButton.click();
        } else {
            // Trade 버튼이 없으면 알림
            alert('Trade 버튼을 찾을 수 없습니다. 페이지에서 직접 Trade를 클릭해주세요.');
        }
    };

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

            {isLoading && (
                <div className="squid-balance-box">
                    <span className="squid-label">Your Balance</span>
                    <span className="squid-value">Loading...</span>
                </div>
            )}

            {error && (
                <div className="squid-error-box">
                    {error}
                </div>
            )}

            {tokenInfo && (
                <div className="squid-balance-box">
                    <span className="squid-label">Your Balance</span>
                    <span className={`squid-value ${hasBalance ? 'has-balance' : 'no-balance'}`}>
                        {tokenInfo.balanceFormatted} {tokenInfo.symbol || tokenSymbol}
                    </span>
                </div>
            )}

            {isChecked && !hasBalance && !isLoading && (
                <div className="squid-warning-box">
                    <p>토큰 잔액이 부족합니다.</p>
                    <p>Trade 버튼을 눌러 토큰을 구매해주세요.</p>
                    <button type="button" className="squid-trade-button" onClick={handleTrade}>
                        TRADE {tokenSymbol}
                    </button>
                </div>
            )}

            <div className="squid-button-group">
                <button type="button" className="squid-btn-secondary" onClick={onClose}>
                    Cancel
                </button>
                {!isChecked || isLoading ? (
                    <button
                        type="button"
                        className="squid-btn-primary"
                        onClick={handleCheckBalance}
                        disabled={isLoading || !address}
                    >
                        {isLoading ? 'Checking...' : 'Check Balance'}
                    </button>
                ) : hasBalance ? (
                    <button type="button" className="squid-btn-primary" onClick={() => onNext(tokenInfo?.decimals ?? 18, tokenInfo?.symbol ?? tokenSymbol)}>
                        Next
                    </button>
                ) : (
                    <button
                        type="button"
                        className="squid-btn-primary"
                        onClick={handleCheckBalance}
                    >
                        Refresh
                    </button>
                )}
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

        if (!settings.time || Number(settings.time) < 1) {
            newErrors.time = '타이머는 최소 1분 이상이어야 합니다';
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
                        placeholder="60"
                        min="1"
                    />
                    <span className="squid-input-suffix">분</span>
                </div>
                <div className="squid-time-presets">
                    <button type="button" onClick={() => onChange({ ...settings, time: '5' })}>5분</button>
                    <button type="button" onClick={() => onChange({ ...settings, time: '30' })}>30분</button>
                    <button type="button" onClick={() => onChange({ ...settings, time: '60' })}>1시간</button>
                    <button type="button" onClick={() => onChange({ ...settings, time: '1440' })}>1일</button>
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
    decimals,
    isProcessing,
    onConfirm,
    onBack,
    onComplete,
}: {
    settings: GameSettings;
    tokenAddress: Address;
    tokenSymbol: string;
    decimals: number;
    isProcessing: boolean;
    onConfirm: () => void;
    onBack: () => void;
    onComplete: (gameAddress: string) => void;
}) {
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

        // cost를 bigint로 변환 (decimals 적용)
        const costInWei = BigInt(settings.cost) * (10n ** BigInt(decimals));

        // createGame이 반환하는 게임 주소를 직접 사용
        // 분 단위 입력을 초 단위로 변환
        const createdGameAddress = await createGame({
            tokenAddress,
            cost: costInWei,
            time: Number(settings.time) * 60,
            firstComment: settings.firstComment,
        });

        // 게임 주소가 반환되면 완료 콜백 호출
        if (createdGameAddress) {
            onComplete(createdGameAddress);
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
