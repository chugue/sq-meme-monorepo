import { Heart } from "lucide-react";
import { Comment } from "../../types/comment";
import {
    formatAddress,
    formatRelativeTime,
} from "../../utils/messageFormatter";
import winnerBadge from "./assets/winner-badge.svg";

interface CommentListProps {
    comments: Comment[];
    isLoading: boolean;
    onToggleLike?: (commentId: number) => void;
    isTogglingLike?: boolean;
}

export function CommentList({
    comments,
    isLoading,
    onToggleLike,
    isTogglingLike,
}: CommentListProps) {
    if (isLoading) {
        return <div className="squid-comment-loading">LOADING...</div>;
    }

    if (comments.length === 0) {
        return (
            <div className="squid-comment-empty">
                NO COMMENTS YET. BE THE FIRST!
            </div>
        );
    }

    return (
        <>
            {comments.map((comment, index) => (
                <div
                    key={comment.id}
                    className={`squid-comment-item${index === 0 ? " squid-comment-winner" : ""}`}
                >
                    {/* 첫 번째 댓글에 우승자 뱃지 표시 */}
                    {index === 0 && (
                        <img
                            src={winnerBadge}
                            alt="Winner"
                            className="squid-winner-badge"
                        />
                    )}
                    <div className="squid-comment-header-row">
                        <div className="squid-comment-profile">
                            {comment.profileImage ? (
                                <img
                                    src={comment.profileImage}
                                    alt="Profile"
                                    className="squid-comment-avatar"
                                />
                            ) : (
                                <div className="squid-comment-avatar-placeholder" />
                            )}
                        </div>
                        <div className="squid-comment-info-container">
                            <div className="squid-comment-info">
                                <div className="squid-comment-info-column">
                                    <div className="squid-comment-info-row">
                                        <div className="squid-comment-username-colum">
                                            <div className="squid-comment-username-row">
                                                <span className="squid-comment-username">
                                                    @
                                                    {comment.username ||
                                                        formatAddress(
                                                            comment.commentor,
                                                        )}
                                                </span>
                                                <span className="squid-comment-date">
                                                    {formatRelativeTime(
                                                        comment.createdAt,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="squid-comment-content">
                                                {comment.message}
                                            </div>
                                        </div>
                                        <button
                                            className={`squid-comment-like${comment.isLiked ? " liked" : ""
                                                }`}
                                            onClick={() =>
                                                !isTogglingLike &&
                                                onToggleLike?.(comment.id)
                                            }
                                            disabled={isTogglingLike}
                                            type="button"
                                        >
                                            <div className="squid-comment-heart-icon">
                                                <Heart
                                                    size={20}
                                                    fill={
                                                        comment.isLiked
                                                            ? "#b9a7ff"
                                                            : "none"
                                                    }
                                                    stroke="#b9a7ff"
                                                    strokeWidth={1.5}
                                                    className="squid-heart-svg"
                                                />
                                                <span className="squid-comment-heart-count-value">
                                                    {comment.likeCount}
                                                </span>
                                            </div>
                                        </button>
                                    </div>
                                    {comment.imageUrl && (
                                        <div className="squid-comment-image-wrapper">
                                            <img
                                                src={comment.imageUrl}
                                                alt="Comment image"
                                                className="squid-comment-image-preview"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}
