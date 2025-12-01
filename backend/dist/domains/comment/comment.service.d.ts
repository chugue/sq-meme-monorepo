import { Result } from 'src/common/types';
import { CommentRepository, ToggleLikeResult, LikeCountResult, UserLikedResult } from './comment.repository';
export declare class CommentService {
    private readonly commentRepository;
    private readonly logger;
    constructor(commentRepository: CommentRepository);
    getCommentsByGame(gameAddress: string): Promise<{
        success: false;
        errorMessage: string;
    } | {
        success: true;
        data: unknown;
    }>;
    toggleLike(userAddress: string, commentId: number): Promise<Result<ToggleLikeResult>>;
    getLikeCount(commentId: number): Promise<Result<LikeCountResult>>;
    hasUserLiked(userAddress: string, commentId: number): Promise<Result<UserLikedResult>>;
    getUserLikedMap(userAddress: string, commentIds: number[]): Promise<Result<Map<number, boolean>>>;
    createComment(data: unknown): Promise<Result<{
        id: number;
    }>>;
}
