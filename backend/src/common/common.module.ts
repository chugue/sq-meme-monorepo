import { Global, Module } from '@nestjs/common';
import { EthereumProvider } from './providers';
import { SupabaseModule } from './supabase/supabase.module';

@Global()
@Module({
    imports: [SupabaseModule],
    providers: [EthereumProvider],
    exports: [EthereumProvider, SupabaseModule],
})
export class CommonModule {}
