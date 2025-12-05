import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WalletAddress } from 'src/common/decorators';
import { CreateCommentDtoSchema } from 'src/common/validator/comment.validator';
import { CommentService } from './comment.service';

@ApiTags('Comments')
@Controller('/v1/comments')
export class CommentController {
    constructor(private readonly commentService: CommentService) {}

    /**
     * 트랜잭션 해시로 CommentAdded 이벤트를 파싱하여 댓글 저장
     * @body { txHash: string, imageUrl?: string }
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createComment(@Body() body: unknown) {
        const result = CreateCommentDtoSchema.safeParse(body);
        if (!result.success) {
            throw new BadRequestException(result.error.message);
        }
        return this.commentService.createComment(result.data);
    }

    @Get('game/:gameId')
    async getCommentsByGameId(
        @Param('gameId') gameId: string,
        @WalletAddress() userAddress: string | null,
    ) {
        return this.commentService.getCommentsByGameId(gameId, userAddress);
    }

    @Post(':id/like')
    async toggleLike(
        @Param('id', ParseIntPipe) commentId: number,
        @WalletAddress() userAddress: string,
    ) {
        return this.commentService.toggleLike(userAddress, commentId);
    }

    @Get(':id/like/count')
    async getLikeCount(@Param('id', ParseIntPipe) commentId: number) {
        return this.commentService.getLikeCount(commentId);
    }

    @Get(':id/like/check')
    async checkUserLiked(
        @Param('id', ParseIntPipe) commentId: number,
        @WalletAddress() userAddress: string,
    ) {
        return this.commentService.hasUserLiked(userAddress, commentId);
    }
}
