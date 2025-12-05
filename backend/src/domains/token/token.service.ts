import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Token } from 'src/common/db/schema/token.schema';
import { Result } from 'src/common/types';
import { TokenRepository } from './token.repository';

@Injectable()
export class TokenService {
    private readonly logger = new Logger(TokenService.name);

    constructor(private readonly tokenRepository: TokenRepository) {}

    /**
     * 토큰 주소로 조회
     */
    async getTokenByAddress(
        tokenAddress: string,
    ): Promise<Result<{ token: Token | null }>> {
        try {
            const token =
                await this.tokenRepository.findByTokenAddress(tokenAddress);
            return Result.ok({ token });
        } catch (error) {
            this.logger.error(`getTokenByAddress failed: ${error.message}`);
            return Result.fail(
                '토큰 조회에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * username과 usertag로 조회
     */
    async getTokenByUsernameAndUsertag(
        username: string,
        usertag: string,
    ): Promise<Result<{ token: Token | null }>> {
        try {
            const token = await this.tokenRepository.findByUsernameAndUsertag(
                username,
                usertag,
            );
            return Result.ok({ token });
        } catch (error) {
            this.logger.error(
                `getTokenByUsernameAndUsertag failed: ${error.message}`,
            );
            return Result.fail(
                '토큰 조회에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * 토큰 정보 생성 또는 업데이트 (upsert)
     */
    async upsertToken(data: {
        tokenAddress: string;
        tokenUsername: string;
        tokenUsertag: string;
        tokenImageUrl?: string | null;
        tokenSymbol?: string | null;
    }): Promise<Result<{ token: Token }>> {
        try {
            const token = await this.tokenRepository.upsert({
                tokenAddress: data.tokenAddress,
                tokenUsername: data.tokenUsername,
                tokenUsertag: data.tokenUsertag,
                tokenImageUrl: data.tokenImageUrl ?? undefined,
                tokenSymbol: data.tokenSymbol ?? undefined,
            });

            this.logger.log(
                `Token upserted: ${data.tokenAddress} (${data.tokenUsername}/${data.tokenUsertag})`,
            );

            return Result.ok({ token });
        } catch (error) {
            this.logger.error(`upsertToken failed: ${error.message}`);
            return Result.fail(
                '토큰 저장에 실패했습니다.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
