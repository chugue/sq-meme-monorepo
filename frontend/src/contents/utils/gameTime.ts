/**
 * 게임 시간 관련 유틸리티 함수
 */

/**
 * endTime(Unix timestamp, 초 단위)과 현재 시간을 비교하여 게임 종료 여부 계산
 * @param endTime - Unix timestamp (초 단위), bigint, 또는 ISO 날짜 문자열
 * @returns true if 게임 종료됨 (현재 시간 >= endTime)
 */
export function isGameEndedByTime(endTime: string | number | bigint): boolean {
  const now = Math.floor(Date.now() / 1000); // 현재 시간 (초 단위)
  let endTimeSeconds: number;

  if (typeof endTime === "bigint") {
    endTimeSeconds = Number(endTime);
  } else if (typeof endTime === "number") {
    endTimeSeconds = endTime;
  } else {
    // ISO 날짜 문자열이면 Date로 파싱, 숫자 문자열이면 그대로 사용
    const parsed = Date.parse(endTime);
    if (!isNaN(parsed)) {
      endTimeSeconds = Math.floor(parsed / 1000);
    } else {
      endTimeSeconds = parseInt(endTime, 10);
    }
  }

  return now >= endTimeSeconds;
}
