/**
 * 댓글 섹션 메인 컴포넌트
 * V2 컨트랙트 사용 - 스마트 컨트랙트 직접 호출
 */

import { useAtom, useAtomValue } from "jotai";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatUnits } from "viem";
import { activeGameInfoAtom } from "../../atoms/commentAtoms";
import { currentPageInfoAtom } from "../../atoms/currentPageInfoAtoms";
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
import { FlipPrize } from "./FlipPrize";
import { FlipTimer } from "./FlipTimer";
import { WalletConnectionUI } from "./WalletConnectionUI";

// 타이머 컴포넌트 - 리렌더링을 격리시키기 위해 분리
const GameTimer = memo(function GameTimer({ endTime }: { endTime: string | undefined }) {
    const [remainingTime, setRemainingTime] = useState("00:00:00");

    useEffect(() => {
        if (!endTime) {
            return;
        }

        let lastSecond = Math.floor(Date.now() / 1000);

        const updateTimer = () => {
            const now = Date.now();
            const currentSecond = Math.floor(now / 1000);

            // 초가 바뀌었을 때만 상태 업데이트
            if (currentSecond !== lastSecond) {
                const formatted = formatRemainingTime(endTime);
                setRemainingTime(formatted);
                lastSecond = currentSecond;
            }
        };

        // 초기 계산
        updateTimer();

        // 100ms마다 체크 (초 경계에 최대 100ms 지연)
        const intervalId = setInterval(updateTimer, 100);

        return () => clearInterval(intervalId);
    }, [endTime]);
    return <FlipTimer time={remainingTime} />;
});

// 큰 숫자를 축약 표시 (예: 1,234,567 -> 1.23M)
function formatCompactNumber(num: number): string {
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
    }
    return num.toLocaleString();
}

export function CommentSection() {
    // 폰트 로드
    useEffect(() => {
        loadFont(FONTS.PRESS_START_2P);
    }, []);

    const { isConnected, address, connect, disconnect, ensureNetwork, isLoading: walletLoading, error: walletError } = useWallet();

    const [activeGameInfo, setActiveGameInfo] = useAtom(activeGameInfoAtom);
    const currentPageInfo = useAtomValue(currentPageInfoAtom);
    // activeGameInfo가 있어도 id가 유효하지 않으면 게임이 없는 것으로 처리
    const hasValidGame = !!activeGameInfo?.id;
    const gameId = hasValidGame ? activeGameInfo.id : null;
    const { comments, userTotalFunding, isLoading, refetch, toggleLike, isTogglingLike } = useComments(gameId, address);

    const [showGameEndedModal, setShowGameEndedModal] = useState(false);
    const [fundingInputError, setFundingInputError] = useState(false);
    const [scrollbarOpacity, setScrollbarOpacity] = useState(0);

    // totalFunding 값 (FlipPrize에서 애니메이션 처리)
    const totalFundingFormatted = activeGameInfo?.totalFunding
        ? formatCompactNumber(Number(formatUnits(BigInt(activeGameInfo.totalFunding), 18)))
        : "0";

    const [scrollTop, setScrollTop] = useState(0);
    const [scrollHeight, setScrollHeight] = useState(0);
    const [clientHeight, setClientHeight] = useState(0);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 마지막 댓글 찾기 (createdAt 기준으로 정렬하여 가장 최근 댓글)
    const lastComment = useMemo(() => {
        if (comments.length === 0) {
            return null;
        }
        const sortedComments = [...comments].sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return timeB - timeA; // 최신순
        });
        return sortedComments[0];
    }, [comments]);

    // 마지막 댓글의 createdAt + gameTime으로 새로운 endTime 계산
    const calculatedEndTime = useMemo(() => {
        // 마지막 댓글이 없거나 gameTime이 없으면 undefined 반환
        if (!lastComment?.createdAt || !activeGameInfo?.gameTime) {
            return undefined;
        }

        try {
            // createdAt을 Date 객체로 변환
            const createdAtDate = new Date(lastComment.createdAt);
            const createdAtMs = createdAtDate.getTime();

            // gameTime은 초 단위이므로 밀리초로 변환
            const gameTimeMs = Number(activeGameInfo.gameTime) * 1000;

            // createdAt + gameTime = 새로운 endTime
            const newEndTimeMs = createdAtMs + gameTimeMs;
            const newEndTime = new Date(newEndTimeMs).toISOString();

            return newEndTime;
        } catch (error) {
            console.error("[CommentSection] endTime 계산 오류:", error);
            return undefined;
        }
    }, [lastComment, activeGameInfo]);

    // 펀딩 훅
    const { fundingAmount, setFundingAmount, isFunding, handleFund } = useFunding({
        activeGameInfo,
        setActiveGameInfo,
        address,
        isConnected,
        connect,
        ensureNetwork,
    });

    // 댓글 제출 훅
    const { newComment, setNewComment, commentImageUrl, setCommentImageUrl, isSubmitting, handleSubmit } = useCommentSubmit({
        activeGameInfo,
        setActiveGameInfo,
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
    const scrollbarHeight = scrollHeight > 0 ? Math.max((clientHeight / scrollHeight) * clientHeight, 30) : 0;
    const scrollbarTop = scrollHeight > clientHeight ? (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - scrollbarHeight) : 0;
    const showScrollbar = scrollHeight > clientHeight;

    return (
        <div className="squid-comment-section" data-testid="squid-comment-section" onScroll={handleScroll} ref={containerRef}>
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
                        <img src={getExtensionImageUrl("icon/pig.png")} alt="" className="squid-bg-pig" />
                        <div className="squid-game-title">
                            <span className="squid-title-yellow">LAST COMMENTOR</span>
                            <span className="squid-title-purple">WILL WIN THE PRIZE!</span>
                        </div>
                        <img src={getExtensionImageUrl("icon/legion.png")} alt="" className="squid-timer-bg" />

                        <div className="squid-timer-wrapper">
                            <div className="squid-prize-display">
                                <span className="squid-prize-value">
                                    <FlipPrize value={totalFundingFormatted} /> ${currentPageInfo?.symbol?.toUpperCase() || "TOKEN"}
                                </span>
                            </div>
                            <div className="squid-game-timer">
                                <span className="squid-timer-label">TIMER</span>
                                <span className="squid-timer-value">
                                    <GameTimer endTime={calculatedEndTime} />
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 펀딩 섹션 */}
                    <div className="squid-funding-section">
                        <div className="squid-funding-card">
                            <div className="squid-funding-header">
                                <span className="squid-funding-title">Fund this Prize Pool</span>
                                <p className="squid-funding-desc">Earn comment fees based on your share</p>
                            </div>
                            <form className="squid-funding-form">
                                <div className="squid-funding-amount-row">
                                    <div className="squid-funding-token-badge">
                                        <span>${currentPageInfo?.symbol?.toUpperCase() || "TOKEN"}</span>
                                    </div>
                                    <input
                                        type="text"
                                        className={`squid-funding-input${fundingInputError ? " error" : ""}`}
                                        value={fundingAmount ? Number(fundingAmount).toLocaleString() : ""}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/,/g, "");
                                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                                setFundingAmount(value);
                                                setFundingInputError(false);
                                            }
                                        }}
                                        placeholder="Enter amount"
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="squid-funding-button"
                                    onClick={() => {
                                        if (!fundingAmount || fundingAmount === "0") {
                                            setFundingInputError(true);
                                            return;
                                        }
                                        handleFund();
                                    }}
                                    disabled={isFunding}
                                >
                                    Fund
                                </button>
                            </form>
                        </div>
                        <div className="squid-my-share-card">
                            <div className="squid-my-share-row">
                                <span className="squid-my-share-label">My Share</span>
                                <span className="squid-my-share-value">
                                    {activeGameInfo?.totalFunding && BigInt(activeGameInfo.totalFunding) > 0n
                                        ? ((Number(userTotalFunding) / Number(activeGameInfo.totalFunding)) * 100).toFixed(1)
                                        : "0.0"}
                                    %
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 댓글 섹션 헤더 */}
                    <div className="squid-comment-header">
                        <h3 className="squid-comment-title">COMMENTS</h3>
                        <span className="squid-comment-count">{comments.length}</span>
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
                        tokenSymbol={currentPageInfo?.symbol ?? undefined}
                        commentCost={activeGameInfo?.totalFunding ? formatUnits(BigInt(activeGameInfo.totalFunding) / 10000n, 18) : undefined}
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
                    <p className="squid-no-game-description">There is no active game for this token yet.</p>
                </div>
            )}

            {/* 게임 종료 모달 */}
            <GameEndedModal isOpen={showGameEndedModal} />
        </div>
    );
}
