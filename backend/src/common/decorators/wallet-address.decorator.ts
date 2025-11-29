import {
    createParamDecorator,
    ExecutionContext,
    BadRequestException,
} from '@nestjs/common';

/**
 * @description 요청 헤더에서 지갑 주소를 추출하는 데코레이터
 * @example
 * ```typescript
 * @Post(':id/like')
 * async toggleLike(@WalletAddress() userAddress: string) { ... }
 * ```
 */
export const WalletAddress = createParamDecorator(
    (data: { required?: boolean } = { required: true }, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const walletAddress = request.headers['x-wallet-address'] as string;

        if (data.required && !walletAddress) {
            throw new BadRequestException('x-wallet-address 헤더가 필요합니다');
        }

        return walletAddress?.toLowerCase();
    },
);
