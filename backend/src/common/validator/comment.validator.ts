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
export const CreateCommentDtoSchema = z.object({
    txHash: txHashSchema,
    gameId: numericStringSchema, // 컨트랙트상의 게임 ID
    gameAddress: ethereumAddressSchema.optional(), // deprecated: gameId로 대체
    commentor: ethereumAddressSchema,
    message: z.string().min(1, '메시지는 필수입니다'),
    imageUrl: z.string().url().optional(), // 댓글 이미지 URL (선택)
    newEndTime: numericStringSchema,
    prizePool: numericStringSchema,
    timestamp: numericStringSchema,
});

export type CreateCommentDto = z.infer<typeof CreateCommentDtoSchema>;
