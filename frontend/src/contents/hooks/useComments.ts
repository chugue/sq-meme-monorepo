import { Comment } from '@/contents/types/comment';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useEffect, useRef } from 'react';
import { activeGameInfoAtom } from '../atoms/commentAtoms';
import { backgroundApi } from '../lib/backgroundApi';
import { COMMENT_GAME_V2_ADDRESS } from '../lib/contract/abis/commentGameV2';
import { getCommentsFromBlockchain, type CommentAddedV2Event } from '../lib/contract/eventParser';
import { logger } from '../lib/injected/logger';

/**
 * 블록체인 댓글을 Comment 타입으로 변환
 */
function blockchainCommentToComment(event: CommentAddedV2Event): Comment {
    return {
        id: 0, // 블록체인에서 온 댓글은 DB id가 없음, txHash로 구분
        gameAddress: COMMENT_GAME_V2_ADDRESS,
        commentor: event.commentor,
        message: event.message,
        createdAt: new Date(Number(event.timestamp) * 1000).toISOString(),
        endTime: event.newEndTime.toString(),
        imageUrl: undefined,
    };
}

export function useComments() {
    const queryClient = useQueryClient();
    const activeGameInfo = useAtomValue(activeGameInfoAtom);
    const gameId = activeGameInfo?.id ?? null;

    // 블록체인 조회 중복 방지
    const blockchainFetchedRef = useRef<string | null>(null);

    logger.debug('useComments 호출', {
        gameId,
        hasActiveGameInfo: !!activeGameInfo,
        activeGameInfo: activeGameInfo ? { id: activeGameInfo.id, tokenSymbol: activeGameInfo.tokenSymbol } : null
    });

    // 댓글 조회 (gameId가 없으면 비활성화) - DB 먼저 조회
    const { data: comments = [], isLoading, refetch } = useQuery({
        queryKey: ['comments', gameId],
        queryFn: async () => {
            if (!gameId) {
                logger.warn('useComments: gameId가 없음');
                return [];
            }
            try {
                logger.info('댓글 조회 시작 (DB)', { gameId });
                const data = await backgroundApi.getComments(gameId);
                logger.info('댓글 조회 완료 (DB)', { gameId, count: data?.length || 0 });
                return data as Comment[];
            } catch (error) {
                console.error('댓글 조회 실패:', error);
                throw error;
            }
        },
        enabled: !!gameId,
        retry: 1,
    });

    // 블록체인에서 백그라운드로 댓글 조회 및 동기화
    useEffect(() => {
        if (!gameId || isLoading) return;
        // 이미 이 gameId에 대해 블록체인 조회를 했으면 스킵
        if (blockchainFetchedRef.current === gameId) return;

        const syncBlockchainComments = async () => {
            try {
                logger.info('블록체인 댓글 조회 시작', { gameId });
                const blockchainComments = await getCommentsFromBlockchain(gameId);
                logger.info('블록체인 댓글 조회 완료', { gameId, count: blockchainComments.length });

                if (blockchainComments.length === 0) {
                    blockchainFetchedRef.current = gameId;
                    return;
                }

                // 현재 DB 댓글과 비교
                const currentComments = queryClient.getQueryData<Comment[]>(['comments', gameId]) || [];

                // DB에 없는 블록체인 댓글 찾기 (message + commentor + timestamp로 비교)
                const newComments: Comment[] = [];

                for (const bcComment of blockchainComments) {
                    const bcTimestamp = new Date(Number(bcComment.timestamp) * 1000).toISOString();
                    const exists = currentComments.some(
                        (dbComment) =>
                            dbComment.commentor.toLowerCase() === bcComment.commentor.toLowerCase() &&
                            dbComment.message === bcComment.message &&
                            // timestamp가 1초 이내면 같은 댓글로 판단
                            Math.abs(new Date(dbComment.createdAt).getTime() - new Date(bcTimestamp).getTime()) < 1000
                    );

                    if (!exists) {
                        newComments.push(blockchainCommentToComment(bcComment));
                    }
                }

                if (newComments.length > 0) {
                    logger.info('블록체인에만 있는 댓글 발견', { count: newComments.length });

                    // 캐시 업데이트 (기존 댓글 + 새 댓글, 최신순 정렬)
                    const mergedComments = [...currentComments, ...newComments].sort(
                        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );

                    queryClient.setQueryData(['comments', gameId], mergedComments);
                }

                blockchainFetchedRef.current = gameId;
            } catch (error) {
                logger.warn('블록체인 댓글 조회 실패 (무시됨)', { error });
                // 블록체인 조회 실패해도 DB 댓글은 그대로 표시
                blockchainFetchedRef.current = gameId;
            }
        };

        syncBlockchainComments();
    }, [gameId, isLoading, queryClient]);

    // 댓글 작성
    const createCommentMutation = useMutation({
        mutationFn: async (input: {
            player_address: string;
            content: string;
            signature?: string;
            message?: string;
        }) => {
            try {
                return (await backgroundApi.createComment({
                    challengeId: gameId || '',
                    playerAddress: input.player_address,
                    content: input.content,
                })) as Comment;
            } catch (error) {
                console.error('댓글 작성 실패:', error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', gameId] });
        },
    });

    // 댓글 삭제 (백엔드 스키마에서 id는 serial = number)
    const deleteCommentMutation = useMutation({
        mutationFn: async (commentId: number) => {
            try {
                await backgroundApi.deleteComment(commentId);
            } catch (error) {
                console.error('댓글 삭제 실패:', error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', gameId] });
        },
    });

    return {
        comments,
        isLoading,
        refetch,
        createComment: createCommentMutation.mutateAsync,
        deleteComment: deleteCommentMutation.mutateAsync,
        isSubmitting: createCommentMutation.isPending,
    };
}
