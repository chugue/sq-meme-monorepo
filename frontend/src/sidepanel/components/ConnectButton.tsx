import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { isLoggingInAtom } from "../atoms/sessionAtoms";

interface ConnectButtonProps {
  isWalletConnected: boolean;
  onConnectWallet: () => void;
  onConnectMemex: () => void;
}

export function ConnectButton({
  isWalletConnected,
  onConnectWallet,
  onConnectMemex,
}: ConnectButtonProps) {
  const isLoggingIn = useAtomValue(isLoggingInAtom);
  const [showBounce, setShowBounce] = useState(false);
  const [prevConnected, setPrevConnected] = useState(isWalletConnected);

  // 지갑 연결 상태가 false -> true로 변경될 때 1초 후 바운스 애니메이션 트리거
  useEffect(() => {
    if (!prevConnected && isWalletConnected) {
      // 1초 대기 후 애니메이션 시작
      const delayTimer = setTimeout(() => {
        setShowBounce(true);
        // 애니메이션 후 바운스 상태 리셋
        setTimeout(() => setShowBounce(false), 3000);
      }, 1000);
      return () => clearTimeout(delayTimer);
    }
    setPrevConnected(isWalletConnected);
  }, [isWalletConnected, prevConnected]);

  return (
    <div className="connect-wallet-wrapper">
      <AnimatePresence mode="wait">
        {isLoggingIn ? (
          <motion.button
            key="logging-in-btn"
            className="connect-wallet-btn logging-in-btn"
            disabled
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <span className="btn-spinner"></span>
            <span className="btn-text">LOGGING IN...</span>
            <span className="btn-glow"></span>
          </motion.button>
        ) : isWalletConnected ? (
          <motion.button
            key="memex-btn"
            className="connect-wallet-btn memex-btn"
            onClick={onConnectMemex}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={
              showBounce
                ? {
                    opacity: 1,
                    scale: [0.8, 1.15, 0.95, 1.05, 1],
                    y: [20, -15, 5, -8, 0],
                  }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{
              duration: showBounce ? 0.8 : 0.3,
              ease: showBounce ? "easeOut" : "easeInOut",
            }}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 0 30px rgba(0, 255, 255, 0.6)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span
              className="btn-text"
              animate={
                showBounce
                  ? {
                      textShadow: [
                        "0 0 10px rgba(0, 255, 255, 0.5)",
                        "0 0 30px rgba(0, 255, 255, 1)",
                        "0 0 10px rgba(0, 255, 255, 0.5)",
                      ],
                    }
                  : {}
              }
              transition={{ duration: 0.6, repeat: showBounce ? 2 : 0 }}
            >
              CONNECT MEMEX
            </motion.span>
            <span className="btn-glow"></span>
          </motion.button>
        ) : (
          <motion.button
            key="wallet-btn"
            className="connect-wallet-btn"
            onClick={onConnectWallet}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3 }}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 0 30px rgba(255, 0, 255, 0.6)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="btn-text">CONNECT WALLET</span>
            <span className="btn-glow"></span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
