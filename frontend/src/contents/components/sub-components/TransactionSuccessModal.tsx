/**
 * 트랜잭션 성공 모달 컴포넌트
 *
 * - 트랜잭션 확정 후 성공 알림 표시
 * - 익스플로러 링크 제공
 */

import "./GameSetupModal.css";

interface TransactionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  txHash: string;
  title?: string;
  description?: string;
}

// MemeCore Mainnet Explorer (Insectarium 테스트넷은 익스플로러 없음)
const EXPLORER_URL = "https://memecorescan.io";

export function TransactionSuccessModal({
  isOpen,
  onClose,
  txHash,
  title = "Transaction Confirmed!",
  description = "Your transaction has been successfully confirmed on the blockchain.",
}: TransactionSuccessModalProps) {
  if (!isOpen) return null;

  const explorerLink = `${EXPLORER_URL}/tx/${txHash}`;
  const shortTxHash = `${txHash.slice(0, 10)}...${txHash.slice(-8)}`;

  return (
    <div className="squid-modal-backdrop" onClick={onClose}>
      <div
        className="squid-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "400px" }}
      >
        {/* 헤더 */}
        <div className="squid-modal-header">
          <h2 className="squid-modal-title" style={{ color: "#4ade80" }}>
            SUCCESS
          </h2>
          <button type="button" className="squid-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="squid-modal-content">
          <div className="squid-step-content">
            {/* 성공 아이콘 */}
            <div className="squid-step-icon squid-success-icon">✅</div>

            {/* 타이틀 */}
            <h3 className="squid-step-title">{title}</h3>

            {/* 설명 */}
            <p className="squid-step-description">{description}</p>

            {/* 트랜잭션 해시 */}
            <div className="squid-token-address-box">
              <span className="squid-label">TX HASH</span>
              <span className="squid-value">{shortTxHash}</span>
            </div>

            {/* 버튼 그룹 */}
            <div className="squid-button-group">
              <a
                href={explorerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="squid-btn-primary"
                style={{
                  textDecoration: "none",
                  textAlign: "center",
                  background: "linear-gradient(135deg, #4ade80, #22c55e)",
                }}
              >
                View on Explorer
              </a>
              <button
                type="button"
                className="squid-btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
