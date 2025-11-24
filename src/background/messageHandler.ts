import { BackgroundMessage, BackgroundResponse } from '../contents/lib/backgroundApi';
import { apiCall } from './api';
import { openSidePanel } from './sidepanel';

export function createMessageHandler() {
    return (
        message: BackgroundMessage,
        sender: any,
        sendResponse: (response: BackgroundResponse) => void
    ): boolean => {
        // 비동기 응답 처리
        (async () => {
            try {
                let result: BackgroundResponse;

                switch (message.type) {
                    case 'GET_COMMENTS': {
                        console.log('📥 GET_COMMENTS 요청:', message.challengeId);
                        const response = await apiCall<{ comments: any[] }>(
                            `/api/comments/${encodeURIComponent(message.challengeId)}`
                        );
                        result = { success: true, data: response.comments || [] };
                        break;
                    }

                    case 'CREATE_COMMENT': {
                        console.log('📝 CREATE_COMMENT 요청:', message);
                        const response = await apiCall<{ comment: any }>('/api/comments', {
                            method: 'POST',
                            body: JSON.stringify({
                                challenge_id: message.challengeId,
                                player_address: message.playerAddress,
                                content: message.content,
                            }),
                        });
                        result = { success: true, data: response.comment };
                        break;
                    }

                    case 'DELETE_COMMENT': {
                        console.log('🗑️ DELETE_COMMENT 요청:', message.commentId);
                        await apiCall(`/api/comments/${encodeURIComponent(message.commentId)}`, {
                            method: 'DELETE',
                        });
                        result = { success: true, data: undefined };
                        break;
                    }

                    case 'HEALTH_CHECK': {
                        console.log('💓 HEALTH_CHECK 요청');
                        const response = await apiCall<{
                            status: string;
                            timestamp: string;
                            supabase: string;
                        }>('/health');
                        result = { success: true, data: response };
                        break;
                    }


                    case 'OPEN_SIDE_PANEL': {
                        console.log('📂 OPEN_SIDE_PANEL 요청');
                        try {
                            await openSidePanel(sender.tab?.id ?? 0);
                            result = { success: true, data: undefined };
                        } catch (error: any) {
                            console.error('❌ 사이드 패널 열기 오류:', error);
                            result = {
                                success: false,
                                error: error instanceof Error ? error.message : '사이드 패널 열기 실패',
                            };
                        }
                        break;
                    }

                    default:
                        result = {
                            success: false,
                            error: '알 수 없는 메시지 타입입니다.',
                        };
                }

                // 응답 전송
                try {
                    sendResponse(result);
                } catch (sendError) {
                    console.error('❌ 응답 전송 실패:', sendError);
                }
            } catch (error: any) {
                console.error('❌ Background API 오류:', error);
                try {
                    sendResponse({
                        success: false,
                        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
                    });
                } catch (sendError) {
                    console.error('❌ 에러 응답 전송 실패:', sendError);
                }
            }
        })();

        // 비동기 응답을 위해 true 반환
        return true;
    };
}

