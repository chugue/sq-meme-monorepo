import { z } from 'zod';
export declare const CreateGameDtoSchema: z.ZodObject<{
    txHash: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    gameId: z.ZodString;
    gameAddr: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    gameTokenAddr: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    tokenSymbol: z.ZodString;
    tokenName: z.ZodString;
    initiator: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    gameTime: z.ZodString;
    endTime: z.ZodString;
    cost: z.ZodString;
    prizePool: z.ZodString;
    lastCommentor: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    isClaimed: z.ZodBoolean;
}, z.core.$strip>;
export type CreateGameDto = z.infer<typeof CreateGameDtoSchema>;
