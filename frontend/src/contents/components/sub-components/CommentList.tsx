import { Comment } from '../../types/comment';
import { formatAddress, formatRelativeTime } from '../../utils/messageFormatter';

interface CommentListProps {
    comments: Comment[];
    isLoading: boolean;
}

export function CommentList({ comments, isLoading }: CommentListProps) {
    if (isLoading) {
        return <div className="squid-comment-loading">LOADING...</div>;
    }

    if (comments.length === 0) {
        return <div className="squid-comment-empty">NO COMMENTS YET. BE THE FIRST!</div>;
    }

    return (
        <>
            {comments.map((comment) => (
                <div key={comment.id} className="squid-comment-item">
                    <div className="squid-comment-content">{comment.message}</div>
                    <div className="squid-comment-meta">
                        <span className="squid-comment-address">
                            {formatAddress(comment.commentor)}
                        </span>
                        <span className="squid-comment-date">
                            {formatRelativeTime(comment.createdAt)}
                        </span>
                    </div>
                </div>
            ))}
        </>
    );
}
