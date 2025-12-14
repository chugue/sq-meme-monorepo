/**
 * 게임 없음 섹션 컴포넌트
 *
 * - 토큰은 있지만 게임이 없는 경우 표시
 * - 게임 생성 및 상금 수령 기능 제공
 */

import { getExtensionImageUrl } from "@/contents/utils/getExtensionImageUrl";
import { formatAddress } from "@/contents/utils/messageFormatter";
import { motion } from "framer-motion";
import { useAtomValue, useSetAtom } from "jotai";
import { useRef, useState } from "react";
import type { Address } from "viem";
import { endedGameInfoAtom } from "../../atoms/commentAtoms";
import { currentPageInfoAtom } from "../../atoms/currentPageInfoAtoms";
import { useWallet } from "../../hooks/useWallet";
import { GameSetupModal } from "../game-setup-modal/GameSetupModal";
import { ClaimPrizeFirstModal } from "./ClaimPrizeFirstModal";
import "./NoGameSection.css";
import WinnerClaim from "./WinnerClaim";

// 주소 축약 (0x856C...e74A 형태)
function shortenAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface NoGameSectionProps {
    onGameCreated?: (gameId: string) => void;
}

export function NoGameSection({ onGameCreated }: NoGameSectionProps) {
    const currentPageInfo = useAtomValue(currentPageInfoAtom);
    const endedGameInfo = useAtomValue(endedGameInfoAtom);
    const setEndedGameInfo = useSetAtom(endedGameInfoAtom);
    const { isConnected, address, connect, isLoading: walletLoading, error: walletError } = useWallet();

    // 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isClaimPrizeModalOpen, setIsClaimPrizeModalOpen] = useState(false);
    const winnerClaimRef = useRef<{ handleClaimPrize: () => Promise<void> } | null>(null);

    // 현재 사용자가 우승자인지 확인 (대소문자 무시)
    const isWinner = endedGameInfo && !endedGameInfo.isClaimed && address && endedGameInfo.lastCommentor.toLowerCase() === address.toLowerCase();

    /**
     * CREATE GAME 버튼 클릭 핸들러
     */
    const handleCreateGameClick = async () => {
        // 지갑 연결 확인
        if (!isConnected || !address) {
            try {
                await connect();
            } catch (error) {
                console.error("지갑 연결 실패", error);
            }
            return;
        }

        // 위너인 경우 Claim Prize 모달 표시
        if (isWinner) {
            setIsClaimPrizeModalOpen(true);
            return;
        }

        // 모달 오픈
        setIsModalOpen(true);
    };

    /**
     * 게임 생성 완료 핸들러
     */
    const handleGameCreated = (gameId: string) => {
        setIsModalOpen(false);
        onGameCreated?.(gameId);
        window.location.reload();
    };

    const tokenSymbol = currentPageInfo?.symbol ? `$${currentPageInfo.symbol.toUpperCase()}` : "TOKEN";

    const tokenAddress = currentPageInfo?.contractAddress || "";
    const xHandle = currentPageInfo?.username ? `@${currentPageInfo.username}` : "";

    // 페이지 정보가 없으면 로딩 표시
    if (!currentPageInfo) {
        return (
            <div className="no-game-container" data-testid="squid-comment-section">
                {/* NO GAME YET! 타이틀 */}
                <h1 className="no-game-title">NO GAME YET!</h1>

                {/* 오징어 캐릭터 이미지 */}
                <motion.div
                    className="no-game-squid-character"
                    animate={{
                        y: [0, -10, 0],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    <img src={getExtensionImageUrl("icon/mascot-wine.png")} alt="Squid" className="no-game-squid-image" />
                </motion.div>

                <div className="no-game-loading-text">LOADING...</div>
            </div>
        );
    }

    return (
        <div className="no-game-container" data-testid="squid-comment-section">
            {/* 우승자 Claim 안내 */}
            {isWinner && endedGameInfo && (
                <WinnerClaim
                    ref={winnerClaimRef}
                    endedGameInfo={endedGameInfo}
                    tokenSymbol={tokenSymbol}
                />
            )}

            {/* NO GAME YET! 타이틀 */}
            <h1 className="no-game-title">NO GAME YET!</h1>

            {/* 오징어 캐릭터 이미지 */}
            <motion.div
                className="no-game-squid-character"
                animate={{
                    y: [0, -10, 0],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            >
                <img src={getExtensionImageUrl("icon/mascot-wine.png")} alt="Squid" className="no-game-squid-image" />
            </motion.div>

            {/* 토큰 정보 프레임 */}
            <motion.div
                className="no-game-token-info-frame"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                {/* 왼쪽 대괄호 */}
                <div className="no-game-bracket no-game-left-bracket">
                    <div className="no-game-bracket-top"></div>
                    <div className="no-game-bracket-line"></div>
                    <div className="no-game-bracket-bottom"></div>
                </div>

                {/* 토큰 정보 */}
                <div className="no-game-token-info-content">
                    <span className="no-game-token-label">TOKEN ADDRESS</span>
                    <span className="no-game-token-value">{shortenAddress(tokenAddress)}</span>
                    {xHandle && <span className="no-game-token-handle">{xHandle}</span>}
                </div>

                {/* 오른쪽 대괄호 */}
                <div className="no-game-bracket no-game-right-bracket">
                    <div className="no-game-bracket-top"></div>
                    <div className="no-game-bracket-line"></div>
                    <div className="no-game-bracket-bottom"></div>
                </div>
            </motion.div>

            {/* 게임 생성 섹션 */}
            <div className="no-game-create-section">
                {/* 지갑 연결 상태 */}
                {walletLoading && <div className="no-game-wallet-status">CONNECTING WALLET...</div>}

                {!isConnected && !walletLoading && (
                    <button type="button" onClick={connect} className="no-game-create-button">
                        <span className="no-game-create-button-text">CONNECT WALLET</span>
                    </button>
                )}

                {isConnected && !walletLoading && (
                    <>
                        <div className="no-game-connected-status">CONNECTED: {formatAddress(address || "")}</div>
                        <button type="button" onClick={handleCreateGameClick} className="no-game-create-button">
                            <span className="no-game-create-button-text">CREATE GAME {">>>"}</span>
                        </button>
                    </>
                )}

                {/* 에러 메시지 */}
                {walletError && <div className="no-game-error">{walletError}</div>}
            </div>

            {/* 게임 설정 모달 */}
            <GameSetupModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tokenAddress={currentPageInfo.contractAddress as Address}
                tokenSymbol={tokenSymbol}
                username={currentPageInfo.username}
                onGameCreated={handleGameCreated}
                onExistingGameFound={(gameId) => {
                    setIsModalOpen(false);
                    onGameCreated?.(gameId);
                    window.location.reload();
                }}
            />

            {/* Claim Prize First 모달 */}
            <ClaimPrizeFirstModal
                isOpen={isClaimPrizeModalOpen}
                onClose={() => setIsClaimPrizeModalOpen(false)}
                onClaimPrize={async () => {
                    if (winnerClaimRef.current) {
                        await winnerClaimRef.current.handleClaimPrize();
                        setIsClaimPrizeModalOpen(false);
                    }
                }}
            />

        </div>
    );
}
