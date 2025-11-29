import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/common/db/db.module';
import * as schema from 'src/common/db/schema';
import { Result } from 'src/common/types';

type ToggleLikeData = { liked: boolean; likeCount: number };
type LikeCountData = { likeCount: number };
type UserLikedData = { liked: boolean };

@Injectable()
export class CommentService {
    private readonly logger = new Logger(CommentService.name);

    constructor(
        @Inject(DrizzleAsyncProvider)
        private readonly db: NodePgDatabase<typeof schema>,
    ) {}

    /**
     * @description 좋아요 토글 (이미 눌렀으면 취소, 안눌렀으면 추가)
     */
    async toggleLike(
        userAddress: string,
        commentId: number,
    ): Promise<Result<ToggleLikeData>> {
        try {
            const normalizedAddress = userAddress.toLowerCase();

            // 댓글 존재 여부 확인
            const [comment] = await this.db
                .select({ id: schema.comments.id })
                .from(schema.comments)
                .where(eq(schema.comments.id, commentId))
                .limit(1);

            if (!comment) {
                return Result.fail('댓글을 찾을 수 없습니다');
            }

            const data = await this.db.transaction(async (tx) => {
                // 1. 기존 좋아요 확인
                const existingLike = await tx
                    .select()
                    .from(schema.commentLikes)
                    .where(
                        and(
                            eq(schema.commentLikes.commentId, commentId),
                            eq(
                                schema.commentLikes.userAddress,
                                normalizedAddress,
                            ),
                        ),
                    )
                    .limit(1);

                let liked: boolean;

                if (existingLike.length > 0) {
                    // 2a. 이미 좋아요 눌렀으면 -> 취소
                    await tx
                        .delete(schema.commentLikes)
                        .where(
                            and(
                                eq(schema.commentLikes.commentId, commentId),
                                eq(
                                    schema.commentLikes.userAddress,
                                    normalizedAddress,
                                ),
                            ),
                        );

                    await tx
                        .update(schema.comments)
                        .set({
                            likeCount: sql`${schema.comments.likeCount} - 1`,
                        })
                        .where(eq(schema.comments.id, commentId));

                    liked = false;
                    this.logger.log(
                        `좋아요 취소: 댓글 ${commentId}, 사용자 ${normalizedAddress}`,
                    );
                } else {
                    // 2b. 좋아요 안눌렀으면 -> 추가
                    await tx.insert(schema.commentLikes).values({
                        commentId,
                        userAddress: normalizedAddress,
                    });

                    await tx
                        .update(schema.comments)
                        .set({
                            likeCount: sql`${schema.comments.likeCount} + 1`,
                        })
                        .where(eq(schema.comments.id, commentId));

                    liked = true;
                    this.logger.log(
                        `좋아요 추가: 댓글 ${commentId}, 사용자 ${normalizedAddress}`,
                    );
                }

                // 3. 최신 좋아요 수 조회
                const [updatedComment] = await tx
                    .select({ likeCount: schema.comments.likeCount })
                    .from(schema.comments)
                    .where(eq(schema.comments.id, commentId));

                return {
                    liked,
                    likeCount: updatedComment?.likeCount ?? 0,
                };
            });

            return Result.ok(data);
        } catch (error) {
            this.logger.error(`좋아요 토글 실패: ${error.message}`);
            return Result.fail('좋아요 처리 중 오류가 발생했습니다');
        }
    }

    /**
     * @description 댓글의 좋아요 수 조회
     */
    async getLikeCount(commentId: number): Promise<Result<LikeCountData>> {
        try {
            const [comment] = await this.db
                .select({ likeCount: schema.comments.likeCount })
                .from(schema.comments)
                .where(eq(schema.comments.id, commentId));

            if (!comment) {
                return Result.fail('댓글을 찾을 수 없습니다');
            }

            return Result.ok({ likeCount: comment.likeCount });
        } catch (error) {
            this.logger.error(`좋아요 수 조회 실패: ${error.message}`);
            return Result.fail('좋아요 수 조회 중 오류가 발생했습니다');
        }
    }

    /**
     * @description 사용자가 해당 댓글에 좋아요를 눌렀는지 확인
     */
    async hasUserLiked(
        userAddress: string,
        commentId: number,
    ): Promise<Result<UserLikedData>> {
        try {
            const normalizedAddress = userAddress.toLowerCase();

            const [like] = await this.db
                .select()
                .from(schema.commentLikes)
                .where(
                    and(
                        eq(schema.commentLikes.commentId, commentId),
                        eq(schema.commentLikes.userAddress, normalizedAddress),
                    ),
                )
                .limit(1);

            return Result.ok({ liked: !!like });
        } catch (error) {
            this.logger.error(`좋아요 여부 확인 실패: ${error.message}`);
            return Result.fail('좋아요 여부 확인 중 오류가 발생했습니다');
        }
    }

    /**
     * @description 여러 댓글에 대한 사용자 좋아요 여부 일괄 조회
     */
    async getUserLikedMap(
        userAddress: string,
        commentIds: number[],
    ): Promise<Result<Map<number, boolean>>> {
        try {
            if (commentIds.length === 0) {
                return Result.ok(new Map());
            }

            const normalizedAddress = userAddress.toLowerCase();

            const likes = await this.db
                .select({ commentId: schema.commentLikes.commentId })
                .from(schema.commentLikes)
                .where(eq(schema.commentLikes.userAddress, normalizedAddress));

            const likedSet = new Set(likes.map((l) => l.commentId));

            const result = new Map<number, boolean>();
            for (const id of commentIds) {
                result.set(id, likedSet.has(id));
            }

            return Result.ok(result);
        } catch (error) {
            this.logger.error(`좋아요 일괄 조회 실패: ${error.message}`);
            return Result.fail('좋아요 일괄 조회 중 오류가 발생했습니다');
        }
    }
}
