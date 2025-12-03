import { getWagmiConfig } from "@/contents/config/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { WagmiProvider } from "wagmi";
import { SquidMemeJotaiProvider } from "../atoms/JotaiProvider";
import { isHomePage, isProfilePage } from "../utils/page-check.helpers";
import { HomePage } from "./HomePage";
import { ProfilePage } from "./ProfilePage";
import { ErrorBoundary } from "./sub-components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * 내부 앱 컴포넌트 (Jotai Provider 내부에서 훅 사용)
 */
function CommentAppInner() {
  // 초기 상태는 현재 URL 기준으로 설정
  const [isProfile, setIsProfile] = useState(() => isProfilePage());
  const [isHome, setIsHome] = useState(() => isHomePage());

  // URL 변경 감지 (SPA 네비게이션 대응)
  useEffect(() => {
    // SPA_NAVIGATION 메시지 수신 - 메시지에 포함된 URL 사용
    const messageListener = (event: MessageEvent) => {
      if (event.data?.source === "SPA_NAVIGATION") {
        // 메시지에 포함된 새 URL 사용 (더 정확함)
        const newUrl = event.data?.data?.url;
        const newIsProfile = newUrl ? isProfilePage(newUrl) : isProfilePage();
        const newIsHome = newUrl ? isHomePage(newUrl) : isHomePage();

        setIsProfile(newIsProfile);
        setIsHome(newIsHome);
      }
    };

    window.addEventListener("message", messageListener);
    return () => window.removeEventListener("message", messageListener);
  }, []);

  // 홈 페이지면 안내 화면 표시
  if (isHome) {
    return <HomePage />;
  }

  // 프로필 페이지면 게임 컨텐츠 표시
  if (isProfile) {
    return <ProfilePage />;
  }

  // 그 외 페이지는 아무것도 표시하지 않음
  return null;
}

export default function CommentApp() {
  const wagmiConfig = useMemo(() => getWagmiConfig(), []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <SquidMemeJotaiProvider>
            <CommentAppInner />
          </SquidMemeJotaiProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
