import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { currentChallengeIdAtom } from '../atoms/commentAtoms';
import { backgroundApi } from '../lib/backgroundApi';
import { Comment } from '@/contents/types/comment';

export function useComments() {
    const queryClient = useQueryClient();
    const challengeId = useAtomValue(currentChallengeIdAtom);

    // 댓글 조회
    const { data: comments = [], isLoading } = useQuery({
        queryKey: ['comments', challengeId],
        queryFn: async () => {
            try {
                const data = await backgroundApi.getComments(challengeId);
                return data as Comment[];
            } catch (error) {
                console.error('댓글 조회 실패:', error);
                throw error;
            }
        },
        refetchInterval: 5000, // 5초마다 자동 갱신
        retry: 2,
    });

    // 댓글 작성
    const createCommentMutation = useMutation({
        mutationFn: async (input: { player_address: string; content: string }) => {
            try {
                return await backgroundApi.createComment({
                    challenge_id: challengeId,
                    player_address: input.player_address,
                    content: input.content,
                }) as Comment;
            } catch (error) {
                console.error('댓글 작성 실패:', error);
                throw error;
            }
        },
        onSuccess: () => {
            // 댓글 목록 새로고침
            queryClient.invalidateQueries({ queryKey: ['comments', challengeId] });
        },
    });

    // 댓글 삭제
    const deleteCommentMutation = useMutation({
        mutationFn: async (commentId: string) => {
            try {
                await backgroundApi.deleteComment(commentId);
            } catch (error) {
                console.error('댓글 삭제 실패:', error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', challengeId] });
        },
    });

    return {
        comments,
        isLoading,
        createComment: createCommentMutation.mutateAsync,
        deleteComment: deleteCommentMutation.mutateAsync,
        isSubmitting: createCommentMutation.isPending,
    };
}
