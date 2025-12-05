import { Comment } from "@/contents/types/comment";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { backgroundApi } from "../lib/backgroundApi";
import { logger } from "../lib/injected/logger";

// 중복 댓글 제거 유틸리티 (id 기준, imageUrl 있는 것 우선)
function deduplicateComments(comments: Comment[]): Comment[] {
    const seen = new Map<number | string, Comment>();
    for (const comment of comments) {
        const existing = seen.get(comment.id);
        if (!existing) {
            seen.set(comment.id, comment);
        } else if (!existing.imageUrl && comment.imageUrl) {
            // 기존에 이미지 없고 새 댓글에 이미지 있으면 교체
            seen.set(comment.id, comment);
        }
    }
    return Array.from(seen.values());
}

export function useComments(
    gameId: string | null,
    walletAddress?: string | null,
) {
    const queryClient = useQueryClient();
    const prevGameIdRef = useRef<string | null>(null);

    // gameId가 변경될 때 이전 캐시 즉시 초기화
    useEffect(() => {
        if (
            prevGameIdRef.current !== null &&
            prevGameIdRef.current !== gameId
        ) {
            // 이전 gameId의 캐시 제거
            queryClient.removeQueries({
                queryKey: ["comments", prevGameIdRef.current],
            });
            logger.debug("이전 gameId 캐시 제거", {
                prevGameId: prevGameIdRef.current,
                newGameId: gameId,
            });
        }
        prevGameIdRef.current = gameId;
    }, [gameId, queryClient]);

    logger.debug("useComments 호출", { gameId });

    // 댓글 조회 (gameId가 없으면 비활성화) - DB 먼저 조회
    const {
        data: comments = [],
        isLoading,
        refetch,
    } = useQuery({
        queryKey: ["comments", gameId, walletAddress],
        queryFn: async () => {
            if (!gameId) {
                logger.warn("useComments: gameId가 없음");
                return [];
            }
            try {
                logger.info("댓글 조회 시작 (DB)", { gameId });
                const data = await backgroundApi.getComments(
                    gameId,
                    walletAddress || undefined,
                );
                logger.info("댓글 조회 완료 (DB)", {
                    gameId,
                    count: data?.length || 0,
                });
                // 중복 댓글 제거 후 반환 (이미지 있는 것 우선)
                return deduplicateComments(data as Comment[]);
            } catch (error) {
                console.error("댓글 조회 실패:", error);
                throw error;
            }
        },
        enabled: !!gameId,
        retry: 1,
        staleTime: 2000, // 2초간 fresh 상태 유지 (불필요한 refetch 방지)
        refetchOnWindowFocus: false, // 윈도우 포커스 시 자동 refetch 비활성화
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
                    challengeId: gameId || "",
                    playerAddress: input.player_address,
                    content: input.content,
                })) as Comment;
            } catch (error) {
                console.error("댓글 작성 실패:", error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comments", gameId] });
        },
    });

    // 좋아요 토글 (옵티미스틱 업데이트)
    const toggleLikeMutation = useMutation({
        mutationFn: async ({
            commentId,
            walletAddress,
        }: {
            commentId: number;
            walletAddress: string;
        }) => {
            try {
                return await backgroundApi.toggleCommentLike(
                    commentId,
                    walletAddress,
                );
            } catch (error) {
                console.error("좋아요 토글 실패:", error);
                throw error;
            }
        },
        onMutate: async ({ commentId }) => {
            // 진행 중인 refetch 취소
            await queryClient.cancelQueries({
                queryKey: ["comments", gameId, walletAddress],
            });

            // 이전 상태 스냅샷
            const previousComments = queryClient.getQueryData<Comment[]>([
                "comments",
                gameId,
                walletAddress,
            ]);

            // 옵티미스틱 업데이트
            queryClient.setQueryData<Comment[]>(
                ["comments", gameId, walletAddress],
                (oldComments) => {
                    if (!oldComments) return oldComments;
                    return oldComments.map((comment) =>
                        comment.id === commentId
                            ? {
                                  ...comment,
                                  isLiked: !comment.isLiked,
                                  likeCount: comment.isLiked
                                      ? (comment.likeCount || 1) - 1
                                      : (comment.likeCount || 0) + 1,
                              }
                            : comment,
                    );
                },
            );

            // 롤백을 위한 컨텍스트 반환
            return { previousComments };
        },
        onError: (_error, _variables, context) => {
            // 에러 발생 시 이전 상태로 롤백
            if (context?.previousComments) {
                queryClient.setQueryData(
                    ["comments", gameId, walletAddress],
                    context.previousComments,
                );
            }
        },
    });

    return {
        comments,
        isLoading,
        refetch,
        createComment: createCommentMutation.mutateAsync,
        isSubmitting: createCommentMutation.isPending,
        toggleLike: toggleLikeMutation.mutateAsync,
        isTogglingLike: toggleLikeMutation.isPending,
    };
}
