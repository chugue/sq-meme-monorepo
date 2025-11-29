import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/common/db/schema';
import { Result } from 'src/common/types';
type ToggleLikeData = {
    liked: boolean;
    likeCount: number;
};
type LikeCountData = {
    likeCount: number;
};
type UserLikedData = {
    liked: boolean;
};
export declare class CommentService {
    private readonly db;
    private readonly logger;
    constructor(db: NodePgDatabase<typeof schema>);
    toggleLike(userAddress: string, commentId: number): Promise<Result<ToggleLikeData>>;
    getLikeCount(commentId: number): Promise<Result<LikeCountData>>;
    hasUserLiked(userAddress: string, commentId: number): Promise<Result<UserLikedData>>;
    getUserLikedMap(userAddress: string, commentIds: number[]): Promise<Result<Map<number, boolean>>>;
}
export {};
