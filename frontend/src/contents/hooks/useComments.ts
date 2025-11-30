import { Comment } from '@/contents/types/comment';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { currentChallengeIdAtom } from '../atoms/commentAtoms';
import { backgroundApi } from '../lib/backgroundApi';

export function useComments() {
    const queryClient = useQueryClient();
    const challengeId = useAtomValue(currentChallengeIdAtom);

    // 댓글 조회 (challengeId가 없으면 비활성화)
    const { data: comments = [], isLoading, refetch } = useQuery({
        queryKey: ['comments', challengeId],
        queryFn: async () => {
            if (!challengeId) return [];
            try {
                const data = await backgroundApi.getComments(challengeId);
                return data as Comment[];
            } catch (error) {
                console.error('댓글 조회 실패:', error);
                throw error;
            }
        },
        enabled: !!challengeId,
        retry: 1,
    });

    // NOTE: 댓글 작성은 더 이상 백엔드 API를 통해 하지 않음 - useCommentContract 훅을 통해 직접 컨트랙트 호출
    // const createCommentMutation = useMutation({
    //     mutationFn: async (input: {
    //         player_address: string;
    //         content: string;
    //         signature?: string;
    //         message?: string;
    //     }) => {
    //         try {
    //             return await backgroundApi.createComment({
    //                 challenge_id: challengeId,
    //                 player_address: input.player_address,
    //                 content: input.content,
    //                 signature: input.signature,
    //                 message: input.message,
    //             }) as Comment;
    //         } catch (error) {
    //             console.error('댓글 작성 실패:', error);
    //             throw error;
    //         }
    //     },
    //     onSuccess: () => {
    //         queryClient.invalidateQueries({ queryKey: ['comments', challengeId] });
    //     },
    // });

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
            queryClient.invalidateQueries({ queryKey: ['comments', challengeId] });
        },
    });

    return {
        comments,
        isLoading,
        refetch,
        // NOTE: createComment는 더 이상 사용하지 않음 - useCommentContract 훅 사용
        // createComment: createCommentMutation.mutateAsync,
        deleteComment: deleteCommentMutation.mutateAsync,
        // NOTE: isSubmitting은 useCommentContract 훅에서 제공
        // isSubmitting: createCommentMutation.isPending,
    };
}
