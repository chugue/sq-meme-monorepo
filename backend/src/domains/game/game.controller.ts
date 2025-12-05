import { Body, Controller, Get, HttpStatus, Param, Post } from '@nestjs/common';
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
import { Result } from 'src/common/types';
import { CreateGameByTxDtoSchema } from 'src/common/validator/game.validator';
import { GameService } from './game.service';

@ApiTags('Games')
@Controller('/v1/games')
export class GameController {
    constructor(private readonly gameService: GameService) {}

    @Post()
    @ApiCreateGame('게임 생성')
    async createGame(@Body() body: unknown) {
        return this.gameService.createGame(body);
    }

    @Post(':gameId/claim')
    @ApiRegisterClaimPrize('claimPrize 트랜잭션 등록')
    async registerClaimPrize(
        @Param('gameId') gameId: string,
        @Body() body: { txHash: string },
    ) {
        return this.gameService.processPrizeClaimedTransaction(
            body.txHash,
            gameId,
        );
    }

    @Get('by-token/:tokenAddress')
    @ApiGetGameByToken('토큰 주소로 게임 조회')
    async getGameByToken(@Param('tokenAddress') tokenAddress: string) {
        const game = await this.gameService.getGameByToken(tokenAddress);

        if (!game) {
            return Result.fail(
                `No game found for token address: ${tokenAddress}`,
                HttpStatus.NOT_FOUND,
            );
        }

        return Result.ok(game);
    }

    @Get('active/by-token/:tokenAddress')
    @ApiGetGameByToken('토큰 주소로 활성 게임 조회 (isEnded = false)')
    async getActiveGameByToken(@Param('tokenAddress') tokenAddress: string) {
        const game =
            await this.gameService.getActiveGameByToken(tokenAddress);

        if (!game) {
            return Result.fail(
                `No active game found for token address: ${tokenAddress}`,
                HttpStatus.NOT_FOUND,
            );
        }

        return Result.ok(game);
    }

    @Post('register')
    @ApiRegisterGame('블록체인에서 조회한 게임 등록')
    async registerGame(@Body() body: unknown) {
        return this.gameService.registerGame(body);
    }

    @Post('create-by-tx')
    @ApiCreateGameByTx('txHash로 게임 생성 (이벤트 파싱)')
    async createGameByTx(@Body() body: unknown) {
        const parsed = CreateGameByTxDtoSchema.safeParse(body);
        if (!parsed.success) {
            return Result.fail(parsed.error.message, HttpStatus.BAD_REQUEST);
        }

        return this.gameService.createGameByTx(parsed.data.txHash);
    }

    @Get('in-playing')
    @ApiGetGamesInPlaying('내가 참여 중인 게임 조회')
    async getGamesInPlaying(@WalletAddress() walletAddress: string) {
        return this.gameService.getGamesInPlaying(walletAddress);
    }

    /**
     * 현재 진행 중인 전체 활성 게임 목록 조회
     * (isEnded = false, isClaimed = false, 상금순 정렬)
     */
    @Get('live')
    async getLiveGames() {
        return this.gameService.getLiveGames();
    }
}
