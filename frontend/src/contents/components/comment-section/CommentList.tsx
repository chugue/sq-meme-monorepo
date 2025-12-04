import { Comment } from "../../types/comment";
import {
  formatAddress,
  formatRelativeTime,
} from "../../utils/messageFormatter";

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
      <div className="squid-comment-empty">NO COMMENTS YET. BE THE FIRST!</div>
    );
  }

  return (
    <>
      {comments.map((comment) => (
        <div key={comment.id} className="squid-comment-item">
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
            <div className="squid-comment-info">
              <span className="squid-comment-username">
                @{comment.username || formatAddress(comment.commentor)}
              </span>
              <span className="squid-comment-date">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>
            <button
              className={`squid-comment-like${comment.isLiked ? " liked" : ""}`}
              onClick={() => !isTogglingLike && onToggleLike?.(comment.id)}
              disabled={isTogglingLike}
              type="button"
            >
              <span className="squid-comment-like-icon">&#10084;</span>
              <span className="squid-comment-like-count">
                {comment.likeCount ?? 0}
              </span>
            </button>
          </div>
          <div className="squid-comment-body">
            <div className="squid-comment-content">{comment.message}</div>
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
      ))}
    </>
  );
}
