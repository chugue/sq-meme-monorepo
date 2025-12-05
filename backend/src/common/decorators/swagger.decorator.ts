import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

// ============================================================
// Game API Decorators
// ============================================================

export const ApiCreateGame = (summary = '게임 생성') =>
    applyDecorators(
        ApiOperation({ summary }),
        ApiResponse({
            status: 201,
            description: '게임 생성 완료',
        }),
    );

export const ApiRegisterClaimPrize = (summary = 'claimPrize 트랜잭션 등록') =>
    applyDecorators(
        ApiOperation({ summary }),
        ApiParam({
            name: 'gameId',
            description: '게임 ID',
            example: '1',
        }),
        ApiResponse({
            status: 200,
            description: '상금 수령 처리 완료',
        }),
    );

export const ApiGetGameByToken = (summary = '토큰 주소로 게임 조회') =>
    applyDecorators(
        ApiOperation({ summary }),
        ApiParam({
            name: 'tokenAddress',
            description: '게임 토큰 컨트랙트 주소 (0x...)',
            example: '0xfda7278df9b004e05dbaa367fc2246a4a46271c9',
        }),
        ApiResponse({
            status: 200,
            description: '게임 정보',
        }),
        ApiResponse({
            status: 404,
            description: '해당 토큰으로 생성된 게임이 없습니다',
        }),
    );

export const ApiRegisterGame = (summary = '블록체인 게임 등록') =>
    applyDecorators(
        ApiOperation({ summary }),
        ApiResponse({
            status: 201,
            description: '게임 등록 완료',
        }),
    );

export const ApiCreateGameByTx = (summary = 'txHash로 게임 생성') =>
    applyDecorators(
        ApiOperation({ summary }),
        ApiResponse({
            status: 201,
            description: '게임 생성 완료',
        }),
        ApiResponse({
            status: 400,
            description: '트랜잭션 영수증을 찾을 수 없거나 GameCreated 이벤트가 없음',
        }),
    );

// ============================================================
// Winner API Decorators
// ============================================================

export const ApiGetTopWinners = (summary = '상위 우승자 조회') =>
    applyDecorators(
        ApiOperation({ summary }),
        ApiResponse({
            status: 200,
            description: '상위 우승자 목록',
        }),
    );

export const ApiGetWinnersByWallet = (summary = '지갑 주소로 우승 기록 조회') =>
    applyDecorators(
        ApiOperation({ summary }),
        ApiParam({
            name: 'walletAddress',
            description: '사용자 지갑 주소 (0x...)',
            example: '0x1234567890123456789012345678901234567890',
        }),
        ApiResponse({
            status: 200,
            description: '해당 지갑의 우승 기록 목록',
        }),
    );

export const ApiGetGamesInPlaying = (summary = '참여 중인 게임 조회') =>
    applyDecorators(
        ApiOperation({ summary }),
        ApiResponse({
            status: 200,
            description: '참여 중인 활성 게임 목록',
        }),
    );
