import { useEffect, useState } from "react";
import "./Snackbar.css";

export interface SnackbarProps {
  message: string;
  type?: "error" | "warning" | "info" | "success";
  isVisible: boolean;
  onClose: () => void;
  duration?: number; // 0 = 수동 닫기만
  actionLabel?: string;
  onAction?: () => void;
}

export function Snackbar({
  message,
  type = "error",
  isVisible,
  onClose,
  duration = 5000,
  actionLabel,
  onAction,
}: SnackbarProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);

      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300); // 애니메이션 후 닫기
  };

  const handleAction = () => {
    onAction?.();
    handleClose();
  };

  if (!isVisible && !isAnimating) return null;

  return (
    <div className={`snackbar snackbar-${type} ${isAnimating ? "snackbar-show" : "snackbar-hide"}`}>
      <div className="snackbar-icon">
        {type === "error" && "⚠️"}
        {type === "warning" && "⚡"}
        {type === "info" && "ℹ️"}
        {type === "success" && "✅"}
      </div>
      <div className="snackbar-content">
        <span className="snackbar-message">{message}</span>
      </div>
      <div className="snackbar-actions">
        {actionLabel && onAction && (
          <button className="snackbar-action-btn" onClick={handleAction}>
            {actionLabel}
          </button>
        )}
        <button className="snackbar-close-btn" onClick={handleClose}>
          ✕
        </button>
      </div>
    </div>
  );
}
