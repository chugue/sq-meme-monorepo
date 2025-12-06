/**
 * 펀딩 로직을 캡슐화하는 커스텀 훅
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import type { Address } from "viem";
import { parseUnits } from "viem";
import type { Comment } from "../types/comment";
import type { ActiveGameInfo } from "../atoms/commentAtoms";
import { backgroundApi } from "../lib/backgroundApi";
import {
    COMMENT_GAME_V2_ADDRESS,
    commentGameV2ABI,
} from "../lib/contract/abis/commentGameV2";
import { erc20ABI } from "../lib/contract/abis/erc20";
import { createContractClient } from "../lib/contract/contractClient";
import { logger } from "../lib/injected/logger";
import { ERROR_CODES, injectedApi } from "../lib/injectedApi";

export interface UseFundingParams {
    activeGameInfo: ActiveGameInfo | null;
    setActiveGameInfo: (gameInfo: ActiveGameInfo) => void;
    address: string | null;
    isConnected: boolean;
    connect: () => Promise<void>;
    ensureNetwork: () => Promise<void>;
}

export interface UseFundingReturn {
    fundingAmount: string;
    setFundingAmount: (amount: string) => void;
    isFunding: boolean;
    handleFund: () => Promise<void>;
}

export function useFunding({
    activeGameInfo,
    setActiveGameInfo,
    address,
    isConnected,
    connect,
    ensureNetwork,
}: UseFundingParams): UseFundingReturn {
    const queryClient = useQueryClient();
    const [fundingAmount, setFundingAmount] = useState("");
    const [isFunding, setIsFunding] = useState(false);

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

            if (
                !balanceResult.data ||
                balanceResult.data < fundingAmountBigInt
            ) {
                alert("토큰 잔액이 부족합니다.");
                return;
            }

            // 2. Allowance 확인
            const allowanceResult = await tokenClient.read<bigint>({
                functionName: "allowance",
                args: [address, v2ContractAddress],
            });

            // 3. Approve 필요 시 실행
            if (
                !allowanceResult.data ||
                allowanceResult.data < fundingAmountBigInt
            ) {
                logger.info("토큰 승인 필요", {
                    currentAllowance: allowanceResult.data?.toString(),
                    required: fundingAmountBigInt.toString(),
                });

                const approveResult = await tokenClient.write(
                    {
                        functionName: "approve",
                        args: [v2ContractAddress, fundingAmountBigInt],
                    },
                    address as Address,
                );

                logger.info("승인 트랜잭션 전송됨", {
                    hash: approveResult.hash,
                });
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
                address as Address,
            );

            logger.info("펀딩 트랜잭션 전송됨", { hash: fundResult.hash });

            // 트랜잭션 확정 대기
            const receipt = await injectedApi.waitForTransaction(
                fundResult.hash,
            );

            logger.info("펀딩 트랜잭션 확정됨", {
                hash: fundResult.hash,
                blockNumber: receipt.blockNumber,
            });

            // 백엔드에 펀딩 저장 및 totalFunding, userFundingShare 업데이트
            try {
                const fundingResult = await backgroundApi.saveFunding({
                    txHash: fundResult.hash,
                    userAddress: address,
                });
                logger.info("백엔드에 펀딩 저장 완료", {
                    fundingResult,
                    totalFunding: fundingResult?.totalFunding,
                    userFundingShare: fundingResult?.userFundingShare,
                    activeGameInfoId: activeGameInfo?.id,
                });

                // useComments 캐시의 userFundingShare 업데이트
                if (
                    fundingResult?.userFundingShare !== undefined &&
                    activeGameInfo?.id
                ) {
                    queryClient.setQueryData<{
                        comments: Comment[];
                        userFundingShare: number;
                    }>(
                        ["comments", activeGameInfo.id, address],
                        (oldData) => {
                            if (!oldData) return oldData;
                            return {
                                ...oldData,
                                userFundingShare: fundingResult.userFundingShare,
                            };
                        },
                    );
                    logger.info("userFundingShare 캐시 업데이트", {
                        userFundingShare: fundingResult.userFundingShare,
                    });
                }

                setFundingAmount("");
                alert("펀딩이 완료되었습니다!");

                // activeGameInfo의 totalFunding 업데이트 (alert 닫힌 후)
                if (fundingResult?.totalFunding && activeGameInfo) {
                    const updatedGameInfo = {
                        ...activeGameInfo,
                        totalFunding: fundingResult.totalFunding,
                    };
                    logger.info("activeGameInfo 업데이트", {
                        before: activeGameInfo.totalFunding,
                        after: updatedGameInfo.totalFunding,
                    });
                    setActiveGameInfo(updatedGameInfo);
                }
            } catch (apiError) {
                logger.warn("백엔드 펀딩 저장 실패 (트랜잭션은 성공)", {
                    error: apiError,
                });
            }
        } catch (error) {
            logger.error("펀딩 오류", error);

            if (error && typeof error === "object" && "code" in error) {
                if (error.code === ERROR_CODES.USER_REJECTED) {
                    return;
                }
                if (error.code === ERROR_CODES.PROVIDER_NOT_AVAILABLE) {
                    alert(
                        "네트워크 전환이 필요합니다. MetaMask에서 MemeCore 네트워크로 전환해주세요.",
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
        setActiveGameInfo,
        queryClient,
    ]);

    return {
        fundingAmount,
        setFundingAmount,
        isFunding,
        handleFund,
    };
}
