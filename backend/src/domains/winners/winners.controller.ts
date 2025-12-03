import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WinnersService } from './winners.service';

@ApiTags('Winners')
@Controller('/v1/winners')
export class WinnersController {
    constructor(private readonly winnersService: WinnersService) {}

    @Get('top')
    @ApiOperation({ summary: 'Get top winners by total prize amount' })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of top winners to return (default: 10)',
        example: 10,
    })
    @ApiResponse({
        status: 200,
        description: 'List of top winners',
    })
    async getTopWinners(@Query('limit') limit?: string) {
        const parsedLimit = limit ? parseInt(limit, 10) : 10;
        return this.winnersService.getTopWinners(parsedLimit);
    }

    @Get('by-wallet/:walletAddress')
    @ApiOperation({ summary: 'Get winner history by wallet address' })
    @ApiParam({
        name: 'walletAddress',
        description: 'User wallet address (0x...)',
        example: '0x1234567890123456789012345678901234567890',
    })
    @ApiResponse({
        status: 200,
        description: 'List of winner records for the wallet',
    })
    async getWinnersByWallet(@Param('walletAddress') walletAddress: string) {
        return this.winnersService.getWinnersByWallet(walletAddress);
    }
}
