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
    initiator: ethereumAddressSchema,
    gameTime: numericStringSchema,
    endTime: numericStringSchema,
    cost: numericStringSchema,
    prizePool: numericStringSchema,
    lastCommentor: ethereumAddressSchema,
    isClaimed: z.boolean(),
});

export type CreateGameDto = z.infer<typeof CreateGameDtoSchema>;

/**
 * 블록체인에서 조회한 게임 등록 스키마 (V2 ABI 전체 필드, txHash 없음)
 */
export const RegisterGameDtoSchema = z.object({
    gameId: numericStringSchema,
    initiator: ethereumAddressSchema,
    gameToken: ethereumAddressSchema,
    cost: numericStringSchema,
    gameTime: numericStringSchema,
    tokenSymbol: z.string().min(1),
    endTime: numericStringSchema,
    lastCommentor: ethereumAddressSchema,
    prizePool: numericStringSchema,
    isClaimed: z.boolean(),
    isEnded: z.boolean(),
    totalFunding: numericStringSchema,
    funderCount: numericStringSchema,
});

export type RegisterGameDto = z.infer<typeof RegisterGameDtoSchema>;

/**
 * txHash로 게임 생성 스키마 (V2)
 * - 백엔드에서 txHash로 영수증을 가져와서 GameCreated 이벤트 파싱
 * - tokenImageUrl은 이벤트에 없는 정보이므로 프론트엔드에서 전달
 */
export const CreateGameByTxDtoSchema = z.object({
    txHash: txHashSchema,
    tokenImageUrl: z.string().optional(),
});

export type CreateGameByTxDto = z.infer<typeof CreateGameByTxDtoSchema>;
