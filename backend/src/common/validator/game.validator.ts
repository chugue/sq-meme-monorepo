import { z } from 'zod';

export const GameCreatedEventSchema = z.object({
    gameId: z.bigint().transform((v) => v.toString()), // BigInt -> String 변환
    gameAddr: z.string().startsWith('0x'),
    gameTokenAddr: z.string().startsWith('0x'),
    initiator: z.string().startsWith('0x'),
    gameTime: z.bigint().transform((v) => v.toString()), // 게임 시간 (초)
    remainTime: z.bigint().transform((v) => v.toString()),
    endTime: z.bigint().transform((v) => new Date(Number(v) * 1000)), // Unix -> Date 변환
    cost: z.bigint().transform((v) => v.toString()),
    prizePool: z.bigint().transform((v) => v.toString()),
    isEnded: z.boolean(),
    lastCommentor: z.string().startsWith('0x'),
});

// 타입 자동 추론
export type GameCreatedEvent = z.infer<typeof GameCreatedEventSchema>;
