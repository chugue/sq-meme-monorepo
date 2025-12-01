import { Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/common/types';
import {
    CommentRepository,
    ToggleLikeResult,
    LikeCountResult,
    UserLikedResult,
} from './comment.repository';

@Injectable()
export class CommentService {
    private readonly logger = new Logger(CommentService.name);

    constructor(private readonly commentRepository: CommentRepository) {}

    /**
     * @description 게임 주소로 댓글 목록 조회
     */
    async getCommentsByGame(gameAddress: string) {
        try {
            const comments = await this.commentRepository.findByGameAddress(gameAddress);
            return Result.ok({ comments });
        } catch (error) {
            this.logger.error(`Get comments by game failed: ${error.message}`);
            return Result.fail('Failed to get comments');
        }
    }

    async toggleLike(
        userAddress: string,
        commentId: number,
    ): Promise<Result<ToggleLikeResult>> {
        try {
            const normalizedAddress = userAddress.toLowerCase();

            const comment = await this.commentRepository.findById(commentId);
            if (!comment) {
                return Result.fail('Comment not found');
            }

            const data = await this.commentRepository.toggleLike(
                commentId,
                normalizedAddress,
            );

            this.logger.log(
                `Like ${data.liked ? 'added' : 'removed'}: comment ${commentId}, user ${normalizedAddress}`,
            );

            return Result.ok(data);
        } catch (error) {
            this.logger.error(`Toggle like failed: ${error.message}`);
            return Result.fail('Failed to toggle like');
        }
    }

    async getLikeCount(commentId: number): Promise<Result<LikeCountResult>> {
        try {
            const result = await this.commentRepository.getLikeCount(commentId);

            if (!result) {
                return Result.fail('Comment not found');
            }

            return Result.ok(result);
        } catch (error) {
            this.logger.error(`Get like count failed: ${error.message}`);
            return Result.fail('Failed to get like count');
        }
    }

    async hasUserLiked(
        userAddress: string,
        commentId: number,
    ): Promise<Result<UserLikedResult>> {
        try {
            const normalizedAddress = userAddress.toLowerCase();
            const result = await this.commentRepository.hasUserLiked(
                commentId,
                normalizedAddress,
            );

            return Result.ok(result);
        } catch (error) {
            this.logger.error(`Check user liked failed: ${error.message}`);
            return Result.fail('Failed to check like status');
        }
    }

    async getUserLikedMap(
        userAddress: string,
        commentIds: number[],
    ): Promise<Result<Map<number, boolean>>> {
        try {
            const normalizedAddress = userAddress.toLowerCase();
            const result = await this.commentRepository.getUserLikedMap(
                normalizedAddress,
                commentIds,
            );

            return Result.ok(result);
        } catch (error) {
            this.logger.error(`Get user liked map failed: ${error.message}`);
            return Result.fail('Failed to get like map');
        }
    }

    /**
     * @description 프론트엔드에서 전송한 댓글 데이터를 저장
     */
    async createComment(data: unknown): Promise<Result<{ id: number }>> {
        try {
            const result = await this.commentRepository.createFromFrontend(data);

            if (!result) {
                return Result.fail('댓글 저장에 실패했습니다.');
            }

            return Result.ok(result);
        } catch (error) {
            this.logger.error(`Create comment failed: ${error.message}`);
            return Result.fail('댓글 저장에 실패했습니다.');
        }
    }
}
