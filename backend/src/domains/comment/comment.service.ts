import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { EthereumProvider } from 'src/common/providers';
import { Result } from 'src/common/types';
import { CreateCommentDto } from 'src/common/validator/comment.validator';
import {
    CommentRepository,
    ToggleLikeResult,
    LikeCountResult,
    UserLikedResult,
} from './comment.repository';

// CommentAdded 이벤트 시그니처 (V2)
const COMMENT_ADDED_EVENT =
    'event CommentAdded(uint256 indexed gameId, uint256 indexed commentId, address indexed commentor, string message, uint256 newEndTime, uint256 prizePool, uint256 timestamp)';

@Injectable()
export class CommentService {
    private readonly logger = new Logger(CommentService.name);
    private readonly commentAddedIface: ethers.Interface;
    private readonly contractAddress: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly ethereumProvider: EthereumProvider,
        private readonly commentRepository: CommentRepository,
    ) {
        this.commentAddedIface = new ethers.Interface([COMMENT_ADDED_EVENT]);
        this.contractAddress =
            this.configService.get<string>('COMMENT_GAME_V2_ADDRESS') || '';
    }

    /**
     * @description 게임 ID로 댓글 목록 조회
     */
    async getCommentsByGameId(gameId: string) {
        try {
            const comments = await this.commentRepository.findByGameId(gameId);
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
     * @description 트랜잭션 해시로 CommentAdded 이벤트를 파싱하여 댓글 저장
     */
    async createComment(dto: CreateCommentDto): Promise<Result<{ id: number }>> {
        try {
            // 1. 중복 체크
            const existing = await this.commentRepository.findByTxHash(
                dto.txHash,
            );
            if (existing) {
                this.logger.warn(`중복 댓글 요청: txHash ${dto.txHash}`);
                return Result.ok(existing);
            }

            // 2. 트랜잭션 영수증 조회
            const receipt = await this.ethereumProvider.getTransactionReceipt(
                dto.txHash,
            );

            if (!receipt) {
                return Result.fail('트랜잭션을 찾을 수 없습니다.');
            }

            if (receipt.status === 0) {
                return Result.fail('트랜잭션이 실패했습니다.');
            }

            // 3. CommentAdded 이벤트 찾기
            const commentAddedTopic =
                this.commentAddedIface.getEvent('CommentAdded')?.topicHash;

            const commentLog = receipt.logs.find(
                (log) =>
                    log.topics[0] === commentAddedTopic &&
                    log.address.toLowerCase() ===
                        this.contractAddress.toLowerCase(),
            );

            if (!commentLog) {
                return Result.fail('CommentAdded 이벤트를 찾을 수 없습니다.');
            }

            // 4. 이벤트 디코딩
            const decoded = this.commentAddedIface.decodeEventLog(
                'CommentAdded',
                commentLog.data,
                commentLog.topics,
            );

            const rawEvent = decoded.toObject();
            const gameId = rawEvent.gameId.toString();
            const commentor = rawEvent.commentor as string;
            const message = rawEvent.message as string;
            const newEndTime = rawEvent.newEndTime.toString();
            const prizePool = rawEvent.prizePool.toString();
            const timestamp = rawEvent.timestamp.toString();

            this.logger.log(
                `📝 CommentAdded 파싱: gameId=${gameId}, commentor=${commentor}`,
            );

            // 5. DB 저장
            const result = await this.commentRepository.createFromEvent({
                txHash: dto.txHash,
                gameId,
                commentor: commentor.toLowerCase(),
                message,
                imageUrl: dto.imageUrl,
                newEndTime,
                prizePool,
                timestamp,
            });

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
