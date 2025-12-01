import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GameRepository } from './game.repository';
import { GameService } from './game.service';

@ApiTags('Games')
@Controller('/v1/games')
export class GameController {
    constructor(
        private readonly gameRepository: GameRepository,
        private readonly gameService: GameService,
    ) {}

    /**
     * 프론트엔드에서 트랜잭션 완료 후 게임 데이터 저장
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createGame(@Body() body: unknown) {
        return this.gameService.createGame(body);
    }

    /**
     * 프론트엔드에서 claimPrize 트랜잭션 완료 후 txHash 등록
     * 백엔드에서 트랜잭션 영수증을 확인하고 isClaimed 상태 업데이트
     */
    @Post(':gameAddress/claim')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'claimPrize 트랜잭션 등록' })
    @ApiParam({
        name: 'gameAddress',
        description: '게임 컨트랙트 주소',
        example: '0x1234567890123456789012345678901234567890',
    })
    @ApiResponse({
        status: 200,
        description: '상금 수령 처리 완료',
    })
    async registerClaimPrize(
        @Param('gameAddress') gameAddress: string,
        @Body() body: { txHash: string },
    ) {
        const success = await this.gameService.processPrizeClaimedTransaction(
            body.txHash,
            gameAddress,
        );

        return {
            success,
            message: success ? '상금 수령 처리 완료' : '상금 수령 처리 실패',
        };
    }

    @Get('by-token/:tokenAddress')
    @ApiOperation({ summary: '토큰 주소로 게임 조회' })
    @ApiParam({
        name: 'tokenAddress',
        description: '게임 토큰 컨트랙트 주소 (0x...)',
        example: '0xfda7278df9b004e05dbaa367fc2246a4a46271c9',
    })
    @ApiResponse({
        status: 200,
        description: '게임 정보',
    })
    @ApiResponse({
        status: 404,
        description: '해당 토큰으로 생성된 게임이 없습니다',
    })
    async getGameByToken(@Param('tokenAddress') tokenAddress: string) {
        const game = await this.gameRepository.findByTokenAddress(tokenAddress);

        if (!game) {
            throw new NotFoundException(
                `No game found for token address: ${tokenAddress}`,
            );
        }

        return game;
    }
}
