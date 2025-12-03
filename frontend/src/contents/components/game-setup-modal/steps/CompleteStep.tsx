/**
 * 완료 단계 컴포넌트
 */

interface CompleteStepProps {
    onClose: () => void;
}

export function CompleteStep({ onClose }: CompleteStepProps) {
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
