import { z } from 'zod';
export declare const CommentAddedEventSchema: z.ZodObject<{
    gameAddress: z.ZodString;
    commentor: z.ZodString;
    message: z.ZodString;
    newEndTime: z.ZodPipe<z.ZodBigInt, z.ZodTransform<Date, bigint>>;
    prizePool: z.ZodPipe<z.ZodBigInt, z.ZodTransform<string, bigint>>;
    timestamp: z.ZodPipe<z.ZodBigInt, z.ZodTransform<Date, bigint>>;
}, z.core.$strip>;
export type CommentAddedEvent = z.infer<typeof CommentAddedEventSchema>;
