import { z } from 'zod';
export declare const GameCreatedEventSchema: z.ZodObject<{
    gameId: z.ZodPipe<z.ZodBigInt, z.ZodTransform<string, bigint>>;
    gameAddr: z.ZodString;
    gameTokenAddr: z.ZodString;
    initiator: z.ZodString;
    gameTime: z.ZodPipe<z.ZodBigInt, z.ZodTransform<string, bigint>>;
    endTime: z.ZodPipe<z.ZodBigInt, z.ZodTransform<Date, bigint>>;
    cost: z.ZodPipe<z.ZodBigInt, z.ZodTransform<string, bigint>>;
    prizePool: z.ZodPipe<z.ZodBigInt, z.ZodTransform<string, bigint>>;
    lastCommentor: z.ZodString;
    isEnded: z.ZodBoolean;
}, z.core.$strip>;
export type GameCreatedEvent = z.infer<typeof GameCreatedEventSchema>;
