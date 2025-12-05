/**
 * 활성 게임 기본 정보 DTO (repository 반환용)
 */
export interface ActiveGameBaseDto {
    gameId: string;
    tokenImageUrl: string | null;
    tokenAddress: string;
    tokenSymbol: string | null;
    currentPrizePool: string | null;
    endTime: Date | null;
}

/**
 * 활성 게임 정보 DTO (토큰 정보 포함)
 */
export interface ActiveGameDto extends ActiveGameBaseDto {
    tokenUsername: string | null;
    tokenUsertag: string | null;
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
