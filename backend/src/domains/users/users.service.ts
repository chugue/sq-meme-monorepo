import { Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/common/types';
import { UsersRepository } from './users.repository';
import { User } from 'src/common/db/schema/user.schema';
import { JoinDto } from './dto/join.dto';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(private readonly usersRepository: UsersRepository) {}

    /**
     * @description 로그인 (사용자 생성 또는 기존 사용자 반환)
     */
    async join(dto: JoinDto): Promise<Result<{ user: User }>> {
        try {
            const user = await this.usersRepository.upsert({
                walletAddress: dto.walletAddress,
                userName: dto.userName,
                userTag: dto.userTag,
                profileImage: dto.profileImage,
                memexLink: dto.memexLink,
                memexWalletAddress: dto.memexWalletAddress,
                myTokenAddr: dto.myTokenAddr,
                myTokenSymbol: dto.myTokenSymbol,
            });

            this.logger.log(`User logged in: ${dto.walletAddress}`);
            return Result.ok({ user });
        } catch (error) {
            this.logger.error(`Login failed: ${error.message}`);
            return Result.fail('로그인에 실패했습니다.');
        }
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
}
