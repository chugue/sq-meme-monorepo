import { Comment } from "@/contents/types/comment";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { activeGameInfoAtom } from "../atoms/commentAtoms";
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

export function useComments() {
  const queryClient = useQueryClient();
  const activeGameInfo = useAtomValue(activeGameInfoAtom);
  const gameId = activeGameInfo?.id ?? null;
  const prevGameIdRef = useRef<string | null>(null);

  // gameId가 변경될 때 이전 캐시 즉시 초기화
  useEffect(() => {
    if (prevGameIdRef.current !== null && prevGameIdRef.current !== gameId) {
      // 이전 gameId의 캐시 제거
      queryClient.removeQueries({ queryKey: ["comments", prevGameIdRef.current] });
      logger.debug("이전 gameId 캐시 제거", {
        prevGameId: prevGameIdRef.current,
        newGameId: gameId,
      });
    }
    prevGameIdRef.current = gameId;
  }, [gameId, queryClient]);

  logger.debug("useComments 호출", {
    gameId,
    hasActiveGameInfo: !!activeGameInfo,
    activeGameInfo: activeGameInfo
      ? { id: activeGameInfo.id, tokenSymbol: activeGameInfo.tokenSymbol }
      : null,
  });

  // 댓글 조회 (gameId가 없으면 비활성화) - DB 먼저 조회
  const {
    data: comments = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["comments", gameId],
    queryFn: async () => {
      if (!gameId) {
        logger.warn("useComments: gameId가 없음");
        return [];
      }
      try {
        logger.info("댓글 조회 시작 (DB)", { gameId });
        const data = await backgroundApi.getComments(gameId);
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

  return {
    comments,
    isLoading,
    refetch,
    createComment: createCommentMutation.mutateAsync,
    isSubmitting: createCommentMutation.isPending,
  };
}
