/**
 * 게임 시간 관련 유틸리티 함수
 */

/**
 * endTime을 초 단위 Unix timestamp로 변환
 * @param endTime - Unix timestamp (초 단위), bigint, 또는 ISO 날짜 문자열
 * @returns 초 단위 Unix timestamp
 */
export function parseEndTime(endTime: string | number | bigint): number {
  if (typeof endTime === "bigint") {
    return Number(endTime);
  } else if (typeof endTime === "number") {
    return endTime;
  } else {
    // ISO 날짜 문자열이면 Date로 파싱, 숫자 문자열이면 그대로 사용
    const parsed = Date.parse(endTime);
    if (!isNaN(parsed)) {
      return Math.floor(parsed / 1000);
    } else {
      return parseInt(endTime, 10);
    }
  }
}

/**
 * 남은 시간(초)을 계산
 * @param endTime - Unix timestamp (초 단위), bigint, 또는 ISO 날짜 문자열
 * @returns 남은 초, 종료 시 0
 */
export function getRemainingSeconds(endTime: string | number | bigint): number {
  const endTimeSeconds = parseEndTime(endTime);
  const now = Math.floor(Date.now() / 1000);
  const remaining = endTimeSeconds - now;
  return remaining > 0 ? remaining : 0;
}

/**
 * 남은 시간을 HH:MM:SS 형식으로 포맷
 * @param endTime - Unix timestamp (초 단위), bigint, 또는 ISO 날짜 문자열
 * @returns "HH:MM:SS" 형식의 문자열, 종료 시 "00:00:00"
 */
export function formatRemainingTime(endTime: string | number | bigint): string {
  const remaining = getRemainingSeconds(endTime);

  if (remaining <= 0) {
    return "00:00:00";
  }

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * endTime(Unix timestamp, 초 단위)과 현재 시간을 비교하여 게임 종료 여부 계산
 * @param endTime - Unix timestamp (초 단위), bigint, 또는 ISO 날짜 문자열
 * @returns true if 게임 종료됨 (현재 시간 >= endTime)
 */
export function isGameEndedByTime(endTime: string | number | bigint): boolean {
  const now = Math.floor(Date.now() / 1000);
  const endTimeSeconds = parseEndTime(endTime);
  return now >= endTimeSeconds;
}
