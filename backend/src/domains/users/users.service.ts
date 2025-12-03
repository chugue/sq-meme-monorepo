import { Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/common/types';
import { UsersRepository } from './users.repository';
import { User, CheckInRecord } from 'src/common/db/schema/user.schema';
import { JoinDto } from './dto/join.dto';
import { CommentRepository } from '../comment/comment.repository';

export interface ProfilePageData {
    username: string | null;
    connectedWallet: string;
    memexWallet: string | null;
    commentCounts: number;
    streakDays: number;
}

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        private readonly usersRepository: UsersRepository,
        private readonly commentRepository: CommentRepository,
    ) {}

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
                this.logger.log(`User created: ${dto.walletAddress}`);
                return Result.ok({ user, isNew });
            }

            // 기존 사용자 - 체크인 업데이트
            const updatedUser = await this.updateCheckIn(user);
            this.logger.log(`User found: ${dto.walletAddress}`);
            return Result.ok({ user: updatedUser, isNew });
        } catch (error) {
            this.logger.error(`Join failed: ${error.message}`);
            return Result.fail('회원가입에 실패했습니다.');
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
            return Result.fail('사용자 조회에 실패했습니다.');
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
                return Result.fail('사용자를 찾을 수 없습니다.');
            }

            const commentCounts =
                await this.commentRepository.countByWalletAddress(walletAddress);

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
            return Result.fail('프로필 데이터 조회에 실패했습니다.');
        }
    }
}
