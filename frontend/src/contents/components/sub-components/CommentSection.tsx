/**
 * 댓글 섹션 메인 컴포넌트
 * V2 컨트랙트 사용 - 스마트 컨트랙트 직접 호출
 */

import { useAtomValue } from "jotai";
import { useCallback, useState } from "react";
import type { Address } from "viem";
import { activeGameInfoAtom } from "../../atoms/commentAtoms";
import { useComments } from "../../hooks/useComments";
import { useWallet } from "../../hooks/useWallet";
import { backgroundApi, type CreateCommentRequest } from "../../lib/backgroundApi";
import {
  COMMENT_GAME_V2_ADDRESS,
  commentGameV2ABI,
} from "../../lib/contract/abis/commentGameV2";
import { createContractClient } from "../../lib/contract/contractClient";
import { logger } from "../../lib/injected/logger";
import { ERROR_CODES, injectedApi } from "../../lib/injectedApi";
import { CommentForm } from "./CommentForm";
import { CommentList } from "./CommentList";
import "./CommentSection.css";
import { TokenBalanceChecker } from "./TokenBalanceChecker";
import { WalletConnectionUI } from "./WalletConnectionUI";

export function CommentSection() {
  logger.debug("CommentSection 렌더링", {
    timestamp: new Date().toISOString(),
    location: window.location.href,
  });

  const { comments, isLoading, refetch } = useComments();
  const activeGameInfo = useAtomValue(activeGameInfoAtom);
  const {
    isConnected,
    address,
    connect,
    disconnect,
    ensureNetwork,
    isLoading: walletLoading,
    error: walletError,
  } = useWallet();
  const [newComment, setNewComment] = useState("");
  const [commentImageUrl, setCommentImageUrl] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!newComment.trim()) {
      return;
    }

    if (!isConnected || !address) {
      try {
        await connect();
      } catch (error) {
        logger.error("지갑 연결 실패", error);
      }
      return;
    }

    if (!activeGameInfo?.id) {
      alert("게임 정보를 찾을 수 없습니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      await ensureNetwork();

      const gameId = BigInt(activeGameInfo.id);
      const v2ContractAddress = COMMENT_GAME_V2_ADDRESS as Address;

      logger.info("댓글 작성 시작 (V2)", {
        gameId: gameId.toString(),
        userAddress: address,
        messageLength: newComment.trim().length,
      });

      // V2 컨트랙트 클라이언트 생성
      const v2Client = createContractClient({
        address: v2ContractAddress,
        abi: commentGameV2ABI,
      });

      // addComment(gameId, message) 호출
      const result = await v2Client.write(
        {
          functionName: "addComment",
          args: [gameId, newComment.trim()],
          gas: 500000n,
        },
        address as Address
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
        const savedComment = await backgroundApi.saveComment(apiRequest);
        logger.info("백엔드에 댓글 저장 완료", { commentId: savedComment?.id });
      } catch (apiError) {
        logger.warn("백엔드 댓글 저장 실패 (트랜잭션은 성공)", { error: apiError });
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
            "네트워크 전환이 필요합니다. MetaMask에서 MemeCore 네트워크로 전환해주세요."
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
  }, [newComment, commentImageUrl, isConnected, address, connect, ensureNetwork, activeGameInfo, refetch]);

  return (
    <div className="squid-comment-section" data-testid="squid-comment-section">
      <div className="squid-comment-header">
        <h3 className="squid-comment-title">COMMENTS</h3>
        <span className="squid-comment-count">{comments.length}</span>
      </div>

      <div className="squid-wallet-actions">
        <WalletConnectionUI
          isConnected={isConnected}
          address={address}
          isLoading={walletLoading}
          error={walletError}
          onConnect={connect}
          onDisconnect={disconnect}
        />
        <TokenBalanceChecker />
      </div>

      <CommentForm
        value={newComment}
        onChange={setNewComment}
        imageUrl={commentImageUrl}
        onImageChange={setCommentImageUrl}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isSigning={false}
        isConnected={isConnected}
      />

      <div className="squid-comments-list">
        <CommentList comments={comments} isLoading={isLoading} />
      </div>
    </div>
  );
}
