import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { createMessageHandler } from '../background/messageHandler';
import { openSidePanel } from '../background/sidepanel';

export default defineBackground(() => {
    const runtime = browser?.runtime || (globalThis as any).chrome?.runtime;

    browser.action?.onClicked.addListener(async (tab) => {
        await openSidePanel(tab?.id);
    });

    // Background Script 메시지 핸들러
    runtime.onMessage.addListener(createMessageHandler());
});
