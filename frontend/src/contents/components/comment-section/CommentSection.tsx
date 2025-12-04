/**
 * 댓글 섹션 메인 컴포넌트
 * V2 컨트랙트 사용 - 스마트 컨트랙트 직접 호출
 */

import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { parseUnits } from "viem";
import { activeGameInfoAtom } from "../../atoms/commentAtoms";
import { useComments } from "../../hooks/useComments";
import { useWallet } from "../../hooks/useWallet";
import {
    backgroundApi,
    type CreateCommentRequest,
} from "../../lib/backgroundApi";
import {
    COMMENT_GAME_V2_ADDRESS,
    commentGameV2ABI,
} from "../../lib/contract/abis/commentGameV2";
import { erc20ABI } from "../../lib/contract/abis/erc20";
import { createContractClient } from "../../lib/contract/contractClient";
import { logger } from "../../lib/injected/logger";
import { ERROR_CODES, injectedApi } from "../../lib/injectedApi";
import { CommentForm } from "./CommentForm";
import { CommentList } from "./CommentList";
import "./CommentSection.css";
import { WalletConnectionUI } from "./WalletConnectionUI";

export function CommentSection() {
    logger.debug("CommentSection 렌더링", {
        timestamp: new Date().toISOString(),
        location: window.location.href,
    });

    const activeGameInfo = useAtomValue(activeGameInfoAtom);
    const gameId = activeGameInfo?.id ?? null;
    const { comments, isLoading, refetch } = useComments(gameId);
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
    const [fundingAmount, setFundingAmount] = useState("");
    const [isFunding, setIsFunding] = useState(false);

    // 컴포넌트가 마운트될 때마다 댓글 새로고침 (팝업이 다시 열릴 때 포함)
    useEffect(() => {
        if (gameId) {
            logger.info("CommentSection 마운트됨, 댓글 새로고침", { gameId });
            refetch();
        }
    }, [gameId, refetch]);

    // 펀딩 핸들러
    const handleFund = useCallback(async () => {
        if (!fundingAmount || Number(fundingAmount) <= 0) {
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

        if (!activeGameInfo?.id || !activeGameInfo?.gameToken) {
            alert("게임 정보를 찾을 수 없습니다.");
            return;
        }

        setIsFunding(true);

        try {
            await ensureNetwork();

            const gameId = BigInt(activeGameInfo.id);
            const tokenAddress = activeGameInfo.gameToken as Address;
            const v2ContractAddress = COMMENT_GAME_V2_ADDRESS as Address;

            // 토큰 decimals 조회
            const tokenClient = createContractClient({
                address: tokenAddress,
                abi: erc20ABI,
            });

            const decimalsResult = await tokenClient.read<number>({
                functionName: "decimals",
                args: [],
            });
            const decimals = decimalsResult.data ?? 18;

            // 펀딩 금액 계산
            const fundingAmountBigInt = parseUnits(fundingAmount, decimals);

            logger.info("펀딩 시작", {
                gameId: gameId.toString(),
                tokenAddress,
                amount: fundingAmountBigInt.toString(),
            });

            // 1. 잔액 확인
            const balanceResult = await tokenClient.read<bigint>({
                functionName: "balanceOf",
                args: [address],
            });

            if (!balanceResult.data || balanceResult.data < fundingAmountBigInt) {
                alert("토큰 잔액이 부족합니다.");
                return;
            }

            // 2. Allowance 확인
            const allowanceResult = await tokenClient.read<bigint>({
                functionName: "allowance",
                args: [address, v2ContractAddress],
            });

            // 3. Approve 필요 시 실행
            if (!allowanceResult.data || allowanceResult.data < fundingAmountBigInt) {
                logger.info("토큰 승인 필요", {
                    currentAllowance: allowanceResult.data?.toString(),
                    required: fundingAmountBigInt.toString(),
                });

                const approveResult = await tokenClient.write(
                    {
                        functionName: "approve",
                        args: [v2ContractAddress, fundingAmountBigInt],
                    },
                    address as Address
                );

                logger.info("승인 트랜잭션 전송됨", { hash: approveResult.hash });
                await injectedApi.waitForTransaction(approveResult.hash);
                logger.info("승인 완료");
            }

            // 4. fundPrizePool 호출
            const v2Client = createContractClient({
                address: v2ContractAddress,
                abi: commentGameV2ABI,
            });

            const fundResult = await v2Client.write(
                {
                    functionName: "fundPrizePool",
                    args: [gameId, fundingAmountBigInt],
                    gas: 300000n,
                },
                address as Address
            );

            logger.info("펀딩 트랜잭션 전송됨", { hash: fundResult.hash });

            // 트랜잭션 확정 대기
            const receipt = await injectedApi.waitForTransaction(fundResult.hash);

            logger.info("펀딩 트랜잭션 확정됨", {
                hash: fundResult.hash,
                blockNumber: receipt.blockNumber,
            });

            // 백엔드에 펀딩 저장
            try {
                await backgroundApi.saveFunding({ txHash: fundResult.hash });
                logger.info("백엔드에 펀딩 저장 완료");
            } catch (apiError) {
                logger.warn("백엔드 펀딩 저장 실패 (트랜잭션은 성공)", {
                    error: apiError,
                });
            }

            setFundingAmount("");
            alert("펀딩이 완료되었습니다!");
        } catch (error) {
            logger.error("펀딩 오류", error);

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
            alert(`펀딩에 실패했습니다: ${errorMessage}`);
        } finally {
            setIsFunding(false);
        }
    }, [
        fundingAmount,
        isConnected,
        address,
        connect,
        ensureNetwork,
        activeGameInfo,
    ]);

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
                logger.warn("백엔드 댓글 저장 실패 (트랜잭션은 성공)", {
                    error: apiError,
                });
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
    }, [
        newComment,
        commentImageUrl,
        isConnected,
        address,
        connect,
        ensureNetwork,
        activeGameInfo,
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

            {/* 펀딩 섹션 */}
            {activeGameInfo && (
                <div className="squid-funding-section">
                    <div className="squid-funding-header">
                        <span className="squid-funding-title">FUND PRIZE POOL</span>
                        <p className="squid-funding-desc">
                            Earn comment fees based on your funding share
                        </p>
                    </div>
                    <div className="squid-funding-form">
                        <input
                            type="number"
                            className="squid-funding-input"
                            placeholder="Amount to fund"
                            value={fundingAmount}
                            onChange={(e) => setFundingAmount(e.target.value)}
                            disabled={isFunding}
                            min="0"
                            step="any"
                        />
                        <button
                            type="button"
                            className="squid-funding-button"
                            onClick={handleFund}
                            disabled={
                                isFunding || !fundingAmount || Number(fundingAmount) <= 0
                            }
                        >
                            {isFunding ? "FUNDING..." : "FUND"}
                        </button>
                    </div>
                </div>
            )}

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
