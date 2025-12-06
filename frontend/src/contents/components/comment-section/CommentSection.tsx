/**
 * 댓글 섹션 메인 컴포넌트
 * V2 컨트랙트 사용 - 스마트 컨트랙트 직접 호출
 */

import { useAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatUnits } from "viem";
import { activeGameInfoAtom } from "../../atoms/commentAtoms";
import { useComments } from "../../hooks/useComments";
import { useCommentSubmit } from "../../hooks/useCommentSubmit";
import { useFunding } from "../../hooks/useFunding";
import { useWallet } from "../../hooks/useWallet";
import { formatRemainingTime } from "../../utils/gameTime";
import { getExtensionImageUrl } from "../../utils/getExtensionImageUrl";
import { FONTS, loadFont } from "../../utils/loadFont";
import { GameEndedModal } from "../sub-components/GameEndedModal";
import characterBg from "./assets/character-bg.svg";
import legionBg from "./assets/legion-bg.svg";
import { CommentForm } from "./CommentForm";
import { CommentList } from "./CommentList";
import "./CommentSection.css";
import { FlipTimer } from "./FlipTimer";
import { WalletConnectionUI } from "./WalletConnectionUI";

export function CommentSection() {
    // 폰트 로드
    useEffect(() => {
        loadFont(FONTS.PRESS_START_2P);
    }, []);

    const {
        isConnected,
        address,
        connect,
        disconnect,
        ensureNetwork,
        isLoading: walletLoading,
        error: walletError,
    } = useWallet();

    const [activeGameInfo, setActiveGameInfo] = useAtom(activeGameInfoAtom);
    // activeGameInfo가 있어도 id가 유효하지 않으면 게임이 없는 것으로 처리
    const hasValidGame = !!activeGameInfo?.id;
    const gameId = hasValidGame ? activeGameInfo.id : null;
    const { comments, isLoading, refetch, toggleLike, isTogglingLike } =
        useComments(gameId, address);

    const [showGameEndedModal, setShowGameEndedModal] = useState(false);
    const [scrollbarOpacity, setScrollbarOpacity] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [scrollHeight, setScrollHeight] = useState(0);
    const [clientHeight, setClientHeight] = useState(0);
    const [remainingTime, setRemainingTime] = useState("00:00:00");
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 타이머 업데이트 (1초마다)
    useEffect(() => {
        console.log("[Timer Debug] activeGameInfo:", activeGameInfo);
        console.log("[Timer Debug] endTime:", activeGameInfo?.endTime);

        if (!activeGameInfo?.endTime) {
            console.log("[Timer Debug] endTime이 없어서 타이머 비활성화");
            return;
        }

        const updateTimer = () => {
            const formatted = formatRemainingTime(activeGameInfo.endTime);
            console.log("[Timer Debug] formatted time:", formatted);
            setRemainingTime(formatted);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [activeGameInfo?.endTime]);

    // 펀딩 훅
    const { fundingAmount, setFundingAmount, isFunding, handleFund } =
        useFunding({
            activeGameInfo,
            setActiveGameInfo,
            address,
            isConnected,
            connect,
            ensureNetwork,
        });

    // 댓글 제출 훅
    const {
        newComment,
        setNewComment,
        commentImageUrl,
        setCommentImageUrl,
        isSubmitting,
        handleSubmit,
    } = useCommentSubmit({
        activeGameInfo,
        address,
        isConnected,
        ensureNetwork,
        refetch,
        onGameEnded: () => setShowGameEndedModal(true),
    });

    // 스크롤 이벤트 핸들러 - 스크롤 시 스크롤바 표시
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        setScrollTop(target.scrollTop);
        setScrollHeight(target.scrollHeight);
        setClientHeight(target.clientHeight);
        setScrollbarOpacity(1);

        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
            setScrollbarOpacity(0);
        }, 1000);
    }, []);

    // 스크롤바 위치 및 크기 계산ㄴ
    const scrollbarHeight =
        scrollHeight > 0
            ? Math.max((clientHeight / scrollHeight) * clientHeight, 30)
            : 0;
    const scrollbarTop =
        scrollHeight > clientHeight
            ? (scrollTop / (scrollHeight - clientHeight)) *
              (clientHeight - scrollbarHeight)
            : 0;
    const showScrollbar = scrollHeight > clientHeight;

    return (
        <div
            className="squid-comment-section"
            data-testid="squid-comment-section"
            onScroll={handleScroll}
            ref={containerRef}
        >
            {/* 커스텀 스크롤바 */}
            {showScrollbar && (
                <div
                    className="squid-custom-scrollbar"
                    style={{
                        opacity: scrollbarOpacity,
                        top: scrollbarTop,
                        height: scrollbarHeight,
                    }}
                />
            )}

            {/* 배경 레이어들 */}
            <img src={legionBg} alt="" className="squid-bg-legion" />
            <img src={characterBg} alt="" className="squid-bg-character" />

            {/* 지갑 연결 UI */}
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

            {/* hasValidGame일 때만 펀딩 섹션 + 댓글 폼/리스트 표시 */}
            {hasValidGame ? (
                <>
                    {/* 게임 헤더 섹션 */}
                    <div className="squid-game-header">
                        <img
                            src={getExtensionImageUrl("icon/pig.png")}
                            alt=""
                            className="squid-bg-pig"
                        />
                        <div className="squid-game-title">
                            <span className="squid-title-yellow">
                                LAST COMMENTOR
                            </span>
                            <span className="squid-title-purple">
                                WILL WIN THE PRIZE!
                            </span>
                        </div>
                        <img
                            src={getExtensionImageUrl("icon/legion.png")}
                            alt=""
                            className="squid-timer-bg"
                        />

                        <div className="squid-timer-wrapper">
                            <div className="squid-prize-display">
                                <span className="squid-prize-value">
                                    {activeGameInfo?.totalFunding
                                        ? formatUnits(
                                              BigInt(
                                                  activeGameInfo.totalFunding,
                                              ),
                                              18,
                                          )
                                        : "0"}{" "}
                                    ${activeGameInfo?.tokenSymbol || "SQM"}
                                </span>
                            </div>
                            <div className="squid-game-timer">
                                <span className="squid-timer-label">TIMER</span>
                                <span className="squid-timer-value">
                                    <FlipTimer time={remainingTime} />
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 펀딩 섹션 */}
                    <div className="squid-funding-section">
                        <div className="squid-funding-card">
                            <div className="squid-funding-header">
                                <span className="squid-funding-title">
                                    Fund this Prize Pool
                                </span>
                                <p className="squid-funding-desc">
                                    Earn comment fees based on your share
                                </p>
                            </div>
                            <form className="squid-funding-form">
                                <div className="squid-funding-amount-row">
                                    <div className="squid-funding-token-badge">
                                        <span>
                                            $
                                            {activeGameInfo?.tokenSymbol ||
                                                "SQM"}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        className="squid-funding-input"
                                        value={
                                            fundingAmount
                                                ? Number(
                                                      fundingAmount,
                                                  ).toLocaleString()
                                                : ""
                                        }
                                        onChange={(e) => {
                                            const value =
                                                e.target.value.replace(
                                                    /,/g,
                                                    "",
                                                );
                                            if (
                                                value === "" ||
                                                /^\d*\.?\d*$/.test(value)
                                            ) {
                                                setFundingAmount(value);
                                            }
                                        }}
                                        placeholder="Enter amount"
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="squid-funding-button"
                                    onClick={handleFund}
                                    disabled={isFunding}
                                >
                                    Fund
                                </button>
                            </form>
                        </div>
                        <div className="squid-my-share-card">
                            <div className="squid-my-share-row">
                                <span className="squid-my-share-label">
                                    My Share
                                </span>
                                <span className="squid-my-share-value">
                                    12.8%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 댓글 섹션 헤더 */}
                    <div className="squid-comment-header">
                        <h3 className="squid-comment-title">COMMENTS</h3>
                        <span className="squid-comment-count">
                            {comments.length}
                        </span>
                    </div>

                    {/* 댓글 폼 */}
                    <CommentForm
                        value={newComment}
                        onChange={setNewComment}
                        imageUrl={commentImageUrl}
                        onImageChange={setCommentImageUrl}
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                        isSigning={false}
                        isConnected={isConnected}
                        tokenSymbol={activeGameInfo?.tokenSymbol}
                        commentCost={
                            activeGameInfo?.totalFunding
                                ? formatUnits(
                                      BigInt(activeGameInfo.totalFunding) /
                                          10000n,
                                      18,
                                  )
                                : undefined
                        }
                    />

                    {/* 댓글 리스트 */}
                    <div className="squid-comments-list">
                        <CommentList
                            comments={comments}
                            isLoading={isLoading}
                            onToggleLike={(commentId) => {
                                if (address) {
                                    toggleLike({
                                        commentId,
                                        walletAddress: address,
                                    });
                                }
                            }}
                            isTogglingLike={isTogglingLike}
                        />
                    </div>
                </>
            ) : (
                <div className="squid-no-game-section">
                    <div className="squid-no-game-icon">🎮</div>
                    <div className="squid-no-game-title">NO ACTIVE GAME</div>
                    <p className="squid-no-game-description">
                        There is no active game for this token yet.
                    </p>
                </div>
            )}

            {/* 게임 종료 모달 */}
            <GameEndedModal isOpen={showGameEndedModal} />
        </div>
    );
}
