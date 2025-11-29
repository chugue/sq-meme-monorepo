import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config({ path: ['./.env.local', '../.env'] });

export default defineConfig({
    schema: './src/common/db/schema/index.ts',
    out: './src/common/db/drizzle',
    dialect: 'postgresql',
    schemaFilter: ['squid_meme'],
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});
