import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WalletAddress } from 'src/common/decorators';
import { JoinDto } from './dto/join.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('/v1/users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    /**
     * 회원가입 (지갑 연결 시 사용자 생성 또는 조회)
     */
    @Post('join')
    @HttpCode(HttpStatus.OK)
    async join(@Body() body: JoinDto) {
        return this.usersService.join(body);
    }

    /**
     * 현재 로그인한 사용자 정보 조회
     */
    @Get('me')
    async getMe(@WalletAddress() walletAddress: string) {
        return this.usersService.getUserByWalletAddress(walletAddress);
    }

    /**
     * username과 userTag로 사용자 조회 (출석 체크 포함)
     */
    @Get('/:username/:userTag')
    async getUser(
        @Param('username') username: string,
        @Param('userTag') userTag: string,
    ) {
        return this.usersService.getUserByUsernameAndUserTag(username, userTag);
    }

    /**
     * 프로필 페이지 데이터 조회
     */
    @Get('profile')
    async getProfilePageData(@WalletAddress() walletAddress: string) {
        return this.usersService.getProfilePageData(walletAddress);
    }
}
