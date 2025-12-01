"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CommentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("../../common/types");
const comment_repository_1 = require("./comment.repository");
let CommentService = CommentService_1 = class CommentService {
    commentRepository;
    logger = new common_1.Logger(CommentService_1.name);
    constructor(commentRepository) {
        this.commentRepository = commentRepository;
    }
    async getCommentsByGame(gameAddress) {
        try {
            const comments = await this.commentRepository.findByGameAddress(gameAddress);
            return types_1.Result.ok({ comments });
        }
        catch (error) {
            this.logger.error(`Get comments by game failed: ${error.message}`);
            return types_1.Result.fail('Failed to get comments');
        }
    }
    async toggleLike(userAddress, commentId) {
        try {
            const normalizedAddress = userAddress.toLowerCase();
            const comment = await this.commentRepository.findById(commentId);
            if (!comment) {
                return types_1.Result.fail('Comment not found');
            }
            const data = await this.commentRepository.toggleLike(commentId, normalizedAddress);
            this.logger.log(`Like ${data.liked ? 'added' : 'removed'}: comment ${commentId}, user ${normalizedAddress}`);
            return types_1.Result.ok(data);
        }
        catch (error) {
            this.logger.error(`Toggle like failed: ${error.message}`);
            return types_1.Result.fail('Failed to toggle like');
        }
    }
    async getLikeCount(commentId) {
        try {
            const result = await this.commentRepository.getLikeCount(commentId);
            if (!result) {
                return types_1.Result.fail('Comment not found');
            }
            return types_1.Result.ok(result);
        }
        catch (error) {
            this.logger.error(`Get like count failed: ${error.message}`);
            return types_1.Result.fail('Failed to get like count');
        }
    }
    async hasUserLiked(userAddress, commentId) {
        try {
            const normalizedAddress = userAddress.toLowerCase();
            const result = await this.commentRepository.hasUserLiked(commentId, normalizedAddress);
            return types_1.Result.ok(result);
        }
        catch (error) {
            this.logger.error(`Check user liked failed: ${error.message}`);
            return types_1.Result.fail('Failed to check like status');
        }
    }
    async getUserLikedMap(userAddress, commentIds) {
        try {
            const normalizedAddress = userAddress.toLowerCase();
            const result = await this.commentRepository.getUserLikedMap(normalizedAddress, commentIds);
            return types_1.Result.ok(result);
        }
        catch (error) {
            this.logger.error(`Get user liked map failed: ${error.message}`);
            return types_1.Result.fail('Failed to get like map');
        }
    }
    async createComment(data) {
        try {
            const result = await this.commentRepository.createFromFrontend(data);
            if (!result) {
                return types_1.Result.fail('댓글 저장에 실패했습니다.');
            }
            return types_1.Result.ok(result);
        }
        catch (error) {
            this.logger.error(`Create comment failed: ${error.message}`);
            return types_1.Result.fail('댓글 저장에 실패했습니다.');
        }
    }
};
exports.CommentService = CommentService;
exports.CommentService = CommentService = CommentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [comment_repository_1.CommentRepository])
], CommentService);
//# sourceMappingURL=comment.service.js.map