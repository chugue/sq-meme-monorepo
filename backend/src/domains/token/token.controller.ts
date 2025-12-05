import { Body, Controller, Get, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Result } from 'src/common/types';
import { UpsertTokenDtoSchema } from 'src/common/validator/token.validator';
import { TokenService } from './token.service';

class UpsertTokenSwaggerDto {
    tokenAddress: string;
    tokenUsername: string;
    tokenUsertag: string;
    tokenImageUrl?: string;
    tokenSymbol?: string;
}

@ApiTags('Tokens')
@Controller('/v1/tokens')
export class TokenController {
    constructor(private readonly tokenService: TokenService) {}

    /**
     * 토큰 정보 생성 또는 업데이트
     */
    @Post()
    @ApiOperation({ summary: '토큰 정보 생성/업데이트 (upsert)' })
    @ApiBody({ type: UpsertTokenSwaggerDto })
    async upsertToken(@Body() body: unknown) {
        const parsed = UpsertTokenDtoSchema.safeParse(body);
        if (!parsed.success) {
            return Result.fail(parsed.error.message, HttpStatus.BAD_REQUEST);
        }

        return this.tokenService.upsertToken(parsed.data);
    }

    /**
     * 토큰 주소로 조회
     */
    @Get('address/:tokenAddress')
    @ApiOperation({ summary: '토큰 주소로 조회' })
    @ApiParam({ name: 'tokenAddress', description: '토큰 컨트랙트 주소' })
    async getTokenByAddress(@Param('tokenAddress') tokenAddress: string) {
        return this.tokenService.getTokenByAddress(tokenAddress);
    }

    /**
     * username과 usertag로 조회
     */
    @Get(':username/:usertag')
    @ApiOperation({ summary: 'username/usertag로 토큰 조회' })
    @ApiParam({ name: 'username', description: 'MemeX 사용자 이름' })
    @ApiParam({ name: 'usertag', description: 'MemeX 사용자 태그' })
    async getTokenByUsernameAndUsertag(
        @Param('username') username: string,
        @Param('usertag') usertag: string,
    ) {
        return this.tokenService.getTokenByUsernameAndUsertag(username, usertag);
    }
}
