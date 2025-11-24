import { browser } from 'wxt/browser';

// 사이드 패널 열기
export async function openSidePanel(tabId?: number): Promise<void> {
    try {
        // tabId가 제공되지 않으면 현재 활성 탭 사용
        const targetTabId = tabId ?? (await browser.tabs.query({ active: true, currentWindow: true }))[0]?.id ?? 0;

        if (targetTabId === 0) {
            throw new Error('탭 ID를 찾을 수 없습니다.');
        }

        await browser.sidePanel.open({
            tabId: targetTabId,
        });

        await browser.sidePanel.setOptions({
            tabId: targetTabId,
            path: 'sidepanel.html',
            enabled: true,
        });
    } catch (error) {
        console.error('❌ 사이드 패널 열기 오류:', error);
        throw error;
    }
}

