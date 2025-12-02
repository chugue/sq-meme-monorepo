interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree: () => void;
}

export function TermsModal({ isOpen, onClose, onAgree }: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="terms-modal-overlay" onClick={onClose}>
      <div className="terms-modal" onClick={(e) => e.stopPropagation()}>
        <div className="terms-modal-header">
          <h2 className="terms-modal-title">TERMS OF SERVICE</h2>
          <button className="terms-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="terms-modal-content">
          <div className="terms-scroll-area">
            <h3>1. 서비스 이용약관</h3>
            <p>
              본 약관은 SQUID MEME (이하 "서비스")의 이용에 관한 조건 및 절차,
              기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>

            <h3>2. 서비스 이용</h3>
            <p>
              사용자는 본 서비스를 통해 밈코인 관련 정보를 확인하고, MEMEX
              프로토콜과 상호작용할 수 있습니다. 모든 거래는 블록체인 상에서
              이루어지며, 취소가 불가능합니다.
            </p>

            <h3>3. 위험 고지</h3>
            <p>
              암호화폐 투자는 높은 위험을 수반합니다. 투자 결정은 본인의 판단과
              책임 하에 이루어져야 하며, 서비스 제공자는 투자 손실에 대해 책임지지
              않습니다.
            </p>

            <h3>4. 개인정보 보호</h3>
            <p>
              서비스는 사용자의 지갑 주소 외에 개인정보를 수집하지 않습니다. 모든
              거래 기록은 공개 블록체인에 기록됩니다.
            </p>

            <h3>5. 면책조항</h3>
            <p>
              서비스는 "있는 그대로" 제공되며, 명시적이거나 묵시적인 어떠한
              보증도 제공하지 않습니다. 스마트 컨트랙트의 버그나 해킹으로 인한
              손실에 대해 책임지지 않습니다.
            </p>
          </div>
        </div>
        <div className="terms-modal-footer">
          <button className="terms-btn terms-btn-cancel" onClick={onClose}>
            CANCEL
          </button>
          <button className="terms-btn terms-btn-agree" onClick={onAgree}>
            I AGREE
          </button>
        </div>
      </div>
    </div>
  );
}
