import { EndedGameInfo, endedGameInfoAtom } from "@/contents/atoms/commentAtoms";
import { EXPLORER_URL } from "@/contents/config/wagmi";
import { backgroundApi } from "@/contents/lib/backgroundApi";
import {
    COMMENT_GAME_V2_ADDRESS,
    commentGameV2ABI,
} from "@/contents/lib/contract/abis/commentGameV2";
import { injectedApi } from "@/contents/lib/injectedApi";
import { getExtensionImageUrl } from "@/contents/utils/getExtensionImageUrl";
import { useSetAtom } from "jotai";
import { useState } from "react";
import type { Address } from "viem";
import { TransactionSuccessModal } from "./TransactionSuccessModal";

// 큰 숫자를 축약 표시 (예: 1,234,567 -> 1.23M)
function formatCompactNumber(num: number): string {
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
    }
    return num.toLocaleString();
}

interface WinnerClaimProps {
    endedGameInfo: EndedGameInfo;
    tokenSymbol: string;
    onClaimed?: () => void;
}

export default function WinnerClaim({
    endedGameInfo,
    tokenSymbol,
    onClaimed,
}: WinnerClaimProps) {
    const setEndedGameInfo = useSetAtom(endedGameInfoAtom);
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimTxHash, setClaimTxHash] = useState<string | null>(null);
    const [claimError, setClaimError] = useState<string | null>(null);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

    const handleClaimPrize = async () => {
        if (!endedGameInfo) return;

        setIsClaiming(true);
        setClaimError(null);
        setClaimTxHash(null);

        try {
            // claimPrize 함수 호출 (V2: gameId 전달)
            const txHash = await injectedApi.writeContract({
                address: COMMENT_GAME_V2_ADDRESS as Address,
                abi: commentGameV2ABI,
                functionName: "claimPrize",
                args: [BigInt(endedGameInfo.id)],
            });

            setClaimTxHash(txHash);

            // 트랜잭션 확정 대기
            await injectedApi.waitForTransaction(txHash);

            // 트랜잭션 확정 후 백엔드에 txHash 등록
            try {
                await backgroundApi.registerClaimPrizeTx(
                    endedGameInfo.id,
                    txHash,
                );
                console.log("백엔드에 claimPrize 등록 완료");
            } catch (apiError) {
                console.warn("백엔드 claimPrize 등록 실패", apiError);
            }

            // endedGameInfo 업데이트 (isClaimed = true)
            setEndedGameInfo({
                ...endedGameInfo,
                isClaimed: true,
            });

            // 트랜잭션 확정 시 성공 모달 표시
            setIsSuccessModalOpen(true);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Claim 실패";
            setClaimError(errorMessage);
            console.error("Claim 실패", err);
        } finally {
            setIsClaiming(false);
        }
    };

    return (
        <div className="no-game-winner-section">
            {/* 배경 이미지 컨테이너 */}
            <div className="no-game-winner-bg">
                <img
                    src={getExtensionImageUrl("icon/winner.png")}
                    alt="Winner"
                    className="no-game-winner-character"
                />
                {/* 텍스트 콘텐츠 - 이미지 위에 오버레이 */}
                <div className="no-game-winner-content">
                    <div className="no-game-winner-title-box">
                        <span className="no-game-winner-title">
                            YOU WON THE <br /> LAST GAME
                        </span>
                    </div>
                    <div className="no-game-winner-prize">
                        <span>prize :</span>{" "}
                        <span style={{ whiteSpace: "nowrap" }}>
                            {formatCompactNumber(
                                Number(
                                    BigInt(endedGameInfo.prizePool) /
                                    BigInt(10 ** 18),
                                ),
                            )}{" "}
                            {tokenSymbol}
                        </span>
                    </div>
                </div>
                <img
                    src={getExtensionImageUrl("icon/trophy.png")}
                    alt="Trophy"
                    className="no-game-winner-trophy"
                />
                {/* Claim 버튼 - 이미지 위에 오버레이 */}
                <button
                    type="button"
                    onClick={handleClaimPrize}
                    className="no-game-claim-button"
                    disabled={isClaiming}
                >
                    <span className="no-game-claim-button-text">
                        {isClaiming ? "CLAIMING..." : "CLAIM PRIZE >>>"}
                    </span>
                </button>
            </div>

            {claimTxHash && (
                <div className="no-game-tx-hash">
                    TX:{" "}
                    <a
                        href={`${EXPLORER_URL}/tx/${claimTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {claimTxHash.slice(0, 10)}...
                        {claimTxHash.slice(-8)}
                    </a>
                </div>
            )}
            {claimError && (
                <div className="no-game-error">{claimError}</div>
            )}

            {/* 트랜잭션 성공 모달 */}
            {claimTxHash && (
                <TransactionSuccessModal
                    isOpen={isSuccessModalOpen}
                    onClose={() => {
                        setIsSuccessModalOpen(false);
                        onClaimed?.();
                    }}
                    txHash={claimTxHash}
                    title="Prize Claimed!"
                    description="Your prize has been successfully transferred to your wallet."
                />
            )}
        </div>
    );
}