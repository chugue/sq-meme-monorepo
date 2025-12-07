import { Comment } from "@/contents/types/comment";
import { CommentListItem } from "@/types/response.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { backgroundApi } from "../lib/backgroundApi";
import { logger } from "../lib/injected/logger";

// 백엔드 응답을 프론트엔드 Comment 타입으로 변환
function mapToComment(item: CommentListItem): Comment {
    return {
        id: item.comment.id,
        commentId: item.comment.id,
        gameId: item.comment.gameId,
        commentor: item.comment.commentor,
        message: item.comment.message,
        createdAt: item.comment.createdAt,
        likeCount: item.comment.likeCount,
        isLiked: item.hasUserLiked,
        imageUrl: item.comment.imageUrl ?? undefined,
        username: item.userName || undefined,
        profileImage: item.commentorProfileUrl || undefined,
        endTime: item.comment.endTime,
    };
}

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
        data: queryData,
        isLoading,
        refetch,
    } = useQuery({
        queryKey: ["comments", gameId, walletAddress],
        queryFn: async () => {
            if (!gameId) {
                logger.warn("useComments: gameId가 없음");
                return { comments: [] as Comment[], userTotalFunding: "0" };
            }
            try {
                logger.info("댓글 조회 시작 (DB)", { gameId });
                const response = await backgroundApi.getComments(
                    gameId,
                    walletAddress || undefined,
                );
                const comments = (response?.commentsListDTO || []).map(mapToComment);
                console.log(JSON.stringify(comments, null, 2), null, 2);
                const userTotalFunding = response?.userTotalFunding || "0";
                logger.info("댓글 조회 완료 (DB)", {
                    gameId,
                    count: comments.length,
                    userTotalFunding,
                });
                // 중복 댓글 제거 후 반환 (이미지 있는 것 우선)
                return {
                    comments: deduplicateComments(comments),
                    userTotalFunding,
                };
            } catch (error) {
                console.error("댓글 조회 실패:", error);
                throw error;
            }
        },
        enabled: !!gameId,
        retry: 1,
        staleTime: 2000, // 2초간 fresh 상태 유지 (불필요한 refetch 방지)
        refetchInterval: 1000, // 1초마다 자동 리패치
        refetchOnWindowFocus: true, // 윈도우 포커스 시 자동 refetch
    });

    const comments = queryData?.comments || [];
    const userTotalFunding = queryData?.userTotalFunding || "0";

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
            const previousData = queryClient.getQueryData<{
                comments: Comment[];
                userTotalFunding: string;
            }>(["comments", gameId, walletAddress]);

            // 옵티미스틱 업데이트
            queryClient.setQueryData<{
                comments: Comment[];
                userTotalFunding: string;
            }>(["comments", gameId, walletAddress], (oldData) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    comments: oldData.comments.map((comment) =>
                        comment.id === commentId
                            ? {
                                ...comment,
                                isLiked: !comment.isLiked,
                                likeCount: comment.isLiked
                                    ? (comment.likeCount || 1) - 1
                                    : (comment.likeCount || 0) + 1,
                            }
                            : comment,
                    ),
                };
            });

            // 롤백을 위한 컨텍스트 반환
            return { previousData };
        },
        onError: (_error, _variables, context) => {
            // 에러 발생 시 이전 상태로 롤백
            if (context?.previousData) {
                queryClient.setQueryData(
                    ["comments", gameId, walletAddress],
                    context.previousData,
                );
            }
        },
    });

    return {
        comments,
        userTotalFunding,
        isLoading,
        refetch,
        createComment: createCommentMutation.mutateAsync,
        isSubmitting: createCommentMutation.isPending,
        toggleLike: toggleLikeMutation.mutateAsync,
        isTogglingLike: toggleLikeMutation.isPending,
    };
}
