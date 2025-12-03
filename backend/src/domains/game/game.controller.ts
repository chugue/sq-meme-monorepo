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
import { ApiTags } from '@nestjs/swagger';
import {
    ApiCreateGame,
    ApiGetGameByToken,
    ApiRegisterClaimPrize,
    ApiRegisterGame,
} from 'src/common/decorators';
import { GameRepository } from './game.repository';
import { GameService } from './game.service';

@ApiTags('Games')
@Controller('/v1/games')
export class GameController {
    constructor(
        private readonly gameRepository: GameRepository,
        private readonly gameService: GameService,
    ) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiCreateGame('게임 생성')
    async createGame(@Body() body: unknown) {
        return this.gameService.createGame(body);
    }

    @Post(':gameAddress/claim')
    @HttpCode(HttpStatus.OK)
    @ApiRegisterClaimPrize('claimPrize 트랜잭션 등록')
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
    @ApiGetGameByToken('토큰 주소로 게임 조회')
    async getGameByToken(@Param('tokenAddress') tokenAddress: string) {
        const game = await this.gameRepository.findByTokenAddress(tokenAddress);

        if (!game) {
            throw new NotFoundException(
                `No game found for token address: ${tokenAddress}`,
            );
        }

        return game;
    }

    @Get('active/by-token/:tokenAddress')
    @ApiGetGameByToken('토큰 주소로 활성 게임 조회 (isEnded = false)')
    async getActiveGameByToken(@Param('tokenAddress') tokenAddress: string) {
        const game =
            await this.gameRepository.findActiveByTokenAddress(tokenAddress);

        if (!game) {
            throw new NotFoundException(
                `No active game found for token address: ${tokenAddress}`,
            );
        }

        return game;
    }

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @ApiRegisterGame('블록체인에서 조회한 게임 등록')
    async registerGame(@Body() body: unknown) {
        return this.gameService.registerGame(body);
    }
}
