import {
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
import { CommentService } from './comment.service';

@ApiTags('Comments')
@Controller('/v1/comments')
export class CommentController {
    constructor(private readonly commentService: CommentService) {}

    /**
     * 프론트엔드에서 트랜잭션 완료 후 댓글 데이터 저장
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createComment(@Body() body: unknown) {
        return this.commentService.createComment(body);
    }

    @Get('game/:gameAddress')
    async getCommentsByGame(@Param('gameAddress') gameAddress: string) {
        return this.commentService.getCommentsByGame(gameAddress);
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
