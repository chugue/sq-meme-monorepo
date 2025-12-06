import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
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
    tokenSymbol?: string;
    commentCost?: string;
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
    tokenSymbol,
    commentCost,
}: CommentFormProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getButtonText = () => {
        if (!isConnected) return "CONNECT WALLET FIRST";
        if (isSigning) return "SIGNING...";
        if (isSubmitting) return "SUBMITTING...";
        if (tokenSymbol && commentCost) {
            return `SUBMIT (${commentCost} $${tokenSymbol})`;
        }
        return "SUBMIT";
    };

    const handleImageUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
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
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }}
            className="squid-comment-form"
        >
            <div className="squid-comment-card">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Join this game with comment!"
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

                {/* 이미지 추가 버튼 - 텍스트필드 아래 왼쪽 (이미지가 없을 때만 표시) */}
                {onImageChange && !imageUrl && (
                    <button
                        type="button"
                        className="squid-comment-add-image-inline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isDisabled || isUploading}
                    >
                        {isUploading ? (
                            <span className="squid-upload-spinner" />
                        ) : (
                            <ImagePlus size={18} />
                        )}
                    </button>
                )}
            </div>

            {/* Submit 버튼 - block */}
            <button
                type="submit"
                className="squid-comment-submit-block"
                disabled={
                    !value.trim() || isSubmitting || isSigning || disabled
                }
            >
                {getButtonText()}
            </button>
        </form>
    );
}
