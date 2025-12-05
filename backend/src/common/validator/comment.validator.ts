import { z } from 'zod';

// 트랜잭션 해시 검증 (66자: 0x + 64자 hex)
const txHashSchema = z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, '유효한 트랜잭션 해시여야 합니다')
    .transform((v) => v.toLowerCase());

/**
 * 프론트엔드 API 요청용 스키마
 * - txHash만 받아서 블록체인에서 이벤트를 파싱하여 저장
 * - imageUrl은 이벤트에 없으므로 별도로 받음
 */
export const CreateCommentDtoSchema = z.object({
    txHash: txHashSchema,
    imageUrl: z.string().url().optional(), // 댓글 이미지 URL (선택, 이벤트에 없음)
});

export type CreateCommentDto = z.infer<typeof CreateCommentDtoSchema>;
