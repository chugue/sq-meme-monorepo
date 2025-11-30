import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GameRepository } from './game.repository';

@ApiTags('Games')
@Controller('/v1/games')
export class GameController {
    constructor(private readonly gameRepository: GameRepository) {}

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
