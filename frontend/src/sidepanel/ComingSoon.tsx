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

export function ComingSoon() {
  // 임시: 지갑 연결 상태 (나중에 실제 지갑 연결 로직으로 교체)
  const [isWalletConnected, setIsWalletConnected] = useState(true);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  const handleConnectWallet = () => {
    setIsWalletConnected(true);
  };

  const handleConnectMemex = () => {
    setIsTermsModalOpen(true);
  };

  const handleCloseTermsModal = () => {
    setIsTermsModalOpen(false);
  };

  const handleAgreeTerms = () => {
    setIsTermsModalOpen(false);
    // TODO: MEMEX 연결 로직 구현
    console.log("Terms agreed, connecting to MEMEX...");
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
          isWalletConnected={isWalletConnected}
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
