import { Comment } from '@/contents/types/comment';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { activeGameInfoAtom } from '../atoms/commentAtoms';
import { backgroundApi } from '../lib/backgroundApi';
import { logger } from '../lib/injected/logger';

export function useComments() {
    const queryClient = useQueryClient();
    const activeGameInfo = useAtomValue(activeGameInfoAtom);
    const gameId = activeGameInfo?.id ?? null;

    logger.debug('useComments 호출', {
        gameId,
        hasActiveGameInfo: !!activeGameInfo,
        activeGameInfo: activeGameInfo ? { id: activeGameInfo.id, tokenSymbol: activeGameInfo.tokenSymbol } : null
    });

    // 댓글 조회 (gameId가 없으면 비활성화)
    const { data: comments = [], isLoading, refetch } = useQuery({
        queryKey: ['comments', gameId],
        queryFn: async () => {
            if (!gameId) {
                logger.warn('useComments: gameId가 없음');
                return [];
            }
            try {
                logger.info('댓글 조회 시작', { gameId });
                const data = await backgroundApi.getComments(gameId);
                logger.info('댓글 조회 완료', { gameId, count: data?.length || 0 });
                return data as Comment[];
            } catch (error) {
                console.error('댓글 조회 실패:', error);
                throw error;
            }
        },
        enabled: !!gameId,
        retry: 1,
    });

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
