import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FundersService } from './funders.service';

@ApiTags('Funders')
@Controller('/v1/funders')
export class FundersController {
    constructor(private readonly fundersService: FundersService) {}

    @Post()
    @ApiOperation({
        summary: 'Save funding by txHash (parse PrizePoolFunded event)',
    })
    async saveFunding(@Body() body: { txHash: string; userAddress?: string }) {
        return this.fundersService.saveFundingByTx(body.txHash, body.userAddress);
    }

    @Get('by-game/:gameId')
    @ApiOperation({ summary: 'Get funders by gameId' })
    async getFundersByGameId(@Param('gameId') gameId: string) {
        return this.fundersService.getFundersByGameId(gameId);
    }
}
