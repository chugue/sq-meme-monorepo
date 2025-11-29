"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CommentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const db_module_1 = require("../../common/db/db.module");
const schema = __importStar(require("../../common/db/schema"));
const types_1 = require("../../common/types");
let CommentService = CommentService_1 = class CommentService {
    db;
    logger = new common_1.Logger(CommentService_1.name);
    constructor(db) {
        this.db = db;
    }
    async toggleLike(userAddress, commentId) {
        try {
            const normalizedAddress = userAddress.toLowerCase();
            const [comment] = await this.db
                .select({ id: schema.comments.id })
                .from(schema.comments)
                .where((0, drizzle_orm_1.eq)(schema.comments.id, commentId))
                .limit(1);
            if (!comment) {
                return types_1.Result.fail('댓글을 찾을 수 없습니다');
            }
            const data = await this.db.transaction(async (tx) => {
                const existingLike = await tx
                    .select()
                    .from(schema.commentLikes)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.commentLikes.commentId, commentId), (0, drizzle_orm_1.eq)(schema.commentLikes.userAddress, normalizedAddress)))
                    .limit(1);
                let liked;
                if (existingLike.length > 0) {
                    await tx
                        .delete(schema.commentLikes)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.commentLikes.commentId, commentId), (0, drizzle_orm_1.eq)(schema.commentLikes.userAddress, normalizedAddress)));
                    await tx
                        .update(schema.comments)
                        .set({
                        likeCount: (0, drizzle_orm_1.sql) `${schema.comments.likeCount} - 1`,
                    })
                        .where((0, drizzle_orm_1.eq)(schema.comments.id, commentId));
                    liked = false;
                    this.logger.log(`좋아요 취소: 댓글 ${commentId}, 사용자 ${normalizedAddress}`);
                }
                else {
                    await tx.insert(schema.commentLikes).values({
                        commentId,
                        userAddress: normalizedAddress,
                    });
                    await tx
                        .update(schema.comments)
                        .set({
                        likeCount: (0, drizzle_orm_1.sql) `${schema.comments.likeCount} + 1`,
                    })
                        .where((0, drizzle_orm_1.eq)(schema.comments.id, commentId));
                    liked = true;
                    this.logger.log(`좋아요 추가: 댓글 ${commentId}, 사용자 ${normalizedAddress}`);
                }
                const [updatedComment] = await tx
                    .select({ likeCount: schema.comments.likeCount })
                    .from(schema.comments)
                    .where((0, drizzle_orm_1.eq)(schema.comments.id, commentId));
                return {
                    liked,
                    likeCount: updatedComment?.likeCount ?? 0,
                };
            });
            return types_1.Result.ok(data);
        }
        catch (error) {
            this.logger.error(`좋아요 토글 실패: ${error.message}`);
            return types_1.Result.fail('좋아요 처리 중 오류가 발생했습니다');
        }
    }
    async getLikeCount(commentId) {
        try {
            const [comment] = await this.db
                .select({ likeCount: schema.comments.likeCount })
                .from(schema.comments)
                .where((0, drizzle_orm_1.eq)(schema.comments.id, commentId));
            if (!comment) {
                return types_1.Result.fail('댓글을 찾을 수 없습니다');
            }
            return types_1.Result.ok({ likeCount: comment.likeCount });
        }
        catch (error) {
            this.logger.error(`좋아요 수 조회 실패: ${error.message}`);
            return types_1.Result.fail('좋아요 수 조회 중 오류가 발생했습니다');
        }
    }
    async hasUserLiked(userAddress, commentId) {
        try {
            const normalizedAddress = userAddress.toLowerCase();
            const [like] = await this.db
                .select()
                .from(schema.commentLikes)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.commentLikes.commentId, commentId), (0, drizzle_orm_1.eq)(schema.commentLikes.userAddress, normalizedAddress)))
                .limit(1);
            return types_1.Result.ok({ liked: !!like });
        }
        catch (error) {
            this.logger.error(`좋아요 여부 확인 실패: ${error.message}`);
            return types_1.Result.fail('좋아요 여부 확인 중 오류가 발생했습니다');
        }
    }
    async getUserLikedMap(userAddress, commentIds) {
        try {
            if (commentIds.length === 0) {
                return types_1.Result.ok(new Map());
            }
            const normalizedAddress = userAddress.toLowerCase();
            const likes = await this.db
                .select({ commentId: schema.commentLikes.commentId })
                .from(schema.commentLikes)
                .where((0, drizzle_orm_1.eq)(schema.commentLikes.userAddress, normalizedAddress));
            const likedSet = new Set(likes.map((l) => l.commentId));
            const result = new Map();
            for (const id of commentIds) {
                result.set(id, likedSet.has(id));
            }
            return types_1.Result.ok(result);
        }
        catch (error) {
            this.logger.error(`좋아요 일괄 조회 실패: ${error.message}`);
            return types_1.Result.fail('좋아요 일괄 조회 중 오류가 발생했습니다');
        }
    }
};
exports.CommentService = CommentService;
exports.CommentService = CommentService = CommentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(db_module_1.DrizzleAsyncProvider)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], CommentService);
//# sourceMappingURL=comment.service.js.map