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
var CommentRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentRepository = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const db_module_1 = require("../../common/db/db.module");
const schema = __importStar(require("../../common/db/schema"));
const comment_validator_1 = require("../../common/validator/comment.validator");
let CommentRepository = CommentRepository_1 = class CommentRepository {
    db;
    logger = new common_1.Logger(CommentRepository_1.name);
    constructor(db) {
        this.db = db;
    }
    async addComments(rawEvents) {
        if (rawEvents.length === 0)
            return;
        const comments = rawEvents
            .map((event) => {
            const result = comment_validator_1.CommentAddedEventSchema.safeParse(event);
            if (!result.success) {
                this.logger.error(`Invalid comment event: ${result.error}`);
                return null;
            }
            return result.data;
        })
            .filter((c) => c !== null);
        if (comments.length === 0)
            return;
        for (const comment of comments) {
            try {
                await this.db.transaction(async (tx) => {
                    await tx.insert(schema.comments).values({
                        gameAddress: comment.gameAddress,
                        commentor: comment.commentor,
                        message: comment.message,
                        likeCount: 0,
                        endTime: comment.newEndTime,
                        currentPrizePool: comment.prizePool,
                        isWinnerComment: false,
                        createdAt: comment.timestamp,
                    });
                    await tx
                        .update(schema.games)
                        .set({
                        endTime: comment.newEndTime,
                        prizePool: comment.prizePool,
                        lastCommentor: comment.commentor,
                    })
                        .where((0, drizzle_orm_1.eq)(schema.games.gameAddress, comment.gameAddress));
                });
                this.logger.log(`댓글 저장 완료: 게임 ${comment.gameAddress}`);
            }
            catch (error) {
                this.logger.error(`댓글 저장 실패: ${error.message}`);
            }
        }
    }
    async findByGameAddress(gameAddress) {
        return await this.db
            .select()
            .from(schema.comments)
            .where((0, drizzle_orm_1.eq)(schema.comments.gameAddress, gameAddress.toLowerCase()))
            .orderBy(schema.comments.createdAt);
    }
    async findById(commentId) {
        const [comment] = await this.db
            .select({ id: schema.comments.id })
            .from(schema.comments)
            .where((0, drizzle_orm_1.eq)(schema.comments.id, commentId))
            .limit(1);
        return comment ?? null;
    }
    async toggleLike(commentId, userAddress) {
        return await this.db.transaction(async (tx) => {
            const existingLike = await tx
                .select()
                .from(schema.commentLikes)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.commentLikes.commentId, commentId), (0, drizzle_orm_1.eq)(schema.commentLikes.userAddress, userAddress)))
                .limit(1);
            let liked;
            if (existingLike.length > 0) {
                await tx
                    .delete(schema.commentLikes)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.commentLikes.commentId, commentId), (0, drizzle_orm_1.eq)(schema.commentLikes.userAddress, userAddress)));
                await tx
                    .update(schema.comments)
                    .set({ likeCount: (0, drizzle_orm_1.sql) `${schema.comments.likeCount} - 1` })
                    .where((0, drizzle_orm_1.eq)(schema.comments.id, commentId));
                liked = false;
            }
            else {
                await tx.insert(schema.commentLikes).values({
                    commentId,
                    userAddress,
                });
                await tx
                    .update(schema.comments)
                    .set({ likeCount: (0, drizzle_orm_1.sql) `${schema.comments.likeCount} + 1` })
                    .where((0, drizzle_orm_1.eq)(schema.comments.id, commentId));
                liked = true;
            }
            const [updatedComment] = await tx
                .select({ likeCount: schema.comments.likeCount })
                .from(schema.comments)
                .where((0, drizzle_orm_1.eq)(schema.comments.id, commentId));
            return { liked, likeCount: updatedComment?.likeCount ?? 0 };
        });
    }
    async getLikeCount(commentId) {
        const [comment] = await this.db
            .select({ likeCount: schema.comments.likeCount })
            .from(schema.comments)
            .where((0, drizzle_orm_1.eq)(schema.comments.id, commentId));
        return comment ?? null;
    }
    async hasUserLiked(commentId, userAddress) {
        const [like] = await this.db
            .select()
            .from(schema.commentLikes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.commentLikes.commentId, commentId), (0, drizzle_orm_1.eq)(schema.commentLikes.userAddress, userAddress)))
            .limit(1);
        return { liked: !!like };
    }
    async getUserLikedMap(userAddress, commentIds) {
        if (commentIds.length === 0) {
            return new Map();
        }
        const likes = await this.db
            .select({ commentId: schema.commentLikes.commentId })
            .from(schema.commentLikes)
            .where((0, drizzle_orm_1.eq)(schema.commentLikes.userAddress, userAddress));
        const likedSet = new Set(likes.map((l) => l.commentId));
        const result = new Map();
        for (const id of commentIds) {
            result.set(id, likedSet.has(id));
        }
        return result;
    }
};
exports.CommentRepository = CommentRepository;
exports.CommentRepository = CommentRepository = CommentRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(db_module_1.DrizzleAsyncProvider)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase])
], CommentRepository);
//# sourceMappingURL=comment.repository.js.map