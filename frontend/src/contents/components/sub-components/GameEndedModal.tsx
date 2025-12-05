/**
 * 게임 종료 모달 컴포넌트
 *
 * - 게임이 종료되었을 때 알림 표시
 * - 3초 후 자동으로 페이지 새로고침
 */

import { useEffect, useState } from "react";
import "../game-setup-modal/GameSetupModal.css";

interface GameEndedModalProps {
  isOpen: boolean;
}

export function GameEndedModal({ isOpen }: GameEndedModalProps) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="squid-modal-backdrop">
      <div
        className="squid-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "400px" }}
      >
        {/* 헤더 */}
        <div className="squid-modal-header">
          <h2 className="squid-modal-title" style={{ color: "#f59e0b" }}>
            GAME ENDED
          </h2>
        </div>

        {/* 컨텐츠 */}
        <div className="squid-modal-content">
          <div className="squid-step-content">
            {/* 종료 아이콘 */}
            <div className="squid-step-icon" style={{ fontSize: "48px" }}>
              ⏰
            </div>

            {/* 타이틀 */}
            <h3 className="squid-step-title">Game has ended!</h3>

            {/* 설명 */}
            <p className="squid-step-description">
              This game has already ended. The page will refresh to show the
              current game status.
            </p>

            {/* 카운트다운 */}
            <div
              className="squid-token-address-box"
              style={{ textAlign: "center" }}
            >
              <span className="squid-label">REFRESHING IN</span>
              <span
                className="squid-value"
                style={{ fontSize: "24px", fontWeight: "bold" }}
              >
                {countdown}s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
