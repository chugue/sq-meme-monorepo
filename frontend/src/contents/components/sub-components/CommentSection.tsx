/**
 * 댓글 섹션 메인 컴포넌트
 */

import { useCallback, useState } from "react";
import { useComments } from "../../hooks/useComments";
import { useWallet } from "../../hooks/useWallet";
import { logger } from "../../lib/injected/logger";
import { ERROR_CODES, injectedApi } from "../../lib/injectedApi";
import { createCommentSignatureMessage } from "../../utils/messageFormatter";
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

  const { comments, isLoading, createComment, isSubmitting } = useComments();
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
  const [isSigning, setIsSigning] = useState(false);

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

    try {
      setIsSigning(true);

      await ensureNetwork();

      const messageToSign = createCommentSignatureMessage(
        newComment.trim(),
        address
      );

      const signature = await injectedApi.signMessage({
        message: messageToSign,
        address,
      });

      logger.info("서명 완료", { signature: signature.slice(0, 20) + "..." });

      await createComment({
        player_address: address,
        content: newComment.trim(),
        signature,
        message: messageToSign,
      });

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
      setIsSigning(false);
    }
  }, [newComment, isConnected, address, connect, createComment, ensureNetwork]);

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
        isSigning={isSigning}
        isConnected={isConnected}
      />

      <div className="squid-comments-list">
        <CommentList comments={comments} isLoading={isLoading} />
      </div>
    </div>
  );
}
