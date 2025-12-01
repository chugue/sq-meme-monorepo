import { z } from 'zod';

// 이더리움 주소 검증 (42자: 0x + 40자 hex)
const ethereumAddressSchema = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, '유효한 이더리움 주소여야 합니다');

// 트랜잭션 해시 검증 (66자: 0x + 64자 hex)
const txHashSchema = z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, '유효한 트랜잭션 해시여야 합니다');

// 이벤트 타입
const eventTypeSchema = z.enum(['PRIZE_CLAIMED', 'GAME_CREATED', 'COMMENT_ADDED']);

export const RegisterTransactionSchema = z.object({
    txHash: txHashSchema,
    gameAddress: ethereumAddressSchema,
    eventType: eventTypeSchema,
});

export type RegisterTransactionDto = z.infer<typeof RegisterTransactionSchema>;
