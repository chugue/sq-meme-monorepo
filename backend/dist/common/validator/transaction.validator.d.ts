import { z } from 'zod';
export declare const RegisterTransactionSchema: z.ZodObject<{
    txHash: z.ZodString;
    gameAddress: z.ZodString;
    eventType: z.ZodEnum<{
        PRIZE_CLAIMED: "PRIZE_CLAIMED";
        GAME_CREATED: "GAME_CREATED";
        COMMENT_ADDED: "COMMENT_ADDED";
    }>;
}, z.core.$strip>;
export type RegisterTransactionDto = z.infer<typeof RegisterTransactionSchema>;
