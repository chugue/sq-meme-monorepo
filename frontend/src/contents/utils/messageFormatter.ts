/**
 * 메시지 포맷팅 유틸리티
 */

/**
 * 댓글 서명용 메시지 생성
 */
export function createCommentSignatureMessage(
    content: string,
    address: string,
    timestamp?: number,
): string {
    const ts = timestamp ?? Date.now();
    return `Squid Meme Comment\n\nContent: ${content}\nAddress: ${address}\nTimestamp: ${ts}`;
}

/**
 * 주소 포맷팅 (축약형)
 */
export function formatAddress(
    address: string,
    startLength = 6,
    endLength = 4,
): string {
    if (!address || address.length < startLength + endLength) {
        return address;
    }
    return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * 날짜 포맷팅 (상대 시간)
 */
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600)
        return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
        return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return date.toLocaleDateString("ko-KR");
}
