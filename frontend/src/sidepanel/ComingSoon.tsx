import { useState } from "react";
import "./ComingSoon.css";
import {
  Particles,
  SquidCharacter,
  AnimatedTitle,
  ConnectButton,
  NeonBar,
  TermsModal,
} from "./components";
import { useSidepanelWallet } from "./hooks/useSidepanelWallet";
import { useMemexLogin } from "./hooks/useMemexLogin";
import { backgroundApi } from "../contents/lib/backgroundApi";

interface ComingSoonProps {
  onMemexLoginComplete?: () => void;
}

export function ComingSoon({ onMemexLoginComplete }: ComingSoonProps) {
  const { isConnected, address, isLoading, error, connect, refetch } = useSidepanelWallet();
  const { setLoggingIn } = useMemexLogin();
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  const handleConnectWallet = async () => {
    try {
      await connect();
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  };

  const handleConnectMemex = () => {
    setIsTermsModalOpen(true);
  };

  const handleCloseTermsModal = () => {
    setIsTermsModalOpen(false);
  };

  const handleAgreeTerms = async () => {
    setIsTermsModalOpen(false);
    try {
      console.log("🔐 Terms agreed, triggering MEMEX login...");

      // 첫 번째 호출: 로그인 상태 확인 또는 Google 버튼 클릭 (triggerLogin: true)
      const result = await backgroundApi.memexLogin(true) as {
        success: boolean;
        isLoggedIn?: boolean;
        loginStarted?: boolean;
        username?: string;
        userTag?: string;
      };
      console.log("🔐 MEMEX login result:", result);

      // 이미 로그인되어 있으면 바로 완료
      if (result?.isLoggedIn && onMemexLoginComplete) {
        console.log("✅ MEMEX 로그인 완료:", result.username);
        onMemexLoginComplete();
        return;
      }

      // 로그인 시작됨 - 폴링으로 로그인 완료 확인
      if (result?.loginStarted) {
        console.log("🔐 Google 로그인 시작됨, 폴링 시작...");
        setLoggingIn(true);
        const maxWaitTime = 60000; // 60초
        const pollInterval = 2000; // 2초
        const startTime = Date.now();

        const checkLoginStatus = async (): Promise<void> => {
          const elapsed = Date.now() - startTime;
          if (elapsed >= maxWaitTime) {
            console.error("❌ 로그인 타임아웃");
            setLoggingIn(false);
            return;
          }

          try {
            const checkResult = await backgroundApi.memexLogin() as {
              success: boolean;
              isLoggedIn?: boolean;
              username?: string;
            };
            console.log("🔐 로그인 상태 확인:", checkResult, Math.floor(elapsed / 1000), "초 경과");

            if (checkResult?.isLoggedIn && onMemexLoginComplete) {
              console.log("✅ MEMEX 로그인 완료:", checkResult.username);
              setLoggingIn(false);
              // 지갑 연결 상태 재확인 (jotai 전역 상태 업데이트)
              await refetch();
              onMemexLoginComplete();
              return;
            }

            // 아직 로그인 안됨, 다시 체크
            setTimeout(checkLoginStatus, pollInterval);
          } catch (err) {
            console.log("🔐 로그인 확인 중 오류 (재시도):", err);
            setTimeout(checkLoginStatus, pollInterval);
          }
        };

        // 5초 후 폴링 시작 (Google 로그인 완료 시간 대기)
        setTimeout(checkLoginStatus, 5000);
      }
    } catch (err) {
      console.error("❌ MEMEX login failed:", err);
      setLoggingIn(false);
    }
  };

  return (
    <div className="coming-soon-container">
      <Particles />
      <div className="glow-overlay"></div>
      <div className="coming-soon-content">
        <SquidCharacter />
        <div className="title-wrapper">
          <AnimatedTitle text="COMING" startDelay={0} />
          <AnimatedTitle
            text="SOON"
            startDelay={0.6}
            className="coming-soon-title-second"
          />
        </div>
        <div className="marketing-text-wrapper">
          <p className="marketing-text">BUCKLE UP, SHIT'S ABOUT TO GET REAL</p>
        </div>
        <ConnectButton
          isWalletConnected={isConnected}
          onConnectWallet={handleConnectWallet}
          onConnectMemex={handleConnectMemex}
        />
        <NeonBar />
      </div>
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={handleCloseTermsModal}
        onAgree={handleAgreeTerms}
      />
    </div>
  );
}
