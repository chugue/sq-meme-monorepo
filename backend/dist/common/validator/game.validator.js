"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateGameDtoSchema = void 0;
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
exports.CreateGameDtoSchema = zod_1.z.object({
    txHash: txHashSchema,
    gameId: numericStringSchema,
    gameAddr: ethereumAddressSchema,
    gameTokenAddr: ethereumAddressSchema,
    tokenSymbol: zod_1.z.string().min(1),
    tokenName: zod_1.z.string().min(1),
    initiator: ethereumAddressSchema,
    gameTime: numericStringSchema,
    endTime: numericStringSchema,
    cost: numericStringSchema,
    prizePool: numericStringSchema,
    lastCommentor: ethereumAddressSchema,
    isClaimed: zod_1.z.boolean(),
});
//# sourceMappingURL=game.validator.js.map