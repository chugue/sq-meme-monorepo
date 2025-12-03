/**
 * 게임 없음 섹션 컴포넌트
 *
 * - 토큰은 있지만 게임이 없는 경우 표시
 * - 게임 생성 및 상금 수령 기능 제공
 */

import { useAtomValue, useSetAtom } from "jotai";
import type { Address } from "viem";
import { endedGameInfoAtom } from "../../atoms/commentAtoms";
import { currentPageInfoAtom } from "../../atoms/currentPageInfoAtoms";
import { useWallet } from "../../hooks/useWallet";
import { formatAddress } from "../../utils/messageFormatter";
import { ClaimPrizeSection } from "./ClaimPrizeSection";
import "./CommentSection.css";
import { CreateGameSection } from "./CreateGameSection";

interface NoGameSectionProps {
  onGameCreated?: (gameAddress: string) => void;
}

export function NoGameSection({ onGameCreated }: NoGameSectionProps) {
  const currentPageInfo = useAtomValue(currentPageInfoAtom);
  const endedGameInfo = useAtomValue(endedGameInfoAtom);
  const setEndedGameInfo = useSetAtom(endedGameInfoAtom);
  const { address } = useWallet();

  // 현재 사용자가 우승자인지 확인 (대소문자 무시)
  const isWinner =
    endedGameInfo &&
    !endedGameInfo.isClaimed &&
    address &&
    endedGameInfo.lastCommentor.toLowerCase() === address.toLowerCase();

  const handleClaimed = () => {
    if (endedGameInfo) {
      setEndedGameInfo({
        ...endedGameInfo,
        isClaimed: true,
      });
    }
  };

  // 페이지 정보가 없으면 로딩 표시
  if (!currentPageInfo) {
    return (
      <div
        className="squid-comment-section"
        data-testid="squid-comment-section"
      >
        <div className="squid-comment-header">
          <h3 className="squid-comment-title">COMMENTS</h3>
        </div>
        <div style={{ padding: "16px", textAlign: "center", color: "#888" }}>
          토큰 정보를 불러오는 중...
        </div>
      </div>
    );
  }

  const tokenSymbol = currentPageInfo.symbol
    ? `$${currentPageInfo.symbol.toUpperCase()}`
    : "TOKEN";

  return (
    <div className="squid-comment-section" data-testid="squid-comment-section">
      <div className="squid-no-game-section">
        {/* 바운싱 아이콘 */}
        <div className="squid-no-game-icon">🎮</div>

        {/* 타이틀 */}
        <h3 className="squid-no-game-title">NO GAME YET!</h3>

        {/* 토큰 정보 */}
        <div className="squid-token-info">
          <div style={{ marginBottom: "4px", fontSize: "10px", color: "#888" }}>
            TOKEN ADDRESS
          </div>
          <div style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
            {formatAddress(currentPageInfo.contractAddress)}
          </div>
          {currentPageInfo.username && (
            <div style={{ marginTop: "8px", fontSize: "11px" }}>
              @{currentPageInfo.username}#{currentPageInfo.userTag}
            </div>
          )}
        </div>

        {/* 상금 정보 */}
        <div className="squid-prize-info">
          BE THE FIRST TO CREATE A GAME FOR THIS TOKEN!
        </div>

        {/* 게임 생성 섹션 */}
        <CreateGameSection
          tokenAddress={currentPageInfo.contractAddress as Address}
          tokenSymbol={tokenSymbol}
          onGameCreated={onGameCreated}
        />

        {/* 우승자 Claim 안내 */}
        {isWinner && endedGameInfo && (
          <ClaimPrizeSection
            gameId={endedGameInfo.id}
            prizePool={endedGameInfo.prizePool}
            tokenSymbol={tokenSymbol}
            onClaimed={handleClaimed}
          />
        )}
      </div>
    </div>
  );
}
