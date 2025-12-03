/**
 * 게임 설정 모달 관련 타입 정의
 */

import type { Address } from 'viem';

// 게임 설정 단계
export type SetupStep = 'balance-check' | 'settings' | 'confirm' | 'processing' | 'complete';

// 게임 설정 값
export interface GameSettings {
    initialFunding: string; // 초기 펀딩 금액 (토큰 단위) - V2에서 필수
    cost: string;           // 댓글 비용 (토큰 단위)
    time: string;           // 타이머 (분)
    firstComment: string;   // 첫 댓글 내용
    firstCommentImage?: string; // 첫 댓글 이미지 URL (선택)
}

// 모달 Props
export interface GameSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    tokenAddress: Address;
    tokenSymbol?: string;
    onGameCreated?: (gameId: string) => void;
    onExistingGameFound?: (gameAddress: string) => void;
}

// 기본 설정값
export const DEFAULT_GAME_SETTINGS: GameSettings = {
    initialFunding: '1000',
    cost: '100',
    time: '60',
    firstComment: '',
};
