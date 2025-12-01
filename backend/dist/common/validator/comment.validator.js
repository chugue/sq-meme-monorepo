"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCommentDtoSchema = exports.CommentAddedEventSchema = void 0;
const zod_1 = require("zod");
const ethereumAddressSchema = zod_1.z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, '유효한 이더리움 주소여야 합니다')
    .transform((v) => v.toLowerCase());
const txHashSchema = zod_1.z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, '유효한 트랜잭션 해시여야 합니다')
    .transform((v) => v.toLowerCase());
const numericStringSchema = zod_1.z.string().regex(/^\d+$/, '숫자 문자열이어야 합니다');
exports.CommentAddedEventSchema = zod_1.z.object({
    gameAddress: zod_1.z.string().startsWith('0x'),
    commentor: zod_1.z.string().startsWith('0x'),
    message: zod_1.z.string(),
    newEndTime: zod_1.z.bigint().transform((v) => new Date(Number(v) * 1000)),
    prizePool: zod_1.z.bigint().transform((v) => v.toString()),
    timestamp: zod_1.z.bigint().transform((v) => new Date(Number(v) * 1000)),
});
exports.CreateCommentDtoSchema = zod_1.z.object({
    txHash: txHashSchema,
    gameAddress: ethereumAddressSchema,
    commentor: ethereumAddressSchema,
    message: zod_1.z.string().min(1, '메시지는 필수입니다'),
    newEndTime: numericStringSchema,
    prizePool: numericStringSchema,
    timestamp: numericStringSchema,
});
//# sourceMappingURL=comment.validator.js.map