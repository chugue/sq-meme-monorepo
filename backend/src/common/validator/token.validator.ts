import { z } from 'zod';

// 이더리움 주소 검증 (42자: 0x + 40자 hex)
const ethereumAddressSchema = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, '유효한 이더리움 주소여야 합니다')
    .transform((v) => v.toLowerCase());

/**
 * 토큰 정보 upsert 스키마
 */
export const UpsertTokenDtoSchema = z.object({
    tokenAddress: ethereumAddressSchema,
    tokenUsername: z.string().min(1, '사용자 이름은 필수입니다'),
    tokenUsertag: z.string().min(1, '사용자 태그는 필수입니다'),
    tokenImageUrl: z.string().url().optional().nullable(),
    tokenSymbol: z.string().optional().nullable(),
});

export type UpsertTokenDto = z.infer<typeof UpsertTokenDtoSchema>;
