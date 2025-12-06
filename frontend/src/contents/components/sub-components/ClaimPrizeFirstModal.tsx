/**
 * Claim Prize First 모달 컴포넌트
 *
 * - 우승자가 상금을 수령하지 않고 새 게임을 만들려 할 때 표시
 */

import "../game-setup-modal/GameSetupModal.css";

interface ClaimPrizeFirstModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClaimPrize: () => void;
    isClaiming?: boolean;
}

export function ClaimPrizeFirstModal({
    isOpen,
    onClose,
    onClaimPrize,
    isClaiming = false,
}: ClaimPrizeFirstModalProps) {
    if (!isOpen) return null;

    return (
        <div className="squid-modal-backdrop" onClick={onClose}>
            <div
                className="squid-modal-container"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "400px" }}
            >
                {/* 헤더 */}
                <div className="squid-modal-header">
                    <h2
                        className="squid-modal-title"
                        style={{ color: "#f59e0b" }}
                    >
                        CLAIM YOUR PRIZE!
                    </h2>
                </div>

                {/* 컨텐츠 */}
                <div className="squid-modal-content">
                    <div className="squid-step-content">
                        {/* 아이콘 */}
                        <div
                            className="squid-step-icon"
                            style={{ fontSize: "48px" }}
                        >
                            🏆
                        </div>

                        {/* 타이틀 */}
                        <h3 className="squid-step-title">
                            You won the last game!
                        </h3>

                        {/* 설명 */}
                        <p className="squid-step-description">
                            Please claim your prize before creating a new game.
                        </p>

                        {/* 버튼들 */}
                        <div
                            style={{
                                display: "flex",
                                gap: "12px",
                                marginTop: "20px",
                                width: "100%",
                            }}
                        >
                            <button
                                type="button"
                                onClick={onClose}
                                className="squid-modal-button"
                                style={{
                                    flex: 1,
                                    background: "#333",
                                    border: "1px solid #555",
                                }}
                            >
                                CANCEL
                            </button>
                            <button
                                type="button"
                                onClick={onClaimPrize}
                                className="squid-modal-button"
                                style={{
                                    flex: 1,
                                    background:
                                        "linear-gradient(180deg, #ff494d 0%, #c20004 100%)",
                                }}
                                disabled={isClaiming}
                            >
                                {isClaiming ? "CLAIMING..." : "CLAIM PRIZE"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
