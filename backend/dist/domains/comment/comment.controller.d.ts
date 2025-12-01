import { CommentService } from './comment.service';
export declare class CommentController {
    private readonly commentService;
    constructor(commentService: CommentService);
    createComment(body: unknown): Promise<import("../../common/types").Result<{
        id: number;
    }>>;
    getCommentsByGame(gameAddress: string): Promise<{
        success: false;
        errorMessage: string;
    } | {
        success: true;
        data: unknown;
    }>;
    toggleLike(commentId: number, userAddress: string): Promise<import("../../common/types").Result<import("./comment.repository").ToggleLikeResult>>;
    getLikeCount(commentId: number): Promise<import("../../common/types").Result<import("./comment.repository").LikeCountResult>>;
    checkUserLiked(commentId: number, userAddress: string): Promise<import("../../common/types").Result<import("./comment.repository").UserLikedResult>>;
}
