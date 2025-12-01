import { PipeTransform } from '@nestjs/common';
export declare class EthereumAddressPipe implements PipeTransform<string, string> {
    private readonly addressRegex;
    transform(value: string): string;
}
