import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { EthereumProvider } from 'src/common/providers';
import { Result } from 'src/common/types';
import { CreateCommentDto } from 'src/common/validator/comment.validator';
import { QuestRepository } from '../quests/quest.repository';
import { UsersRepository } from '../users/users.repository';
import {
    CommentRepository,
    LikeCountResult,
    ToggleLikeResult,
    UserLikedResult,
} from './comment.repository';
import { CommentListRespDto } from './dto/comment.dto';

// CommentAdded 이벤트 시그니처 (V3)
const COMMENT_ADDED_EVENT =
    'event CommentAdded(uint256 indexed gameId, uint256 indexed commentId, address indexed commentor, uint256 cost, string message, uint256 newEndTime, uint256 totalFunding, uint256 timestamp)';

@Injectable()
export class CommentService {
    private readonly logger = new Logger(CommentService.name);
    private readonly commentAddedIface: ethers.Interface;
    private readonly contractAddress: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly ethereumProvider: EthereumProvider,
        private readonly commentRepository: CommentRepository,
        private readonly usersRepository: UsersRepository,
        private readonly questRepository: QuestRepository,
    ) {
        this.commentAddedIface = new ethers.Interface([COMMENT_ADDED_EVENT]);
        this.contractAddress =
            this.configService.get<string>('COMMENT_GAME_V3_ADDRESS') || '';
    }

    /**
     * @description 게임 ID로 댓글 목록 조회 (사용자 좋아요 여부 포함)
     */
    async getCommentsByGameId(
        gameId: string,
        userAddress: string | null,
    ): Promise<Result<CommentListRespDto>> {
        try {
            const comments =
                await this.commentRepository.findByGameIdWithUserInfo(gameId);

            // 사용자 총 펀딩 금액 조회
            let userTotalFunding = '0';
            if (userAddress) {
                const normalizedAddress = userAddress.toLowerCase();
                userTotalFunding =
                    await this.commentRepository.getUserFundingByGameId(
                        gameId,
                        normalizedAddress,
                    );
            }

            // 좋아요 여부 조회
            const commentIds = comments.map((c) => c.comment.id);
            let likedMap = new Map<number, boolean>();
            if (userAddress && commentIds.length > 0) {
                likedMap = await this.commentRepository.getUserLikedMap(
                    userAddress.toLowerCase(),
                    commentIds,
                );
            }

            const commentsListDTO = comments.map((c) => ({
                comment: c.comment,
                commentorProfileUrl: c.commentorProfileUrl ?? '',
                userName: c.userName ?? '',
                hasUserLiked: likedMap.get(c.comment.id) ?? false,
            }));

            return Result.ok({ userTotalFunding, commentsListDTO });
        } catch (error) {
            this.logger.error(`Get comments by game failed: ${error.message}`);
            return Result.fail(
                '댓글 조회에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
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
                return Result.fail(
                    '댓글을 찾을 수 없습니다',
                    HttpStatus.NOT_FOUND,
                );
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
            return Result.fail(
                '좋아요 처리에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getLikeCount(commentId: number): Promise<Result<LikeCountResult>> {
        try {
            const result = await this.commentRepository.getLikeCount(commentId);

            if (!result) {
                return Result.fail(
                    '댓글을 찾을 수 없습니다',
                    HttpStatus.NOT_FOUND,
                );
            }

            return Result.ok(result);
        } catch (error) {
            this.logger.error(`Get like count failed: ${error.message}`);
            return Result.fail(
                '좋아요 수 조회에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
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
            return Result.fail(
                '좋아요 상태 확인에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
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
            return Result.fail(
                '좋아요 맵 조회에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * @description 트랜잭션 해시로 CommentAdded 이벤트를 파싱하여 댓글 저장
     */
    async createComment(
        dto: CreateCommentDto,
    ): Promise<Result<{ id: number; newEndTime: string }>> {
        try {
            // 1. 중복 체크
            const existing = await this.commentRepository.findByTxHash(
                dto.txHash,
            );
            if (existing) {
                this.logger.warn(`중복 댓글 요청: txHash ${dto.txHash}`);
                return Result.fail(
                    '이미 처리된 댓글입니다.',
                    HttpStatus.CONFLICT,
                );
            }

            // 2. 트랜잭션 영수증 조회
            const receipt = await this.ethereumProvider.getTransactionReceipt(
                dto.txHash,
            );

            if (!receipt) {
                return Result.fail(
                    '트랜잭션을 찾을 수 없습니다.',
                    HttpStatus.NOT_FOUND,
                );
            }

            if (receipt.status === 0) {
                return Result.fail(
                    '트랜잭션이 실패했습니다.',
                    HttpStatus.UNPROCESSABLE_ENTITY,
                );
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
                return Result.fail(
                    'CommentAdded 이벤트를 찾을 수 없습니다.',
                    HttpStatus.NOT_FOUND,
                );
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
            const totalFunding = rawEvent.totalFunding.toString();
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
                prizePool: totalFunding,
                timestamp,
            });

            if (!result) {
                return Result.fail(
                    '댓글 저장에 실패했습니다.',
                    HttpStatus.INTERNAL_SERVER_ERROR,
                );
            }

            // 사용자 totalComments 업데이트 및 퀘스트 업데이트
            // 실제 댓글 수를 count해서 정확하게 업데이트
            const actualCommentCount =
                await this.commentRepository.getUsersCommentsCount(commentor);

            await this.usersRepository.updateTotalCommentsWithCount(
                commentor,
                actualCommentCount,
            );
            await this.questRepository.updateCommentQuestsForUser(
                commentor,
                actualCommentCount,
            );

            return Result.ok({ id: result.id, newEndTime });
        } catch (error) {
            this.logger.error(`Create comment failed: ${error.message}`);
            return Result.fail(
                '댓글 저장에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
