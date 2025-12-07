import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/common/db/db.module';
import * as schema from 'src/common/db/schema';
import { ActiveGameBaseDto } from '../game/dto/game.dto';

export type ToggleLikeResult = { liked: boolean; likeCount: number };
export type LikeCountResult = { likeCount: number };
export type UserLikedResult = { liked: boolean };

@Injectable()
export class CommentRepository {
    private readonly logger = new Logger(CommentRepository.name);

    constructor(
        @Inject(DrizzleAsyncProvider)
        private readonly db: NodePgDatabase<typeof schema>,
    ) {}

    /**
     * @description 특정 사용자의 총 댓글 수 조회 (최대 50)
     */
    async getUsersCommentsCount(commentor: string): Promise<number> {
        const results = await this.db
            .select({ id: schema.comments.id })
            .from(schema.comments)
            .where(eq(schema.comments.commentor, commentor.toLowerCase()))
            .limit(50);

        return results.length;
    }

    /**
     * @description 게임 ID로 댓글 목록 조회
     */
    async findByGameId(gameId: string) {
        return await this.db
            .select()
            .from(schema.comments)
            .where(eq(schema.comments.gameId, gameId))
            .orderBy(desc(schema.comments.createdAt));
    }

    /**
     * @description 게임 ID로 댓글 목록 + 사용자 정보 조회
     */
    async findByGameIdWithUserInfo(gameId: string) {
        return await this.db
            .select({
                comment: schema.comments,
                commentorProfileUrl: schema.users.profileImage,
                userName: schema.users.userName,
            })
            .from(schema.comments)
            .leftJoin(
                schema.users,
                eq(schema.comments.commentor, schema.users.walletAddress),
            )
            .where(eq(schema.comments.gameId, gameId))
            .orderBy(desc(schema.comments.createdAt));
    }

    /**
     * @description 게임의 총 펀딩 금액 조회 (games 테이블)
     */
    async getTotalFundingByGameId(gameId: string): Promise<string> {
        const [result] = await this.db
            .select({ totalFunding: schema.games.totalFunding })
            .from(schema.games)
            .where(eq(schema.games.gameId, gameId))
            .limit(1);

        return result?.totalFunding ?? '0';
    }

    /**
     * @description 특정 사용자의 게임 펀딩 금액 조회
     */
    async getUserFundingByGameId(
        gameId: string,
        userAddress: string,
    ): Promise<string> {
        const [result] = await this.db
            .select({ totalFunding: schema.funders.totalFunding })
            .from(schema.funders)
            .where(
                and(
                    eq(schema.funders.gameId, gameId),
                    eq(schema.funders.funderAddress, userAddress),
                ),
            )
            .limit(1);

        return result?.totalFunding ?? '0';
    }

    /**
     * @description 댓글 존재 여부 확인
     */
    async findById(commentId: number): Promise<{ id: number } | null> {
        const [comment] = await this.db
            .select({ id: schema.comments.id })
            .from(schema.comments)
            .where(eq(schema.comments.id, commentId))
            .limit(1);

        return comment ?? null;
    }

    /**
     * @description 좋아요 토글 (이미 눌렀으면 취소, 안눌렀으면 추가)
     */
    async toggleLike(
        commentId: number,
        userAddress: string,
    ): Promise<ToggleLikeResult> {
        return await this.db.transaction(async (tx) => {
            const existingLike = await tx
                .select()
                .from(schema.commentLikes)
                .where(
                    and(
                        eq(schema.commentLikes.commentId, commentId),
                        eq(schema.commentLikes.userAddress, userAddress),
                    ),
                )
                .limit(1);

            let liked: boolean;

            if (existingLike.length > 0) {
                await tx
                    .delete(schema.commentLikes)
                    .where(
                        and(
                            eq(schema.commentLikes.commentId, commentId),
                            eq(schema.commentLikes.userAddress, userAddress),
                        ),
                    );

                await tx
                    .update(schema.comments)
                    .set({
                        likeCount: sql`GREATEST(COALESCE(${schema.comments.likeCount}, 0) - 1, 0)`,
                    })
                    .where(eq(schema.comments.id, commentId));

                liked = false;
            } else {
                await tx.insert(schema.commentLikes).values({
                    commentId,
                    userAddress,
                });

                await tx
                    .update(schema.comments)
                    .set({ likeCount: sql`${schema.comments.likeCount} + 1` })
                    .where(eq(schema.comments.id, commentId));

                liked = true;
            }

            const [updatedComment] = await tx
                .select({ likeCount: schema.comments.likeCount })
                .from(schema.comments)
                .where(eq(schema.comments.id, commentId));

            return { liked, likeCount: updatedComment?.likeCount ?? 0 };
        });
    }

    /**
     * @description 댓글의 좋아요 수 조회
     */
    async getLikeCount(commentId: number): Promise<LikeCountResult | null> {
        const [comment] = await this.db
            .select({ likeCount: schema.comments.likeCount })
            .from(schema.comments)
            .where(eq(schema.comments.id, commentId));

        return comment ?? null;
    }

    /**
     * @description 사용자가 해당 댓글에 좋아요를 눌렀는지 확인
     */
    async hasUserLiked(
        commentId: number,
        userAddress: string,
    ): Promise<UserLikedResult> {
        const [like] = await this.db
            .select()
            .from(schema.commentLikes)
            .where(
                and(
                    eq(schema.commentLikes.commentId, commentId),
                    eq(schema.commentLikes.userAddress, userAddress),
                ),
            )
            .limit(1);

        return { liked: !!like };
    }

    /**
     * @description 여러 댓글에 대한 사용자 좋아요 여부 일괄 조회
     */
    async getUserLikedMap(
        userAddress: string,
        commentIds: number[],
    ): Promise<Map<number, boolean>> {
        if (commentIds.length === 0) {
            return new Map();
        }

        const likes = await this.db
            .select({ commentId: schema.commentLikes.commentId })
            .from(schema.commentLikes)
            .where(eq(schema.commentLikes.userAddress, userAddress));

        const likedSet = new Set(likes.map((l) => l.commentId));

        const result = new Map<number, boolean>();
        for (const id of commentIds) {
            result.set(id, likedSet.has(id));
        }

        return result;
    }

    /**
     * @description 이벤트에서 파싱된 댓글 데이터를 저장
     * @returns 생성된 댓글 ID 또는 null (실패 시)
     */
    async createFromEvent(dto: {
        txHash: string;
        gameId: string;
        commentor: string;
        message: string;
        imageUrl?: string;
        newEndTime: string;
        prizePool: string;
        timestamp: string;
    }): Promise<{ id: number } | null> {
        try {
            const comment = await this.db.transaction(async (tx) => {
                // 1. 댓글 저장
                const [inserted] = await tx
                    .insert(schema.comments)
                    .values({
                        txHash: dto.txHash,
                        gameId: dto.gameId,
                        commentor: dto.commentor,
                        message: dto.message,
                        imageUrl: dto.imageUrl,
                        createdAt: new Date(Number(dto.timestamp) * 1000),
                        endTime: new Date(Number(dto.newEndTime) * 1000),
                    })
                    .returning({ id: schema.comments.id });

                // 2. 게임 상태 업데이트 (gameId로 조회)
                await tx
                    .update(schema.games)
                    .set({
                        endTime: new Date(Number(dto.newEndTime) * 1000),
                        prizePool: dto.prizePool,
                        lastCommentor: dto.commentor,
                    })
                    .where(eq(schema.games.gameId, dto.gameId));

                return inserted;
            });

            this.logger.log(`댓글 저장 완료: 게임 ID ${dto.gameId}`);
            return { id: comment.id };
        } catch (error) {
            this.logger.error(`댓글 저장 실패: ${error.message}`);
            return null;
        }
    }

    /**
     * @description txHash로 댓글 조회
     */
    async findByTxHash(txHash: string): Promise<{ id: number } | null> {
        const [comment] = await this.db
            .select({ id: schema.comments.id })
            .from(schema.comments)
            .where(eq(schema.comments.txHash, txHash))
            .limit(1);

        return comment ?? null;
    }

    /**
     * @description 지갑 주소로 댓글 수 조회
     */
    async countByWalletAddress(walletAddress: string): Promise<number> {
        const [result] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(schema.comments)
            .where(eq(schema.comments.commentor, walletAddress.toLowerCase()));

        return Number(result?.count ?? 0);
    }

    /**
     * @description 지갑 주소로 참여한 게임 ID 목록 조회 (중복 제거)
     */
    async findGameIdsByWalletAddress(walletAddress: string): Promise<string[]> {
        const results = await this.db
            .selectDistinct({ gameId: schema.comments.gameId })
            .from(schema.comments)
            .where(eq(schema.comments.commentor, walletAddress.toLowerCase()));

        return results.map((r) => r.gameId);
    }

    /**
     * @description 지갑 주소로 참여한 활성 게임 목록 조회 (isEnded=false, isClaimed=false)
     */
    async findActiveGamesByWalletAddress(
        walletAddress: string,
    ): Promise<ActiveGameBaseDto[]> {
        const results = await this.db
            .selectDistinct({
                gameId: schema.games.gameId,
                tokenAddress: schema.games.gameToken,
                currentPrizePool: schema.games.prizePool,
                endTime: schema.games.endTime,
            })
            .from(schema.comments)
            .innerJoin(
                schema.games,
                eq(schema.comments.gameId, schema.games.gameId),
            )
            .where(
                and(
                    eq(schema.comments.commentor, walletAddress.toLowerCase()),
                    eq(schema.games.isEnded, false),
                    eq(schema.games.isClaimed, false),
                ),
            )
            .orderBy(desc(sql`CAST(${schema.games.prizePool} AS NUMERIC)`));

        return results;
    }
}
