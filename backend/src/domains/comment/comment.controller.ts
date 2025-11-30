import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WalletAddress } from 'src/common/decorators';
import { CommentService } from './comment.service';

@ApiTags('Comments')
@Controller('/v1/comments')
export class CommentController {
    constructor(private readonly commentService: CommentService) {}

    @Get('game/:gameAddress')
    async getCommentsByGame(@Param('gameAddress') gameAddress: string) {
        return this.commentService.getCommentsByGame(gameAddress);
    }

    @Post(':id/like')
    // @ApiToggleLike()
    async toggleLike(
        @Param('id', ParseIntPipe) commentId: number,
        @WalletAddress() userAddress: string,
    ) {
        return this.commentService.toggleLike(userAddress, commentId);
    }

    @Get(':id/like/count')
    // @ApiGetLikeCount()
    async getLikeCount(@Param('id', ParseIntPipe) commentId: number) {
        return this.commentService.getLikeCount(commentId);
    }

    @Get(':id/like/check')
    // @ApiCheckUserLiked()
    async checkUserLiked(
        @Param('id', ParseIntPipe) commentId: number,
        @WalletAddress() userAddress: string,
    ) {
        return this.commentService.hasUserLiked(userAddress, commentId);
    }
}
