import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    UsePipes,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import type { RegisterTransactionDto } from 'src/common/validator/transaction.validator';
import { RegisterTransactionSchema } from 'src/common/validator/transaction.validator';
import { TransactionRepository } from './transaction.repository';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionController {
    constructor(
        private readonly transactionRepository: TransactionRepository,
    ) {}

    /**
     * 프론트엔드에서 트랜잭션 해시를 등록
     * 백엔드에서 주기적으로 확인하여 이벤트 처리
     */
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ZodValidationPipe(RegisterTransactionSchema))
    async register(@Body() dto: RegisterTransactionDto) {
        const result = await this.transactionRepository.create({
            txHash: dto.txHash.toLowerCase(),
            gameAddress: dto.gameAddress.toLowerCase(),
            eventType: dto.eventType,
        });

        if (!result) {
            return {
                success: false,
                message: '이미 등록된 트랜잭션입니다.',
            };
        }

        return {
            success: true,
            message: '트랜잭션이 등록되었습니다.',
            data: {
                txHash: result.txHash,
                status: result.status,
            },
        };
    }
}
