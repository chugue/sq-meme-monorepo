// endTime(ISO 문자열, Unix timestamp, 또는 숫자)에서 남은 시간 계산 (HH:MM:SS 형식)
export function formatTimeRemaining(endTime: string | number | null): string {
    if (!endTime) return "00:00:00";

    let endTimeMs: number;

    if (typeof endTime === "string") {
        // ISO 날짜 문자열인지 확인 (예: "2025-12-06T16:46:01.000Z")
        if (endTime.includes("T") || endTime.includes("-")) {
            endTimeMs = new Date(endTime).getTime();
        } else {
            // Unix timestamp 문자열
            endTimeMs = parseInt(endTime, 10) * 1000;
        }
    } else {
        // 숫자인 경우 Unix timestamp로 간주
        endTimeMs = endTime * 1000;
    }

    const now = Date.now();
    const remaining = Math.floor((endTimeMs - now) / 1000);

    if (remaining <= 0) return "00:00:00";

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// prizePool 포맷팅 (decimal 18 적용, 콤마 추가)
export function formatPrizePool(prizePool: string | null, decimals = 18): string {
    if (!prizePool || prizePool === "0") return "0";
    try {
        const num = BigInt(prizePool);
        const divisor = BigInt(10 ** decimals);
        const integerPart = num / divisor;
        const remainder = num % divisor;

        // 소수점 이하 2자리까지 표시
        const decimalStr = remainder.toString().padStart(decimals, "0").slice(0, 2);
        const integerStr = integerPart.toLocaleString();

        if (decimalStr === "00") {
            return integerStr;
        }
        return `${integerStr}.${decimalStr}`;
    } catch {
        return prizePool;
    }
}
