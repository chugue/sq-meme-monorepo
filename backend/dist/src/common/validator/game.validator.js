"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameCreatedEventSchema = void 0;
const zod_1 = require("zod");
exports.GameCreatedEventSchema = zod_1.z.object({
    gameId: zod_1.z.bigint().transform((v) => v.toString()),
    gameAddr: zod_1.z.string().startsWith('0x'),
    gameTokenAddr: zod_1.z.string().startsWith('0x'),
    initiator: zod_1.z.string().startsWith('0x'),
    gameTime: zod_1.z.bigint().transform((v) => v.toString()),
    endTime: zod_1.z.bigint().transform((v) => new Date(Number(v) * 1000)),
    cost: zod_1.z.bigint().transform((v) => v.toString()),
    prizePool: zod_1.z.bigint().transform((v) => v.toString()),
    lastCommentor: zod_1.z.string().startsWith('0x'),
    isEnded: zod_1.z.boolean(),
});
//# sourceMappingURL=game.validator.js.map