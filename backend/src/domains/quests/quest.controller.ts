import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WalletAddress } from 'src/common/decorators';
import { QuestService } from './quest.service';

@ApiTags('Quests')
@Controller('/v1/quests')
export class QuestController {
    constructor(private readonly questService: QuestService) {}

    /**
     * 퀘스트 목록 조회 (Quests 탭)
     */
    @Get()
    async getQuests(@WalletAddress() walletAddress: string) {
        return this.questService.getQuests(walletAddress);
    }

    @Post('/claim/:questId')
    async claimQuest(
        @WalletAddress() walletAddress: string,
        @Param('questId') questId: number,
    ) {
        return this.questService.claimQuest(walletAddress, questId);
    }

    /**
     * 퀘스트 초기화 (테스트용) - 지갑 주소에 4개 퀘스트 생성
     */
    @Post('/init')
    async initializeQuests(@Body() body: { walletAddress: string }) {
        return this.questService.initializeQuests(body.walletAddress);
    }
}
