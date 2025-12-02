/**
 * 게임 생성 섹션 컴포넌트
 *
 * - 지갑 연결 상태 표시
 * - CREATE GAME 버튼 및 GameSetupModal 관리
 */

import { useState } from "react";
import type { Address } from "viem";
import { useWallet } from "../../hooks/useWallet";
import { formatAddress } from "../../utils/messageFormatter";
import { GameSetupModal } from "./GameSetupModal";

interface CreateGameSectionProps {
  tokenAddress: Address;
  tokenSymbol: string;
  onGameCreated?: (gameAddress: string) => void;
}

export function CreateGameSection({
  tokenAddress,
  tokenSymbol,
  onGameCreated,
}: CreateGameSectionProps) {
  const {
    isConnected,
    address,
    connect,
    isLoading: walletLoading,
    error: walletError,
  } = useWallet();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateGameClick = async () => {
    if (!isConnected || !address) {
      try {
        await connect();
      } catch (error) {
        console.error("지갑 연결 실패", error);
      }
      return;
    }

    setIsModalOpen(true);
  };

  const handleGameCreated = (gameAddress: string) => {
    setIsModalOpen(false);
    onGameCreated?.(gameAddress);
    window.location.reload();
  };

  return (
    <>
      {/* 지갑 연결 상태 */}
      {walletLoading && (
        <div style={{ color: "#888", marginBottom: "12px" }}>
          CONNECTING WALLET...
        </div>
      )}

      {!isConnected && !walletLoading && (
        <button
          type="button"
          onClick={connect}
          className="squid-create-game-button"
          style={{ marginBottom: "12px" }}
        >
          CONNECT WALLET
        </button>
      )}

      {isConnected && (
        <div
          style={{ marginBottom: "12px", fontSize: "10px", color: "#4ade80" }}
        >
          CONNECTED: {formatAddress(address || "")}
        </div>
      )}

      {/* 게임 생성 버튼 */}
      <button
        type="button"
        onClick={handleCreateGameClick}
        className="squid-create-game-button"
        disabled={!isConnected}
      >
        CREATE GAME
      </button>

      {/* 에러 메시지 */}
      {walletError && (
        <div className="squid-tx-error" style={{ marginTop: "12px" }}>
          {walletError}
        </div>
      )}

      {/* 게임 설정 모달 */}
      <GameSetupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tokenAddress={tokenAddress}
        tokenSymbol={tokenSymbol}
        onGameCreated={handleGameCreated}
        onExistingGameFound={(gameAddress) => {
          setIsModalOpen(false);
          onGameCreated?.(gameAddress);
          window.location.reload();
        }}
      />
    </>
  );
}
