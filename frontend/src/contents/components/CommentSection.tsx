/**
 * 댓글 섹션 컴포넌트
 *
 * - 컨트랙트 직접 호출로 댓글 작성
 * - cost 입력 UI 추가
 * - 백엔드 API로 댓글 조회
 */

import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { currentChallengeIdAtom, isGameEndedAtom } from "../atoms/commentAtoms";
import { tokenContractAtom } from "../atoms/tokenContractAtoms";
import { useCommentContract } from "../hooks/useCommentContract";
import { useComments } from "../hooks/useComments";
import { useWallet } from "../hooks/useWallet";
import { logger } from "../lib/injected/logger";
import { ERROR_CODES } from "../lib/injectedApi";
import { formatAddress, formatRelativeTime } from "../utils/messageFormatter";
import "./CommentSection.css";
import { NoGameSection } from "./NoGameSection";

/**
 * 지갑 연결 UI 컴포넌트
 */
function WalletConnectionUI({
  isConnected,
  address,
  isLoading,
  error,
  onConnect,
  onDisconnect,
}: {
  isConnected: boolean;
  address: string | null;
  isLoading: boolean;
  error: string | null;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
}) {
  if (isLoading) {
    return <div className="squid-wallet-notice">CONNECTING WALLET...</div>;
  }

  if (!isConnected) {
    return (
      <div className="squid-wallet-buttons">
        <button
          type="button"
          onClick={onConnect}
          className="squid-wallet-button"
          disabled={isLoading}
        >
          CONNECT WALLET
        </button>
        {error && (
          <div className="squid-tx-error" style={{ marginTop: "8px" }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="squid-wallet-connected">
      <div className="squid-wallet-notice">
        CONNECTED: {formatAddress(address || "")}
      </div>
      <button
        type="button"
        onClick={onDisconnect}
        className="squid-wallet-button"
        style={{ fontSize: "8px", padding: "4px 8px" }}
      >
        DISCONNECT
      </button>
    </div>
  );
}

/**
 * 토큰 잔액 표시 컴포넌트
 */
function TokenBalanceDisplay({
  balance,
  isConnected,
  tokenSymbol,
}: {
  balance: string | null;
  isConnected: boolean;
  tokenSymbol?: string | null;
}) {
  if (!isConnected || balance === null) return null;

  return (
    <div
      style={{
        padding: "8px 12px",
        backgroundColor: "#1a2a3a",
        borderRadius: "4px",
        marginBottom: "8px",
        fontSize: "12px",
        color: "#4a9eff",
      }}
    >
      보유량: {balance}{" "}
      {tokenSymbol ? `$${tokenSymbol.toUpperCase()}` : "TOKEN"}
    </div>
  );
}

/**
 * 댓글 폼 컴포넌트
 */
function CommentForm({
  value,
  onChange,
  cost,
  tokenBalance,
  onSubmit,
  onApprove,
  isSubmitting,
  isApproving,
  isConnected,
  hasAllowance,
  disabled,
  tokenSymbol,
}: {
  value: string;
  onChange: (value: string) => void;
  cost: string | null;
  tokenBalance: string | null;
  onSubmit: () => Promise<void>;
  onApprove: () => Promise<void>;
  isSubmitting: boolean;
  isApproving: boolean;
  isConnected: boolean;
  hasAllowance: boolean | null;
  disabled?: boolean;
  tokenSymbol?: string | null;
}) {
  const getSubmitButtonText = () => {
    if (!isConnected) return "CONNECT WALLET FIRST";
    if (isSubmitting) return "SUBMITTING...";
    const symbol = tokenSymbol ? tokenSymbol.toUpperCase() : "TOKEN";
    if (cost) return `SUBMIT (${cost} ${symbol})`;
    return "SUBMIT";
  };

  const needsApproval = isConnected && hasAllowance === false;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="squid-comment-form"
    >
      {/* 토큰 잔액 표시 */}
      <TokenBalanceDisplay
        balance={tokenBalance}
        isConnected={isConnected}
        tokenSymbol={tokenSymbol}
      />

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="TYPE YOUR COMMENT..."
        className="squid-comment-input"
        rows={3}
        disabled={disabled || isSubmitting || isApproving}
      />
      {cost && (
        <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
          1회 비용: {cost} {tokenSymbol ? tokenSymbol.toUpperCase() : "TOKEN"}
        </div>
      )}

      {/* Approve 버튼 (allowance 부족 시) */}
      {needsApproval && (
        <button
          type="button"
          onClick={onApprove}
          className="squid-comment-submit"
          disabled={isApproving || disabled}
          style={{ marginTop: "8px", backgroundColor: "#f0ad4e" }}
        >
          {isApproving ? "APPROVING..." : "APPROVE TOKEN"}
        </button>
      )}

      {/* Submit 버튼 */}
      <button
        type="submit"
        className="squid-comment-submit"
        disabled={
          !value.trim() ||
          isSubmitting ||
          !isConnected ||
          needsApproval ||
          disabled
        }
        style={{ marginTop: "8px" }}
      >
        {getSubmitButtonText()}
      </button>
    </form>
  );
}

/**
 * 댓글 목록 컴포넌트
 */
function CommentList({
  comments,
  isLoading,
}: {
  comments: Array<{
    id: number;
    commentor: string;
    message: string;
    createdAt: string;
  }>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div className="squid-comment-loading">LOADING...</div>;
  }

  if (comments.length === 0) {
    return (
      <div className="squid-comment-empty">NO COMMENTS YET. BE THE FIRST!</div>
    );
  }

  return (
    <>
      {comments.map((comment) => (
        <div key={comment.id} className="squid-comment-item">
          <div className="squid-comment-content">{comment.message}</div>
          <div className="squid-comment-meta">
            <span className="squid-comment-address">
              {formatAddress(comment.commentor)}
            </span>
            <span className="squid-comment-date">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * 댓글 섹션 메인 컴포넌트
 */
export function CommentSection() {
  logger.debug("CommentSection 렌더링", {
    timestamp: new Date().toISOString(),
    location: window.location.href,
  });

  // gameAddress = currentChallengeId (null이면 게임 없음)
  const gameAddress = useAtomValue(currentChallengeIdAtom);
  // 게임 종료 여부 (blockTimestamp >= endTime 기준)
  const isGameEnded = useAtomValue(isGameEndedAtom);
  // 토큰 정보
  const tokenContract = useAtomValue(tokenContractAtom);

  // 모든 훅을 조건문 전에 호출 (React hooks 규칙 준수)
  const { comments, isLoading, refetch } = useComments();
  const {
    isConnected,
    address,
    connect,
    disconnect,
    ensureNetwork,
    isLoading: walletLoading,
    error: walletError,
  } = useWallet();

  // 컨트랙트 훅 (단일 인스턴스로 통합)
  const {
    addComment,
    getGameInfo,
    checkAllowance,
    getTokenBalance,
    approveToken,
    isSubmitting,
    isApproving,
  } = useCommentContract(
    gameAddress as Address | null,
    address as Address | null
  );

  const [newComment, setNewComment] = useState("");
  const [gameCost, setGameCost] = useState<string | null>(null);
  const [gameCostRaw, setGameCostRaw] = useState<bigint | null>(null);
  const [hasAllowance, setHasAllowance] = useState<boolean | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);

  // 게임이 없거나 종료된 경우 NoGameSection 표시
  if (!gameAddress || isGameEnded) {
    return <NoGameSection />;
  }

  // 컴포넌트 마운트 시 cost 조회
  useEffect(() => {
    const fetchGameCost = async () => {
      if (gameAddress) {
        try {
          const info = await getGameInfo();
          // raw cost 저장
          setGameCostRaw(info.cost);
          // cost를 토큰 단위로 변환 (18 decimals 가정)
          const costInTokens = Number(info.cost) / 1e18;
          setGameCost(costInTokens.toString());
        } catch (error) {
          logger.error("게임 정보 조회 실패", error);
        }
      }
    };
    fetchGameCost();
  }, [gameAddress, getGameInfo]);

  // allowance 확인
  useEffect(() => {
    const checkTokenAllowance = async () => {
      if (gameAddress && address && gameCostRaw !== null) {
        try {
          const allowance = await checkAllowance();
          setHasAllowance(allowance >= gameCostRaw);
        } catch {
          // getGameInfo가 먼저 호출되어야 함
          logger.debug("Allowance 조회 대기 중");
          setHasAllowance(null);
        }
      }
    };
    checkTokenAllowance();
  }, [gameAddress, address, gameCostRaw, checkAllowance]);

  // 토큰 잔액 조회
  useEffect(() => {
    const fetchTokenBalance = async () => {
      if (gameAddress && address) {
        try {
          const balance = await getTokenBalance();
          // 18 decimals 가정
          const balanceInTokens = Number(balance) / 1e18;
          setTokenBalance(balanceInTokens.toFixed(2));
        } catch {
          logger.debug("토큰 잔액 조회 대기 중");
          setTokenBalance(null);
        }
      }
    };
    fetchTokenBalance();
  }, [gameAddress, address, getTokenBalance]);

  /**
   * 토큰 approve 핸들러
   */
  const handleApprove = useCallback(async () => {
    if (!isConnected || !address) {
      try {
        await connect();
      } catch (error) {
        logger.error("지갑 연결 실패", error);
      }
      return;
    }

    try {
      await ensureNetwork();
      logger.info("토큰 approve 시작");

      const txHash = await approveToken();
      logger.info("토큰 approve 완료", { txHash });

      // approve 성공 후 allowance 다시 확인
      setHasAllowance(true);
      alert(`토큰 승인이 완료되었습니다!\n이제 댓글을 작성할 수 있습니다.`);
    } catch (error) {
      logger.error("토큰 approve 실패", error);

      if (error && typeof error === "object" && "code" in error) {
        if ((error as { code: string }).code === ERROR_CODES.USER_REJECTED) {
          return;
        }
      }

      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";
      alert(`토큰 승인에 실패했습니다: ${errorMessage}`);
    }
  }, [isConnected, address, connect, ensureNetwork, approveToken]);

  /**
   * 댓글 제출 핸들러 (컨트랙트 호출)
   */
  const handleSubmit = useCallback(async () => {
    if (!newComment.trim()) {
      return;
    }

    // 지갑 연결 확인
    if (!isConnected || !address) {
      try {
        await connect();
      } catch (error) {
        logger.error("지갑 연결 실패", error);
      }
      return;
    }

    try {
      // 네트워크 확인 및 전환 (필요시)
      await ensureNetwork();

      logger.info("댓글 작성 시작 (컨트랙트 호출)", {
        gameAddress,
        message: newComment.trim(),
      });

      // 컨트랙트 addComment 호출
      const txHash = await addComment(newComment.trim());

      logger.info("댓글 작성 트랜잭션 전송됨", { txHash });

      // 성공 시 입력 초기화
      setNewComment("");

      // 잠시 후 댓글 목록 새로고침 (이벤트 리스너가 DB에 저장할 시간)
      setTimeout(() => {
        refetch();
      }, 3000);

      alert(`댓글이 등록되었습니다!\n트랜잭션: ${txHash.slice(0, 10)}...`);
    } catch (error) {
      logger.error("댓글 작성 오류", error);

      // 사용자 거부 에러는 조용히 처리
      if (error && typeof error === "object" && "code" in error) {
        if ((error as { code: string }).code === ERROR_CODES.USER_REJECTED) {
          return;
        }
        if (
          (error as { code: string }).code ===
          ERROR_CODES.PROVIDER_NOT_AVAILABLE
        ) {
          alert(
            "네트워크 전환이 필요합니다. MetaMask에서 MemeCore 네트워크로 전환해주세요."
          );
          return;
        }
      }

      // 다른 에러는 사용자에게 알림
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";
      alert(`댓글 작성에 실패했습니다: ${errorMessage}`);
    }
  }, [
    newComment,
    isConnected,
    address,
    connect,
    ensureNetwork,
    gameAddress,
    addComment,
    refetch,
  ]);

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
      </div>

      <CommentForm
        value={newComment}
        onChange={setNewComment}
        cost={gameCost}
        tokenBalance={tokenBalance}
        onSubmit={handleSubmit}
        onApprove={handleApprove}
        isSubmitting={isSubmitting}
        isApproving={isApproving}
        isConnected={isConnected}
        hasAllowance={hasAllowance}
        tokenSymbol={tokenContract?.symbol}
      />

      <div className="squid-comments-list">
        <CommentList comments={comments} isLoading={isLoading} />
      </div>
    </div>
  );
}
