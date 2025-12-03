/**
 * 2단계: 게임 설정 입력 컴포넌트
 */

import { useState, useRef } from "react";
import type { GameSettings } from "../types";
import { backgroundApi } from "../../../lib/backgroundApi";

interface SettingsStepProps {
  settings: GameSettings;
  tokenSymbol: string;
  onChange: (settings: GameSettings) => void;
  onNext: () => void;
  onBack: () => void;
}

export function SettingsStep({
  settings,
  tokenSymbol,
  onChange,
  onNext,
  onBack,
}: SettingsStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { url } = await backgroundApi.uploadImage(file);
      onChange({ ...settings, firstCommentImage: url });
    } catch (error) {
      console.error("이미지 업로드 실패:", error);
      setErrors((prev) => ({ ...prev, image: "이미지 업로드에 실패했습니다" }));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    onChange({ ...settings, firstCommentImage: undefined });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!settings.initialFunding || Number(settings.initialFunding) <= 0) {
      newErrors.initialFunding = "초기 펀딩 금액은 0보다 커야 합니다";
    }

    if (!settings.cost || Number(settings.cost) <= 0) {
      newErrors.cost = "댓글 비용은 0보다 커야 합니다";
    }

    if (!settings.time || Number(settings.time) < 1) {
      newErrors.time = "타이머는 최소 1분 이상이어야 합니다";
    }

    if (!settings.firstComment.trim()) {
      newErrors.firstComment = "첫 댓글을 입력해주세요";
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

      {/* 초기 펀딩 금액 */}
      <div className="squid-input-group">
        <label className="squid-input-label">
          Initial Funding
          <span className="squid-input-hint">
            상금 풀에 넣을 초기 토큰 수량
          </span>
        </label>
        <div className="squid-input-with-suffix">
          <input
            type="number"
            className={`squid-input ${errors.initialFunding ? "error" : ""}`}
            value={settings.initialFunding}
            onChange={(e) =>
              onChange({ ...settings, initialFunding: e.target.value })
            }
            placeholder="1000"
            min="1"
          />
          <span className="squid-input-suffix">{tokenSymbol}</span>
        </div>
        <div className="squid-time-presets">
          <button
            type="button"
            onClick={() => onChange({ ...settings, initialFunding: "100" })}
          >
            100
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...settings, initialFunding: "500" })}
          >
            500
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...settings, initialFunding: "1000" })}
          >
            1,000
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...settings, initialFunding: "5000" })}
          >
            5,000
          </button>
        </div>
        {errors.initialFunding && (
          <span className="squid-input-error">{errors.initialFunding}</span>
        )}
      </div>

      {/* 댓글 비용 */}
      <div className="squid-input-group">
        <label className="squid-input-label">
          Comment Cost
          <span className="squid-input-hint">
            댓글 1개당 필요한 토큰 수량 설정
          </span>
        </label>
        <div className="squid-input-with-suffix">
          <input
            type="number"
            className={`squid-input ${errors.cost ? "error" : ""}`}
            value={settings.cost}
            onChange={(e) => onChange({ ...settings, cost: e.target.value })}
            placeholder="100"
            min="1"
          />
          <span className="squid-input-suffix">{tokenSymbol}</span>
        </div>
        {errors.cost && (
          <span className="squid-input-error">{errors.cost}</span>
        )}
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
            className={`squid-input ${errors.time ? "error" : ""}`}
            value={settings.time}
            onChange={(e) => onChange({ ...settings, time: e.target.value })}
            placeholder="60"
            min="1"
          />
          <span className="squid-input-suffix">분</span>
        </div>
        <div className="squid-time-presets">
          <button
            type="button"
            onClick={() => onChange({ ...settings, time: "5" })}
          >
            5분
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...settings, time: "30" })}
          >
            30분
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...settings, time: "60" })}
          >
            1시간
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...settings, time: "1440" })}
          >
            1일
          </button>
        </div>
        {errors.time && (
          <span className="squid-input-error">{errors.time}</span>
        )}
      </div>

      {/* 첫 댓글 */}
      <div className="squid-input-group">
        <label className="squid-input-label">
          First Comment
          <span className="squid-input-hint">
            게임 생성과 함께 작성할 첫 댓글
          </span>
        </label>
        <textarea
          className={`squid-textarea ${errors.firstComment ? "error" : ""}`}
          value={settings.firstComment}
          onChange={(e) =>
            onChange({ ...settings, firstComment: e.target.value })
          }
          placeholder="게임을 시작합니다! 마지막 댓글 작성자가 상금을 가져갑니다."
          rows={3}
        />
        {errors.firstComment && (
          <span className="squid-input-error">{errors.firstComment}</span>
        )}

        {/* 이미지 업로드 */}
        <div className="squid-image-upload">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />
          {settings.firstCommentImage ? (
            <div className="squid-image-preview">
              <img src={settings.firstCommentImage} alt="Preview" />
              <button
                type="button"
                className="squid-image-remove"
                onClick={handleRemoveImage}
                disabled={isUploading}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="squid-image-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "📷 Add Image"}
            </button>
          )}
        </div>
      </div>

      <div className="squid-button-group">
        <button type="button" className="squid-btn-secondary" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="squid-btn-primary"
          onClick={handleNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
