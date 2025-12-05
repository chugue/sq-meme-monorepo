import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { TokenService } from './token.service';

@ApiTags('Tokens')
@Controller('/v1/tokens')
export class TokenController {
    constructor(private readonly tokenService: TokenService) {}

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
