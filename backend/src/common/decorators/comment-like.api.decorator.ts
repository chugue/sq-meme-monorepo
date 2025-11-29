import { applyDecorators } from '@nestjs/common';
import {
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiHeader,
} from '@nestjs/swagger';

/**
 * @description 좋아요 토글 API 데코레이터
 */
export function ApiToggleLike() {
    return applyDecorators(
        ApiOperation({
            summary: '댓글 좋아요 토글',
            description:
                '댓글에 좋아요를 추가하거나 취소합니다. 이미 좋아요를 눌렀으면 취소, 안눌렀으면 추가됩니다.',
        }),
        ApiParam({
            name: 'id',
            type: Number,
            description: '댓글 ID',
            example: 1,
        }),
        ApiHeader({
            name: 'x-wallet-address',
            description: '사용자 지갑 주소',
            required: true,
            example: '0x1234567890abcdef1234567890abcdef12345678',
        }),
        ApiResponse({
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
        }),
        ApiResponse({
            status: 400,
            description: '잘못된 요청 (지갑 주소 누락 등)',
        }),
        ApiResponse({
            status: 404,
            description: '댓글을 찾을 수 없음',
        }),
    );
}

/**
 * @description 좋아요 수 조회 API 데코레이터
 */
export function ApiGetLikeCount() {
    return applyDecorators(
        ApiOperation({
            summary: '댓글 좋아요 수 조회',
            description: '특정 댓글의 좋아요 수를 조회합니다.',
        }),
        ApiParam({
            name: 'id',
            type: Number,
            description: '댓글 ID',
            example: 1,
        }),
        ApiResponse({
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
        }),
        ApiResponse({
            status: 404,
            description: '댓글을 찾을 수 없음',
        }),
    );
}

/**
 * @description 좋아요 여부 확인 API 데코레이터
 */
export function ApiCheckUserLiked() {
    return applyDecorators(
        ApiOperation({
            summary: '사용자 좋아요 여부 확인',
            description: '현재 사용자가 특정 댓글에 좋아요를 눌렀는지 확인합니다.',
        }),
        ApiParam({
            name: 'id',
            type: Number,
            description: '댓글 ID',
            example: 1,
        }),
        ApiHeader({
            name: 'x-wallet-address',
            description: '사용자 지갑 주소',
            required: true,
            example: '0x1234567890abcdef1234567890abcdef12345678',
        }),
        ApiResponse({
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
        }),
        ApiResponse({
            status: 400,
            description: '잘못된 요청 (지갑 주소 누락 등)',
        }),
    );
}
