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
    ApiCreateGameByTx,
    ApiGetGameByToken,
    ApiGetGamesInPlaying,
    ApiRegisterClaimPrize,
    ApiRegisterGame,
    WalletAddress,
} from 'src/common/decorators';
import { CreateGameByTxDtoSchema } from 'src/common/validator/game.validator';
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

    @Post(':gameId/claim')
    @HttpCode(HttpStatus.OK)
    @ApiRegisterClaimPrize('claimPrize 트랜잭션 등록')
    async registerClaimPrize(
        @Param('gameId') gameId: string,
        @Body() body: { txHash: string },
    ) {
        const success = await this.gameService.processPrizeClaimedTransaction(
            body.txHash,
            gameId,
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

    @Post('create-by-tx')
    @HttpCode(HttpStatus.CREATED)
    @ApiCreateGameByTx('txHash로 게임 생성 (이벤트 파싱)')
    async createGameByTx(@Body() body: unknown) {
        const parsed = CreateGameByTxDtoSchema.safeParse(body);
        if (!parsed.success) {
            throw new NotFoundException(parsed.error.message);
        }

        return this.gameService.createGameByTx(
            parsed.data.txHash,
            parsed.data.tokenImageUrl,
        );
    }

    @Get('in-playing')
    @ApiGetGamesInPlaying('내가 참여 중인 게임 조회')
    async getGamesInPlaying(@WalletAddress() walletAddress: string) {
        return this.gameService.getGamesInPlaying(walletAddress);
    }
}
