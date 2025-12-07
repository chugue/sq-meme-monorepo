/**
 * 1단계: 잔액 확인 컴포넌트
 */

import checkCoin from "@/public/icon/game-setting/check-coin.png";
import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { useTokenBalance } from "../../../hooks/useTokenBalance";
import { useWallet } from "../../../hooks/useWallet";

interface BalanceCheckStepProps {
    tokenAddress: Address;
    tokenSymbol: string;
    username?: string;
    onNext: (decimals: number, symbol: string) => void;
    onClose: () => void;
}

export function BalanceCheckStep({ tokenAddress, tokenSymbol, username, onNext, onClose }: BalanceCheckStepProps) {
    const { address } = useWallet();
    const { tokenInfo, isLoading, error, checkBalance, hasBalance } = useTokenBalance();
    const [isChecked, setIsChecked] = useState(false);

    // 디버깅: BalanceCheckStep에 전달된 props 확인
    console.log("🦑 [DEBUG] BalanceCheckStep props:", { tokenAddress, tokenSymbol, username });

    // 잔액 조회 핸들러
    const handleCheckBalance = useCallback(async () => {
        if (!address) return;
        // 네 번째 인자로 username 전달 (테스트 유저 확인용)
        await checkBalance(tokenAddress, address as Address, tokenSymbol, username);
        setIsChecked(true);
    }, [address, tokenAddress, tokenSymbol, username, checkBalance]);

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
            alert("Trade 버튼을 찾을 수 없습니다. 페이지에서 직접 Trade를 클릭해주세요.");
        }
    };

    return (
        <div className="balance-check-step">
            <div className="balance-check-icon">
                <img src={checkCoin} alt="Check Token" />
            </div>
            <h3 className="balance-check-title">Check Token Balance</h3>
            <p className="balance-check-description">Creating a game requires ${tokenSymbol} tokens.</p>

            <div className="balance-check-info-section">
                <div className="balance-check-info-row">
                    <span className="balance-check-label">TOKEN ADDRESS</span>
                    <span className="balance-check-value">
                        {tokenAddress.slice(0, 8)}...{tokenAddress.slice(-6)}
                    </span>
                </div>

                {isLoading && (
                    <div className="balance-check-info-row">
                        <span className="balance-check-label">YOUR BALANCE</span>
                        <span className="balance-check-value">Loading...</span>
                    </div>
                )}

                {error && <div className="balance-check-error">{error}</div>}

                {tokenInfo && (
                    <div className="balance-check-info-row">
                        <span className="balance-check-label">YOUR BALANCE</span>
                        <span className={`balance-check-balance ${hasBalance ? "has-balance" : "no-balance"}`}>
                            <span className="balance-amount">{tokenInfo.balanceFormatted}</span>
                            <span className="balance-symbol">{tokenInfo.symbol || tokenSymbol}</span>
                        </span>
                    </div>
                )}
            </div>

            {isChecked && !hasBalance && !isLoading && (
                <div className="balance-check-warning">
                    <p>토큰 잔액이 부족합니다.</p>
                    <p>Trade 버튼을 눌러 토큰을 구매해주세요.</p>
                    <button type="button" className="balance-check-trade-btn" onClick={handleTrade}>
                        TRADE {tokenSymbol}
                    </button>
                </div>
            )}

            <div className="balance-check-button-group">
                <button type="button" className="balance-check-btn-cancel" onClick={onClose}>
                    Cancel
                </button>
                {!isChecked || isLoading ? (
                    <button type="button" className="balance-check-btn-next" onClick={handleCheckBalance} disabled={isLoading || !address}>
                        {isLoading ? "Checking..." : "Check Balance"}
                    </button>
                ) : hasBalance ? (
                    <button
                        type="button"
                        className="balance-check-btn-next"
                        onClick={() => onNext(tokenInfo?.decimals ?? 18, tokenInfo?.symbol ?? tokenSymbol)}
                    >
                        Next
                    </button>
                ) : (
                    <button type="button" className="balance-check-btn-next" onClick={handleCheckBalance}>
                        Refresh
                    </button>
                )}
            </div>
        </div>
    );
}
