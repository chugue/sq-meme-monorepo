import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EthereumProvider } from 'src/common/providers';
import { Result } from 'src/common/types';
import { CommentRepository, ToggleLikeResult, LikeCountResult, UserLikedResult } from './comment.repository';
export declare class CommentService implements OnModuleInit, OnModuleDestroy {
    private readonly ethereumProvider;
    private readonly commentRepository;
    private readonly logger;
    private iface;
    private isListening;
    constructor(ethereumProvider: EthereumProvider, commentRepository: CommentRepository);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private startListening;
    private stopListening;
    private handleCommentAddedLog;
    getCommentsByGame(gameAddress: string): Promise<{
        success: false;
        errorMessage: string;
    } | {
        success: true;
        data: unknown;
    }>;
    toggleLike(userAddress: string, commentId: number): Promise<Result<ToggleLikeResult>>;
    getLikeCount(commentId: number): Promise<Result<LikeCountResult>>;
    hasUserLiked(userAddress: string, commentId: number): Promise<Result<UserLikedResult>>;
    getUserLikedMap(userAddress: string, commentIds: number[]): Promise<Result<Map<number, boolean>>>;
}
