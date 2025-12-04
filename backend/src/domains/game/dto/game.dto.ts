/**
 * 활성 게임 정보 DTO
 */
export interface ActiveGameDto {
    gameId: string;
    tokenImageUrl: string | null;
    tokenAddress: string;
    tokenSymbol: string | null;
    currentPrizePool: string | null;
    endTime: Date | null;
}

/**
 * 토큰별 상금 랭킹 DTO
 */
export interface TokenPrizeRankDto {
    tokenAddress: string;
    tokenSymbol: string | null;
    tokenImageUrl: string | null;
    totalPrize: string;
}

/**
 * 유저별 상금 랭킹 DTO
 */
export interface UserPrizeRankDto {
    walletAddress: string;
    totalAmount: string;
}
