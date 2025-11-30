import { Global, Module } from '@nestjs/common';
import { EthereumProvider } from './providers';

@Global()
@Module({
    providers: [EthereumProvider],
    exports: [EthereumProvider],
})
export class CommonModule {}
