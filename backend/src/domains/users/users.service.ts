import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CheckInRecord, User } from 'src/common/db/schema/user.schema';
import {
    mockMyAssets,
    MyAsset,
    MyAssetsRespDto,
} from 'src/common/mock/my-assets';
import { Result } from 'src/common/types';
import { CommentRepository } from '../comment/comment.repository';
import { GameRepository } from '../game/game.repository';
import { QuestRepository } from '../quests/quest.repository';
import { TokenRepository } from '../token/token.repository';
import { WinnersRepository } from '../winners/winners.repository';
import { JoinDto } from './dto/join.dto';
import {
    GameRankItem,
    MostCommentUserRankDto,
    MyActiveGameItem,
    PrizeRankItem,
    ProfilePageData,
} from './dto/users.resp.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        private readonly usersRepository: UsersRepository,
        private readonly commentRepository: CommentRepository,
        private readonly gameRepository: GameRepository,
        private readonly tokenRepository: TokenRepository,
        private readonly questRepository: QuestRepository,
        private readonly winnersRepository: WinnersRepository,
    ) {}

    /**
     * @description 내 자산 조회 (memex/otherTokens는 mock, myToken은 DB 조회)
     */
    async getMyAssets(walletAddress: string): Promise<Result<MyAssetsRespDto>> {
        try {
            const [memexMock, ...otherMocks] = mockMyAssets;

            const memex: MyAsset = {
                tokenAddress: memexMock.tokenAddress,
                tokenSymbol: memexMock.tokenSymbol,
                balance: memexMock.balance,
                tokenImage: memexMock.tokenImage,
            };

            // 내 토큰은 DB에서 조회
            let myToken: MyAsset = {
                tokenAddress: '',
                tokenSymbol: '',
                balance: '0',
                tokenImage: '',
            };

            const user =
                await this.usersRepository.findByWalletAddress(walletAddress);
            if (user?.myTokenAddr) {
                const tokenInfo = await this.tokenRepository.findByTokenAddress(
                    user.myTokenAddr,
                );
                myToken = {
                    tokenAddress: user.myTokenAddr,
                    tokenSymbol: user.myTokenSymbol ?? '',
                    balance: user.myTokenBalance ?? '0',
                    tokenImage: tokenInfo?.tokenImageUrl ?? '',
                };
            }

            const otherTokens: MyAsset[] = otherMocks.map((m) => ({
                tokenAddress: m.tokenAddress,
                tokenSymbol: m.tokenSymbol,
                balance: m.balance,
                tokenImage: m.tokenImage,
            }));

            return Result.ok({ memex, myToken, otherTokens });
        } catch (error) {
            this.logger.error(`Get my assets failed: ${error.message}`);
            return Result.fail(
                '내 자산 조회에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * @description 댓글 수 기준 유저 랭킹 조회
     */
    async getMostCommentors(
        limit?: number,
    ): Promise<Result<MostCommentUserRankDto[]>> {
        try {
            const topUsers = await this.usersRepository.getTopUsersByComments(
                limit ?? 20,
            );

            const result: MostCommentUserRankDto[] = topUsers.map(
                (user, index) => ({
                    rank: index + 1,
                    userWalletAddress: user.walletAddress,
                    username: user.userName ?? '',
                    userTag: user.userTag ?? '',
                    profileImage: user.profileImage ?? null,
                    commentCount: user.totalComments ?? 0,
                }),
            );

            return Result.ok(result);
        } catch (error) {
            this.logger.error(`Get most commentors failed: ${error.message}`);
            return Result.fail(
                '댓글 랭킹 조회에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * @description 회원가입 (없으면 생성, 있으면 체크인 업데이트 후 반환)
     */
    async join(dto: JoinDto): Promise<Result<{ user: User; isNew: boolean }>> {
        try {
            // 신규 사용자는 repository에서 초기 체크인 포함해서 생성
            const { user, isNew } = await this.usersRepository.findOrCreate(
                dto,
                this.getTodayDateString(),
            );

            if (isNew) {
                // 신규 유저에게 퀘스트 4개 초기화
                await this.questRepository.initializeQuestsForUser(
                    user.walletAddress,
                );
                // 첫 체크인(streak=1) 반영하여 출석 퀘스트 업데이트
                await this.questRepository.updateAttendanceQuests(user);
                this.logger.log(`User created: ${dto.walletAddress}`);
                return Result.ok({ user, isNew });
            }

            // 기존 사용자 - 체크인 업데이트
            const updatedUser = await this.updateCheckIn(user);

            this.logger.log(`User found: ${dto.walletAddress}`);
            return Result.ok({ user: updatedUser, isNew });
        } catch (error) {
            this.logger.error(`Join failed: ${error.message}`);
            return Result.fail(
                '회원가입에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * @description 체크인 기록 업데이트
     */
    private async updateCheckIn(user: User): Promise<User> {
        const today = this.getTodayDateString();
        const yesterday = this.getYesterdayDateString();
        const history: CheckInRecord[] = user.checkInHistory ?? [];

        const lastCheckIn = history[history.length - 1];

        // 오늘 이미 체크인 했으면 그대로 반환
        if (lastCheckIn?.day === today) {
            return user;
        }

        let newStreak: number;
        if (lastCheckIn?.day === yesterday) {
            // 어제 체크인 했으면 연속 +1
            newStreak = lastCheckIn.currentStreak + 1;
        } else {
            // 연속이 끊겼으면 1부터 시작
            newStreak = 1;
        }

        const newHistory: CheckInRecord[] = [
            ...history,
            { day: today, currentStreak: newStreak },
        ];

        const updated = await this.usersRepository.update(user.walletAddress, {
            checkInHistory: newHistory,
        });

        if (updated) {
            await this.questRepository.updateAttendanceQuests(updated);
        }

        return updated!;
    }

    /**
     * @description 오늘 날짜 문자열 (YYYY-MM-DD)
     */
    private getTodayDateString(): string {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * @description 어제 날짜 문자열 (YYYY-MM-DD)
     */
    private getYesterdayDateString(): string {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }

    /**
     * @description 지갑 주소로 사용자 조회
     */
    async getUserByWalletAddress(
        walletAddress: string,
    ): Promise<Result<{ user: User | null }>> {
        try {
            const user =
                await this.usersRepository.findByWalletAddress(walletAddress);
            return Result.ok({ user });
        } catch (error) {
            this.logger.error(`Get user failed: ${error.message}`);
            return Result.fail(
                '사용자 조회에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * @description username과 userTag로 사용자 조회 (출석 체크 포함)
     */
    async getUserByUsernameAndUserTag(
        userName: string,
        userTag: string,
    ): Promise<Result<{ user: User | null }>> {
        try {
            const user = await this.usersRepository.findByUsernameAndUserTag(
                userName,
                userTag,
            );

            if (!user) {
                return Result.ok({ user: null });
            }

            // 출석 체크 업데이트
            const updatedUser = await this.updateCheckIn(user);
            this.logger.log(`User check-in updated: ${userName}#${userTag}`);

            return Result.ok({ user: updatedUser });
        } catch (error) {
            this.logger.error(`Get user by username failed: ${error.message}`);
            return Result.fail(
                '사용자 조회에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * @description 프로필 페이지 데이터 조회
     */
    async getProfilePageData(
        walletAddress: string,
    ): Promise<Result<ProfilePageData>> {
        try {
            const user =
                await this.usersRepository.findByWalletAddress(walletAddress);

            if (!user) {
                return Result.fail(
                    '사용자를 찾을 수 없습니다.',
                    HttpStatus.NOT_FOUND,
                );
            }

            //
            const commentCounts =
                await this.commentRepository.countByWalletAddress(
                    walletAddress,
                );

            const history: CheckInRecord[] = user.checkInHistory ?? [];
            const lastCheckIn = history[history.length - 1];
            const streakDays = lastCheckIn?.currentStreak ?? 0;

            return Result.ok({
                username: user.userName,
                connectedWallet: user.walletAddress,
                memexWallet: user.memexWalletAddress,
                commentCounts,
                streakDays,
            });
        } catch (error) {
            this.logger.error(`Get profile page data failed: ${error.message}`);
            return Result.fail(
                '프로필 데이터 조회에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * @description 토큰별 상금 랭킹 조회 (Game Ranking 탭)
     */
    async getGameRanking(): Promise<Result<{ gameRanking: GameRankItem[] }>> {
        try {
            const gameRankingRaw =
                await this.gameRepository.getGameRankingByToken(20);

            // 토큰 이미지 조회
            const tokenAddresses = gameRankingRaw.map((r) => r.tokenAddress);
            const tokens =
                await this.tokenRepository.findByTokenAddresses(tokenAddresses);
            const tokenMap = new Map(
                tokens.map((t) => [t.tokenAddress.toLowerCase(), t]),
            );

            const gameRanking: GameRankItem[] = gameRankingRaw.map(
                (item, index) => {
                    const token = tokenMap.get(item.tokenAddress.toLowerCase());
                    return {
                        rank: index + 1,
                        tokenImage: token?.tokenImageUrl ?? null,
                        tokenAddress: item.tokenAddress,
                        tokenSymbol: item.tokenSymbol,
                        totalPrize: item.totalPrize,
                    };
                },
            );

            return Result.ok({ gameRanking });
        } catch (error) {
            this.logger.error(`Get game ranking failed: ${error.message}`);
            return Result.fail(
                '게임 랭킹 조회에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * @description 게임별 상금 랭킹 조회 (Prize Ranking 탭)
     * winners 테이블에서 개별 게임 단위로 상금 순 정렬
     */
    async getPrizeRanking(
        limit?: number,
    ): Promise<Result<{ prizeRanking: PrizeRankItem[] }>> {
        try {
            const topWinners = await this.winnersRepository.getTopWinners(
                limit ?? 20,
            );

            // 유저 정보 조회 (profileImage, username)
            const walletAddresses = topWinners.map((w) => w.walletAddress);
            const users =
                await this.usersRepository.findByWalletAddresses(
                    walletAddresses,
                );
            const userMap = new Map(
                users.map((u: User) => [u.walletAddress.toLowerCase(), u]),
            );

            const prizeRanking: PrizeRankItem[] = topWinners.map(
                (winner, index) => {
                    const userInfo = userMap.get(
                        winner.walletAddress.toLowerCase(),
                    );
                    // wei -> ETH 변환 (소수점 없이 정수로)
                    const prizeInEth = Math.floor(
                        Number(BigInt(winner.prize) / BigInt(10 ** 18)),
                    ).toString();
                    return {
                        rank: index + 1,
                        profileImage: userInfo?.profileImage ?? null,
                        username: userInfo?.userName ?? null,
                        totalAmount: prizeInEth,
                        tokenAddress: winner.tokenAddress,
                        tokenSymbol: winner.tokenSymbol,
                    };
                },
            );

            return Result.ok({ prizeRanking });
        } catch (error) {
            this.logger.error(`Get prize ranking failed: ${error.message}`);
            return Result.fail(
                '상금 랭킹 조회에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * @description 내가 참여 중인 활성 게임 목록 조회 (참여 중인 게임 탭)
     */
    async getMyActiveGames(
        walletAddress: string,
    ): Promise<Result<{ myActiveGames: MyActiveGameItem[] }>> {
        try {
            // 1. 내가 댓글을 남긴 게임 ID 목록 조회
            const gameIds =
                await this.commentRepository.findGameIdsByWalletAddress(
                    walletAddress,
                );

            if (gameIds.length === 0) {
                return Result.ok({ myActiveGames: [] });
            }

            // 2. 해당 게임 중 활성 게임만 조회 (isEnded=false, isClaimed=false, order by prizePool)
            const activeGames =
                await this.gameRepository.findActiveGamesByIds(gameIds);

            if (activeGames.length === 0) {
                return Result.ok({ myActiveGames: [] });
            }

            // 3. 토큰 이미지 조회
            const tokenAddresses = activeGames.map((g) => g.tokenAddress);
            const tokens =
                await this.tokenRepository.findByTokenAddresses(tokenAddresses);
            const tokenMap = new Map(
                tokens.map((t) => [t.tokenAddress.toLowerCase(), t]),
            );

            const myActiveGames: MyActiveGameItem[] = activeGames.map(
                (game) => {
                    const token = tokenMap.get(game.tokenAddress.toLowerCase());
                    return {
                        gameId: game.gameId,
                        tokenImage: token?.tokenImageUrl ?? null,
                        tokenAddress: game.tokenAddress,
                        tokenSymbol: token?.tokenSymbol ?? null,
                        tokenUsername: token?.tokenUsername ?? null,
                        tokenUsertag: token?.tokenUsertag ?? null,
                        currentPrizePool: game.currentPrizePool,
                        endTime: game.endTime?.toISOString() ?? null,
                    };
                },
            );

            return Result.ok({ myActiveGames });
        } catch (error) {
            this.logger.error(`Get my active games failed: ${error.message}`);
            return Result.fail(
                '참여 중인 게임 조회에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
