import { CommentService } from './comment.service';
export declare class CommentController {
    private readonly commentService;
    constructor(commentService: CommentService);
    toggleLike(commentId: number, userAddress: string): Promise<import("../../common/types").Result<{
        liked: boolean;
        likeCount: number;
    }>>;
    getLikeCount(commentId: number): Promise<import("../../common/types").Result<{
        likeCount: number;
    }>>;
    checkUserLiked(commentId: number, userAddress: string): Promise<import("../../common/types").Result<{
        liked: boolean;
    }>>;
}
