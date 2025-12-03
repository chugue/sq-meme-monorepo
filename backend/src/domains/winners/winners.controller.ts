import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiGetTopWinners, ApiGetWinnersByWallet } from 'src/common/decorators/swagger.decorator';
import { WinnersService } from './winners.service';

@ApiTags('Winners')
@Controller('/v1/winners')
export class WinnersController {
    constructor(private readonly winnersService: WinnersService) {}

    @Get('top')
    @ApiGetTopWinners()
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of top winners to return (default: 10)',
        example: 10,
    })
    async getTopWinners(@Query('limit') limit?: string) {
        const parsedLimit = limit ? parseInt(limit, 10) : 10;
        return this.winnersService.getTopWinners(parsedLimit);
    }

    @Get('by-wallet/:walletAddress')
    @ApiGetWinnersByWallet()
    async getWinnersByWallet(@Param('walletAddress') walletAddress: string) {
        return this.winnersService.getWinnersByWallet(walletAddress);
    }
}
