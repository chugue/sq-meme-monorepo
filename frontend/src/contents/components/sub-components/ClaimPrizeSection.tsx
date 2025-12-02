/**
 * 상금 수령 섹션 컴포넌트
 *
 * - 우승자에게 CLAIM PRIZE 버튼 표시
 * - 트랜잭션 처리 및 성공 모달
 */

import { useState } from "react";
import type { Address } from "viem";
import { backgroundApi } from "../../lib/backgroundApi";
import { commentGameABI } from "../../lib/contract/abis/commentGame";
import { injectedApi } from "../../lib/injectedApi";
import { TransactionSuccessModal } from "./TransactionSuccessModal";

interface ClaimPrizeSectionProps {
  gameAddress: string;
  prizePool: string;
  tokenSymbol: string;
  onClaimed?: () => void;
}

export function ClaimPrizeSection({
  gameAddress,
  prizePool,
  tokenSymbol,
  onClaimed,
}: ClaimPrizeSectionProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const handleClaimPrize = async () => {
    setIsClaiming(true);
    setClaimError(null);
    setClaimTxHash(null);

    try {
      const txHash = await injectedApi.writeContract({
        address: gameAddress as Address,
        abi: commentGameABI,
        functionName: "claimPrize",
        args: [],
      });

      setClaimTxHash(txHash);

      await injectedApi.waitForTransaction(txHash);

      try {
        await backgroundApi.registerClaimPrizeTx(
          gameAddress.toLowerCase(),
          txHash
        );
        console.log("백엔드에 claimPrize 등록 완료");
      } catch (apiError) {
        console.warn("백엔드 claimPrize 등록 실패", apiError);
      }

      setIsSuccessModalOpen(true);
      onClaimed?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Claim 실패";
      setClaimError(errorMessage);
      console.error("Claim 실패", err);
    } finally {
      setIsClaiming(false);
    }
  };

  const formattedPrize = (BigInt(prizePool) / BigInt(10 ** 18)).toString();

  return (
    <div className="squid-winner-notice">
      <div className="squid-winner-icon">🏆</div>
      <div className="squid-winner-text">
        <strong>Congratulations! You won the last game!</strong>
        <p>Claim your prize before starting a new game.</p>
        <div className="squid-winner-prize">
          Prize Pool: {formattedPrize} {tokenSymbol}
        </div>
        <button
          type="button"
          onClick={handleClaimPrize}
          className="squid-claim-button"
          disabled={isClaiming}
        >
          {isClaiming ? "CLAIMING..." : "CLAIM PRIZE"}
        </button>
        {claimTxHash && (
          <div className="squid-tx-hash" style={{ marginTop: "8px" }}>
            TX:{" "}
            <a
              href={`https://explorer.memecore.org/tx/${claimTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {claimTxHash.slice(0, 10)}...{claimTxHash.slice(-8)}
            </a>
          </div>
        )}
        {claimError && (
          <div className="squid-tx-error" style={{ marginTop: "8px" }}>
            {claimError}
          </div>
        )}
      </div>

      {claimTxHash && (
        <TransactionSuccessModal
          isOpen={isSuccessModalOpen}
          onClose={() => setIsSuccessModalOpen(false)}
          txHash={claimTxHash}
          title="Prize Claimed!"
          description="Your prize has been successfully transferred to your wallet."
        />
      )}
    </div>
  );
}
