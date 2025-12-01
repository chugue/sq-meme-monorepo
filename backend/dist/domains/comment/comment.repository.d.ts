import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from 'src/common/db/schema';
export type ToggleLikeResult = {
    liked: boolean;
    likeCount: number;
};
export type LikeCountResult = {
    likeCount: number;
};
export type UserLikedResult = {
    liked: boolean;
};
export declare class CommentRepository {
    private readonly db;
    private readonly logger;
    constructor(db: NodePgDatabase<typeof schema>);
    findByGameAddress(gameAddress: string): Promise<{
        id: number;
        txHash: string | null;
        gameAddress: string;
        commentor: string;
        message: string;
        likeCount: number;
        endTime: Date;
        currentPrizePool: string;
        isWinnerComment: boolean;
        createdAt: Date;
    }[]>;
    findById(commentId: number): Promise<{
        id: number;
    } | null>;
    toggleLike(commentId: number, userAddress: string): Promise<ToggleLikeResult>;
    getLikeCount(commentId: number): Promise<LikeCountResult | null>;
    hasUserLiked(commentId: number, userAddress: string): Promise<UserLikedResult>;
    getUserLikedMap(userAddress: string, commentIds: number[]): Promise<Map<number, boolean>>;
    createFromFrontend(rawData: unknown): Promise<{
        id: number;
    } | null>;
    findByTxHash(txHash: string): Promise<{
        id: number;
    } | null>;
}
