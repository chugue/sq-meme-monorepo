"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiToggleLike = ApiToggleLike;
exports.ApiGetLikeCount = ApiGetLikeCount;
exports.ApiCheckUserLiked = ApiCheckUserLiked;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
function ApiToggleLike() {
    return (0, common_1.applyDecorators)((0, swagger_1.ApiOperation)({
        summary: '댓글 좋아요 토글',
        description: '댓글에 좋아요를 추가하거나 취소합니다. 이미 좋아요를 눌렀으면 취소, 안눌렀으면 추가됩니다.',
    }), (0, swagger_1.ApiParam)({
        name: 'id',
        type: Number,
        description: '댓글 ID',
        example: 1,
    }), (0, swagger_1.ApiHeader)({
        name: 'x-wallet-address',
        description: '사용자 지갑 주소',
        required: true,
        example: '0x1234567890abcdef1234567890abcdef12345678',
    }), (0, swagger_1.ApiResponse)({
        status: 200,
        description: '좋아요 토글 성공',
        schema: {
            type: 'object',
            properties: {
                liked: {
                    type: 'boolean',
                    description: '현재 좋아요 상태',
                    example: true,
                },
                likeCount: {
                    type: 'number',
                    description: '현재 좋아요 수',
                    example: 42,
                },
            },
        },
    }), (0, swagger_1.ApiResponse)({
        status: 400,
        description: '잘못된 요청 (지갑 주소 누락 등)',
    }), (0, swagger_1.ApiResponse)({
        status: 404,
        description: '댓글을 찾을 수 없음',
    }));
}
function ApiGetLikeCount() {
    return (0, common_1.applyDecorators)((0, swagger_1.ApiOperation)({
        summary: '댓글 좋아요 수 조회',
        description: '특정 댓글의 좋아요 수를 조회합니다.',
    }), (0, swagger_1.ApiParam)({
        name: 'id',
        type: Number,
        description: '댓글 ID',
        example: 1,
    }), (0, swagger_1.ApiResponse)({
        status: 200,
        description: '조회 성공',
        schema: {
            type: 'object',
            properties: {
                likeCount: {
                    type: 'number',
                    description: '좋아요 수',
                    example: 42,
                },
            },
        },
    }), (0, swagger_1.ApiResponse)({
        status: 404,
        description: '댓글을 찾을 수 없음',
    }));
}
function ApiCheckUserLiked() {
    return (0, common_1.applyDecorators)((0, swagger_1.ApiOperation)({
        summary: '사용자 좋아요 여부 확인',
        description: '현재 사용자가 특정 댓글에 좋아요를 눌렀는지 확인합니다.',
    }), (0, swagger_1.ApiParam)({
        name: 'id',
        type: Number,
        description: '댓글 ID',
        example: 1,
    }), (0, swagger_1.ApiHeader)({
        name: 'x-wallet-address',
        description: '사용자 지갑 주소',
        required: true,
        example: '0x1234567890abcdef1234567890abcdef12345678',
    }), (0, swagger_1.ApiResponse)({
        status: 200,
        description: '조회 성공',
        schema: {
            type: 'object',
            properties: {
                liked: {
                    type: 'boolean',
                    description: '좋아요 여부',
                    example: true,
                },
            },
        },
    }), (0, swagger_1.ApiResponse)({
        status: 400,
        description: '잘못된 요청 (지갑 주소 누락 등)',
    }));
}
//# sourceMappingURL=comment-like.api.decorator.js.map