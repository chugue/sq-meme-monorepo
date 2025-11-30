"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentAddedEventSchema = void 0;
const zod_1 = require("zod");
exports.CommentAddedEventSchema = zod_1.z.object({
    gameAddress: zod_1.z.string().startsWith('0x'),
    commentor: zod_1.z.string().startsWith('0x'),
    message: zod_1.z.string(),
    newEndTime: zod_1.z.bigint().transform((v) => new Date(Number(v) * 1000)),
    prizePool: zod_1.z.bigint().transform((v) => v.toString()),
    timestamp: zod_1.z.bigint().transform((v) => new Date(Number(v) * 1000)),
});
//# sourceMappingURL=comment.validator.js.map