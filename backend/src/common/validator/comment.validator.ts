import { z } from 'zod';

export const CommentAddedEventSchema = z.object({
    gameAddress: z.string().startsWith('0x'), // 로그에서 추출해야 함 (address)
    commentor: z.string().startsWith('0x'),
    message: z.string(),
    newEndTime: z.bigint().transform((v) => new Date(Number(v) * 1000)),
    prizePool: z.bigint().transform((v) => v.toString()),
    timestamp: z.bigint().transform((v) => new Date(Number(v) * 1000)),
});

export type CommentAddedEvent = z.infer<typeof CommentAddedEventSchema>;
