/**
 * 댓글 제출 로직을 캡슐화하는 커스텀 훅
 */

import { useCallback, useState } from "react";
import type { Address } from "viem";
import type { ActiveGameInfo } from "../atoms/commentAtoms";
import {
    backgroundApi,
    type CreateCommentRequest,
} from "../lib/backgroundApi";
import {
    COMMENT_GAME_V2_ADDRESS,
    commentGameV2ABI,
} from "../lib/contract/abis/commentGameV2";
import { createContractClient } from "../lib/contract/contractClient";
import { logger } from "../lib/injected/logger";
import { ERROR_CODES, injectedApi } from "../lib/injectedApi";

export interface UseCommentSubmitParams {
    activeGameInfo: ActiveGameInfo | null;
    address: string | null;
    isConnected: boolean;
    ensureNetwork: () => Promise<void>;
    refetch: () => Promise<unknown>;
    onGameEnded: () => void;
}

export interface UseCommentSubmitReturn {
    newComment: string;
    setNewComment: (comment: string) => void;
    commentImageUrl: string | undefined;
    setCommentImageUrl: (url: string | undefined) => void;
    isSubmitting: boolean;
    handleSubmit: () => Promise<void>;
}

export function useCommentSubmit({
    activeGameInfo,
    address,
    isConnected,
    ensureNetwork,
    refetch,
    onGameEnded,
}: UseCommentSubmitParams): UseCommentSubmitReturn {
    const [newComment, setNewComment] = useState("");
    const [commentImageUrl, setCommentImageUrl] = useState<string | undefined>();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = useCallback(async () => {
        logger.debug("handleSubmit 호출됨", {
            newComment: newComment.trim(),
            activeGameInfo,
            isConnected,
            address,
        });

        if (!newComment.trim()) {
            return;
        }

        if (!activeGameInfo?.id) {
            alert("게임 정보를 찾을 수 없습니다.");
            return;
        }

        const gameIdStr = activeGameInfo.id;

        // 지갑 연결 전에 먼저 게임 유효성 체크
        try {
            logger.debug("게임 유효성 체크 시작", { gameIdStr });
            const gameInfo = await backgroundApi.getActiveGameById(gameIdStr);
            logger.debug("게임 유효성 체크 결과", { gameInfo });
            if (!gameInfo) {
                logger.warn("게임을 찾을 수 없음", { gameId: gameIdStr });
                onGameEnded();
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
                return;
            }

            // 클라이언트 시간과 endTime 비교
            const endTimeMs = new Date(gameInfo.endTime).getTime();
            const isGameEnded = Date.now() >= endTimeMs || gameInfo.isClaimed;
            if (isGameEnded) {
                logger.warn("게임이 종료됨 (클라이언트 시간 비교)", {
                    gameId: gameIdStr,
                    endTime: gameInfo.endTime,
                    isClaimed: gameInfo.isClaimed,
                    now: new Date().toISOString(),
                });
                onGameEnded();
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
                return;
            }
        } catch (error) {
            logger.error("게임 정보 조회 실패", error);
            alert("게임 정보를 확인할 수 없습니다. 다시 시도해주세요.");
            return;
        }

        // 게임이 유효한 경우에만 지갑 연결 시도
        let currentAddress = address;
        if (!isConnected || !address) {
            try {
                const result = await backgroundApi.walletConnect();
                currentAddress = result.address;
                logger.info("지갑 연결 성공", { address: currentAddress });
            } catch (error) {
                logger.error("지갑 연결 실패", error);
                return;
            }
        }

        if (!currentAddress) {
            logger.error("지갑 주소를 가져올 수 없음");
            return;
        }

        setIsSubmitting(true);

        try {
            await ensureNetwork();

            const v2ContractAddress = COMMENT_GAME_V2_ADDRESS as Address;

            logger.info("댓글 작성 시작 (V2)", {
                gameId: gameIdStr,
                userAddress: currentAddress,
                messageLength: newComment.trim().length,
            });

            // V2 컨트랙트 클라이언트 생성
            const v2Client = createContractClient({
                address: v2ContractAddress,
                abi: commentGameV2ABI,
            });
            const gameId = BigInt(gameIdStr);

            // addComment(gameId, message) 호출
            const result = await v2Client.write(
                {
                    functionName: "addComment",
                    args: [gameId, newComment.trim()],
                    gas: 500000n,
                },
                currentAddress as Address,
            );

            logger.info("댓글 트랜잭션 전송됨", { hash: result.hash });

            // 트랜잭션 확정 대기
            const receipt = await injectedApi.waitForTransaction(result.hash);

            logger.info("댓글 트랜잭션 확정됨", {
                hash: result.hash,
                blockNumber: receipt.blockNumber,
            });

            // 백엔드에 댓글 저장 (txHash로 이벤트 파싱)
            const apiRequest: CreateCommentRequest = {
                txHash: result.hash,
                imageUrl: commentImageUrl,
            };

            try {
                const savedComment = await backgroundApi.saveComment(
                    apiRequest,
                );
                logger.info("백엔드에 댓글 저장 완료", {
                    commentId: savedComment?.id,
                });
            } catch (apiError) {
                logger.warn("백엔드 댓글 저장 실패 (트랜잭션은 성공)", {
                    error: apiError,
                });
            }

            // 댓글 목록 새로고침
            await refetch();

            setNewComment("");
            setCommentImageUrl(undefined);
        } catch (error) {
            logger.error("댓글 작성 오류", error);

            if (error && typeof error === "object" && "code" in error) {
                if (error.code === ERROR_CODES.USER_REJECTED) {
                    return;
                }
                if (error.code === ERROR_CODES.PROVIDER_NOT_AVAILABLE) {
                    alert(
                        "네트워크 전환이 필요합니다. MetaMask에서 MemeCore 네트워크로 전환해주세요.",
                    );
                    return;
                }
            }

            const errorMessage =
                error instanceof Error ? error.message : "알 수 없는 오류";
            alert(`댓글 작성에 실패했습니다: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    }, [
        newComment,
        commentImageUrl,
        isConnected,
        address,
        ensureNetwork,
        activeGameInfo,
        refetch,
        onGameEnded,
    ]);

    return {
        newComment,
        setNewComment,
        commentImageUrl,
        setCommentImageUrl,
        isSubmitting,
        handleSubmit,
    };
}
