import { z } from 'zod';

// 이더리움 주소 검증 (42자: 0x + 40자 hex)
const ethereumAddressSchema = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, '유효한 이더리움 주소여야 합니다')
    .transform((v) => v.toLowerCase());

// 트랜잭션 해시 검증 (66자: 0x + 64자 hex)
const txHashSchema = z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, '유효한 트랜잭션 해시여야 합니다')
    .transform((v) => v.toLowerCase());

// 숫자 문자열 검증 (BigInt를 문자열로 전송)
const numericStringSchema = z.string().regex(/^\d+$/, '숫자 문자열이어야 합니다');

/**
 * 블록체인 이벤트 리스닝용 스키마 (BigInt 직접 수신)
 * @deprecated 프론트엔드에서 직접 전송하는 방식으로 전환 중
 */
export const GameCreatedEventSchema = z.object({
    gameId: z.bigint().transform((v) => v.toString()),
    gameAddr: z.string().startsWith('0x'),
    gameTokenAddr: z.string().startsWith('0x'),
    tokenSymbol: z.string(),
    tokenName: z.string(),
    initiator: z.string().startsWith('0x'),
    gameTime: z.bigint().transform((v) => v.toString()),
    endTime: z.bigint().transform((v) => new Date(Number(v) * 1000)),
    cost: z.bigint().transform((v) => v.toString()),
    prizePool: z.bigint().transform((v) => v.toString()),
    lastCommentor: z.string().startsWith('0x'),
    isClaimed: z.boolean(),
});

export type GameCreatedEvent = z.infer<typeof GameCreatedEventSchema>;

/**
 * 프론트엔드 API 요청용 스키마 (문자열로 수신)
 * - JSON에서 BigInt를 직접 전송할 수 없으므로 문자열로 받음
 * - txHash로 중복 체크
 */
export const CreateGameDtoSchema = z.object({
    txHash: txHashSchema,
    gameId: numericStringSchema,
    gameAddr: ethereumAddressSchema,
    gameTokenAddr: ethereumAddressSchema,
    tokenSymbol: z.string().min(1),
    tokenName: z.string().min(1),
    initiator: ethereumAddressSchema,
    gameTime: numericStringSchema,
    endTime: numericStringSchema,
    cost: numericStringSchema,
    prizePool: numericStringSchema,
    lastCommentor: ethereumAddressSchema,
    isClaimed: z.boolean(),
});

export type CreateGameDto = z.infer<typeof CreateGameDtoSchema>;
