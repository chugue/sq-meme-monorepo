/**
 * Chrome extension 환경에서 로컬 폰트를 동적으로 로드하는 유틸리티
 */

type FontConfig = {
    fontFamily: string;
    fontPath: string;
    styleId: string;
    additionalStyles?: string;
};

/**
 * Chrome extension 환경에서 로컬 폰트를 동적으로 로드
 * - 이미 로드된 폰트는 스킵 (styleId로 체크)
 * - Chrome extension context 자동 감지
 */
export function loadFont(config: FontConfig): void {
    const { fontFamily, fontPath, styleId, additionalStyles = "" } = config;

    // 이미 로드되어 있으면 스킵
    if (document.getElementById(styleId)) return;

    // Chrome extension URL 처리
    let fontUrl = fontPath;
    try {
        const chromeGlobal = globalThis as typeof globalThis & {
            chrome?: { runtime?: { getURL?: (path: string) => string } };
        };
        if (chromeGlobal.chrome?.runtime?.getURL) {
            fontUrl = chromeGlobal.chrome.runtime.getURL(fontPath);
        }
    } catch {
        // 무시
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
        @font-face {
            font-family: '${fontFamily}';
            src: url('${fontUrl}') format('truetype');
            font-weight: 400;
            font-style: normal;
            font-display: swap;
        }
        ${additionalStyles}
    `;
    document.head.appendChild(style);
}

// 자주 사용하는 폰트 프리셋
export const FONTS = {
    PRESS_START_2P: {
        fontFamily: "Press Start 2P",
        fontPath: "font/PressStart2P.ttf",
        styleId: "press-start-2p-font-style",
    },
    TIMER: {
        fontFamily: "Timer",
        fontPath: "font/timer.ttf",
        styleId: "timer-font-style",
    },
} as const;
