interface CommentFormProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => Promise<void>;
    isSubmitting: boolean;
    isSigning: boolean;
    isConnected: boolean;
    disabled?: boolean;
}

export function CommentForm({
    value,
    onChange,
    onSubmit,
    isSubmitting,
    isSigning,
    isConnected,
    disabled,
}: CommentFormProps) {
    const getButtonText = () => {
        if (!isConnected) return 'CONNECT WALLET FIRST';
        if (isSigning) return 'SIGNING...';
        if (isSubmitting) return 'SUBMITTING...';
        return 'SUBMIT';
    };

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="squid-comment-form">
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="TYPE YOUR COMMENT..."
                className="squid-comment-input"
                rows={3}
                disabled={disabled || isSubmitting || isSigning}
            />
            <button
                type="submit"
                className="squid-comment-submit"
                disabled={!value.trim() || isSubmitting || isSigning || !isConnected || disabled}
            >
                {getButtonText()}
            </button>
        </form>
    );
}
