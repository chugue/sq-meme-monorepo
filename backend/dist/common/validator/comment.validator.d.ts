import { z } from 'zod';
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
