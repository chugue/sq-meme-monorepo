import { BadRequestException, PipeTransform } from '@nestjs/common';

/**
 * 이더리움 주소 형식을 검증하고 소문자로 변환하는 파이프
 * @example
 * async getGame(@Param('address', EthereumAddressPipe) address: string) { ... }
 */
export class EthereumAddressPipe implements PipeTransform<string, string> {
    private readonly addressRegex = /^0x[a-fA-F0-9]{40}$/;

    transform(value: string): string {
        if (!value || !this.addressRegex.test(value)) {
            throw new BadRequestException('유효한 이더리움 주소가 아닙니다');
        }

        return value.toLowerCase();
    }
}
