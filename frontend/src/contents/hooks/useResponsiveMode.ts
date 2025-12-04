import { useEffect, useState } from "react";

/**
 * 반응형 모드 감지 훅
 * 화면 너비가 988px 이하일 때 모바일 모드로 판단
 */
export function useResponsiveMode(): boolean {
  const [isMobileMode, setIsMobileMode] = useState<boolean>(() => {
    // 초기값: 현재 화면 너비 확인
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 988;
  });

  useEffect(() => {
    // matchMedia를 사용하여 미디어 쿼리 생성
    const mediaQuery = window.matchMedia("(max-width: 988px)");

    // 초기값 설정
    setIsMobileMode(mediaQuery.matches);

    // 변경 감지 핸들러
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobileMode(e.matches);
      console.log("🦑 반응형 모드 변경:", e.matches ? "모바일" : "데스크톱");
    };

    // 초기값 확인
    handleChange(mediaQuery);

    // 이벤트 리스너 등록 (addEventListener 지원 여부 확인)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      // 구형 브라우저 지원 (addListener)
      mediaQuery.addListener(handleChange);
    }

    // ResizeObserver로 추가 감지 (화면 크기 변경 시 즉시 반영)
    const resizeObserver = new ResizeObserver(() => {
      const matches = window.innerWidth <= 988;
      setIsMobileMode((prev) => {
        if (matches !== prev) {
          console.log("🦑 ResizeObserver로 반응형 모드 변경:", matches ? "모바일" : "데스크톱");
          return matches;
        }
        return prev;
      });
    });

    // body 관찰 시작
    if (document.body) {
      resizeObserver.observe(document.body);
    }

    // 클린업
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        // 구형 브라우저 지원 (removeListener)
        mediaQuery.removeListener(handleChange);
      }
      resizeObserver.disconnect();
    };
  }, []);

  return isMobileMode;
}

