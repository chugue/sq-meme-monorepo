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
export declare const CreateCommentDtoSchema: z.ZodObject<{
    txHash: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    gameAddress: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    commentor: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    message: z.ZodString;
    newEndTime: z.ZodString;
    prizePool: z.ZodString;
    timestamp: z.ZodString;
}, z.core.$strip>;
export type CreateCommentDto = z.infer<typeof CreateCommentDtoSchema>;
