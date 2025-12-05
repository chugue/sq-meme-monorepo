import { Module } from '@nestjs/common';
import { TokenController } from './token.controller';
import { TokenRepository } from './token.repository';
import { TokenService } from './token.service';

@Module({
    controllers: [TokenController],
    providers: [TokenService, TokenRepository],
    exports: [TokenService, TokenRepository],
})
export class TokenModule {}
