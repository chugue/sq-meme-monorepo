import { z } from 'zod';

export const GameCreatedEventSchema = z.object({
    gameId: z.bigint().transform((v) => v.toString()),
    gameAddr: z.string().startsWith('0x'),
    gameTokenAddr: z.string().startsWith('0x'),
    initiator: z.string().startsWith('0x'),
    gameTime: z.bigint().transform((v) => v.toString()),
    endTime: z.bigint().transform((v) => new Date(Number(v) * 1000)),
    cost: z.bigint().transform((v) => v.toString()),
    prizePool: z.bigint().transform((v) => v.toString()),
    lastCommentor: z.string().startsWith('0x'),
    isEnded: z.boolean(),
});

// 타입 자동 추론
export type GameCreatedEvent = z.infer<typeof GameCreatedEventSchema>;
