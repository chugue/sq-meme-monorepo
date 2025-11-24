import { useState } from 'react';
import { useComments } from '../hooks/useComments';
import { backgroundApi } from '../lib/backgroundApi';
import './CommentSection.css';

export function CommentSection() {
    console.log('🦑 CommentSection 렌더링', {
        timestamp: new Date().toISOString(),
        location: window.location.href,
    });

    const { comments, isLoading, createComment, isSubmitting } = useComments();
    const [newComment, setNewComment] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            await createComment({
                player_address: '0x0000000000000000000000000000000000000000',
                content: newComment.trim(),
            });
            setNewComment('');
        } catch (error) {
            console.error('댓글 작성 오류:', error);
            alert('댓글 작성에 실패했습니다. 다시 시도해주세요.');
        }
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return '방금 전';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
        return date.toLocaleDateString('ko-KR');
    };

    const handleOpenSidePanel = async () => {
        try {
            await backgroundApi.openSidePanel();
        } catch (error) {
            console.error('사이드 패널 열기 오류:', error);
        }
    };


    // 최소한의 가시성을 위한 폴백
    if (!comments && isLoading === undefined) {
        console.warn('🦑 CommentSection: 데이터 초기화 중...');
    }

    return (
        <div className="squid-comment-section" data-testid="squid-comment-section">
            <div className="squid-comment-header">
                <h3 className="squid-comment-title">💬 COMMENTS</h3>
                <span className="squid-comment-count">{comments.length}</span>
            </div>

            <form onSubmit={handleSubmit} className="squid-comment-form">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="TYPE YOUR COMMENT..."
                    className="squid-comment-input"
                    rows={3}
                    disabled={isSubmitting}
                />
                <button
                    type="submit"
                    className="squid-comment-submit"
                    disabled={!newComment.trim() || isSubmitting}
                >
                    {isSubmitting ? 'SUBMITTING...' : 'SUBMIT'}
                </button>
            </form>

            <div className="squid-comments-list">
                {isLoading ? (
                    <div className="squid-comment-loading">LOADING...</div>
                ) : comments.length === 0 ? (
                    <div className="squid-comment-empty">NO COMMENTS YET. BE THE FIRST!</div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="squid-comment-item">
                            <div className="squid-comment-content">{comment.content}</div>
                            <div className="squid-comment-meta">
                                <span className="squid-comment-address">{formatAddress(comment.player_address)}</span>
                                <span className="squid-comment-date">{formatDate(comment.created_at)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
