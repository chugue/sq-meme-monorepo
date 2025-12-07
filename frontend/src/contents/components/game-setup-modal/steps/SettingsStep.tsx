/**
 * Step 2: Game Settings Input Component
 */

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { backgroundApi } from "../../../lib/backgroundApi";
import type { GameSettings } from "../types";

interface SettingsStepProps {
    settings: GameSettings;
    tokenSymbol: string;
    onChange: (settings: GameSettings) => void;
    onNext: () => void;
    onBack: () => void;
}

export function SettingsStep({ settings, tokenSymbol, onChange, onNext, onBack }: SettingsStepProps) {
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
            console.error("Image upload failed:", error);
            setErrors((prev) => ({ ...prev, image: "Failed to upload image" }));
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
            newErrors.initialFunding = "Initial funding must be greater than 0";
        }

        if (!settings.time || Number(settings.time) < 1) {
            newErrors.time = "Timer must be at least 1 minute";
        }

        if (!settings.firstComment.trim()) {
            newErrors.firstComment = "Please enter the first comment";
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

            {/* Initial Funding */}
            <div className="squid-input-group">
                <label className="squid-input-label">
                    Initial Funding
                    <span className="squid-input-hint">Initial token amount for the prize pool</span>
                </label>
                <div className="squid-input-with-suffix">
                    <input
                        className={`squid-input ${errors.initialFunding ? "error" : ""}`}
                        value={settings.initialFunding}
                        onChange={(e) => onChange({ ...settings, initialFunding: e.target.value })}
                        placeholder="1000"
                        min="1"
                    />
                    <span className="squid-input-suffix">{tokenSymbol}</span>
                </div>

                {errors.initialFunding && <span className="squid-input-error">{errors.initialFunding}</span>}
            </div>

            {/* Comment Cost */}
            <div className="squid-input-group">
                <label className="squid-input-label">
                    Comment Cost
                    <span className="squid-input-hint">Auto-calculated as 0.01% of funding</span>
                </label>
                <div className="squid-input-with-suffix">
                    <input className="squid-input readonly" value={Number(settings.initialFunding) / 10000 || 0} readOnly />
                    <span className="squid-input-suffix">{tokenSymbol}</span>
                </div>
            </div>

            {/* Timer */}
            <div className="squid-input-group">
                <label className="squid-input-label">
                    Timer
                    <span className="squid-input-hint">Time until game ends after last comment</span>
                </label>
                <div className="squid-input-with-suffix">
                    <input
                        className={`squid-input ${errors.time ? "error" : ""}`}
                        value={settings.time}
                        onChange={(e) => onChange({ ...settings, time: e.target.value })}
                        placeholder="60"
                        min="1"
                    />
                    <span className="squid-input-suffix">min</span>
                </div>
                <div className="squid-time-presets">
                    <button type="button" onClick={() => onChange({ ...settings, time: "5" })}>
                        5m
                    </button>
                    <button type="button" onClick={() => onChange({ ...settings, time: "30" })}>
                        30m
                    </button>
                    <button type="button" onClick={() => onChange({ ...settings, time: "60" })}>
                        1h
                    </button>
                    <button type="button" onClick={() => onChange({ ...settings, time: "1440" })}>
                        1d
                    </button>
                </div>
                {errors.time && <span className="squid-input-error">{errors.time}</span>}
            </div>

            {/* First Comment */}
            <div className="squid-input-group">
                <label className="squid-input-label">
                    First Comment
                    <span className="squid-input-hint">Your first comment when the game starts</span>
                </label>
                <div className="squid-comment-card">
                    <textarea
                        className={`squid-comment-textarea ${errors.firstComment ? "error" : ""}`}
                        value={settings.firstComment}
                        onChange={(e) => onChange({ ...settings, firstComment: e.target.value })}
                        placeholder="Game starts now! Last commenter takes the prize."
                        rows={2}
                    />

                    {/* Image Preview */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleImageUpload}
                        style={{ display: "none" }}
                    />
                    {settings.firstCommentImage ? (
                        <div className="squid-comment-image-container">
                            <img src={settings.firstCommentImage} alt="Preview" className="squid-comment-image" />
                            <button type="button" className="squid-comment-image-remove" onClick={handleRemoveImage} disabled={isUploading}>
                                ✕
                            </button>
                        </div>
                    ) : null}

                    {/* Action bar - only shown when no image */}
                    {!settings.firstCommentImage && (
                        <div className="squid-comment-actions">
                            <button
                                type="button"
                                className="squid-modal-add-image"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? <span className="squid-upload-spinner" /> : <ImagePlus size={20} />}
                            </button>
                        </div>
                    )}
                </div>
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
