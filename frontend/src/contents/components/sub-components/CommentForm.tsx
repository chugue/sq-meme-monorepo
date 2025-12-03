import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { backgroundApi } from "../../lib/backgroundApi";

interface CommentFormProps {
    value: string;
    onChange: (value: string) => void;
    imageUrl?: string;
    onImageChange?: (url: string | undefined) => void;
    onSubmit: () => Promise<void>;
    isSubmitting: boolean;
    isSigning: boolean;
    isConnected: boolean;
    disabled?: boolean;
}

export function CommentForm({
    value,
    onChange,
    imageUrl,
    onImageChange,
    onSubmit,
    isSubmitting,
    isSigning,
    isConnected,
    disabled,
}: CommentFormProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getButtonText = () => {
        if (!isConnected) return 'CONNECT WALLET FIRST';
        if (isSigning) return 'SIGNING...';
        if (isSubmitting) return 'SUBMITTING...';
        return 'SUBMIT';
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onImageChange) return;

        setIsUploading(true);
        try {
            const { url } = await backgroundApi.uploadImage(file);
            onImageChange(url);
        } catch (error) {
            console.error("이미지 업로드 실패:", error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleRemoveImage = () => {
        onImageChange?.(undefined);
    };

    const isDisabled = disabled || isSubmitting || isSigning;

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="squid-comment-form">
            <div className="squid-comment-card">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="TYPE YOUR COMMENT..."
                    className="squid-comment-input"
                    rows={3}
                    disabled={isDisabled}
                />

                {/* 이미지 업로드 input (숨김) */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                />

                {/* 이미지 미리보기 */}
                {imageUrl && (
                    <div className="squid-comment-image-container">
                        <img
                            src={imageUrl}
                            alt="Preview"
                            className="squid-comment-image"
                        />
                        <button
                            type="button"
                            className="squid-comment-image-remove"
                            onClick={handleRemoveImage}
                            disabled={isDisabled || isUploading}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* 하단 액션 바 */}
                <div className="squid-comment-actions">
                    {onImageChange && (
                        <button
                            type="button"
                            className="squid-comment-add-image"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isDisabled || isUploading}
                        >
                            {isUploading ? (
                                <span className="squid-upload-spinner" />
                            ) : (
                                <ImagePlus size={20} />
                            )}
                        </button>
                    )}
                    <button
                        type="submit"
                        className="squid-comment-submit"
                        disabled={!value.trim() || isSubmitting || isSigning || !isConnected || disabled}
                    >
                        {getButtonText()}
                    </button>
                </div>
            </div>
        </form>
    );
}
