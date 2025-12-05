// 크롬 익스텐션에서 public 폴더 이미지 URL 가져오기
export function getExtensionImageUrl(path: string): string {
    try {
        const chromeGlobal = globalThis as typeof globalThis & {
            chrome?: { runtime?: { getURL?: (path: string) => string } };
        };
        if (chromeGlobal.chrome?.runtime?.getURL) {
            return chromeGlobal.chrome.runtime.getURL(path);
        }
        return path;
    } catch {
        return path;
    }
}
