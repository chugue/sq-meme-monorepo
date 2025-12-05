/**
 * 게임 설정 모달 컴포넌트
 *
 * - CREATE GAME 버튼 클릭 시 표시
 * - 토큰 잔액 확인, 게임 설정 입력, 트랜잭션 실행
 */

import { useEffect, useRef, useState } from "react";
import { useCreateGame } from "../../hooks/useCreateGame";
import "./GameSetupModal.css";
import {
  BalanceCheckStep,
  CompleteStep,
  ConfirmStep,
  SettingsStep,
} from "./steps";
import type { GameSettings, GameSetupModalProps, SetupStep } from "./types";
import { DEFAULT_GAME_SETTINGS } from "./types";

/**
 * 게임 설정 모달
 */
export function GameSetupModal({
  isOpen,
  onClose,
  tokenAddress,
  tokenSymbol = "TOKEN",
  onGameCreated,
  onExistingGameFound,
}: GameSetupModalProps) {
  const [step, setStep] = useState<SetupStep>("balance-check");
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [realTokenSymbol, setRealTokenSymbol] = useState<string>(tokenSymbol);
  const [isCheckingExistingGame, setIsCheckingExistingGame] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { checkExistingGame } = useCreateGame();

  // 모달 열릴 때 기존 게임 확인
  useEffect(() => {
    if (!isOpen) return;

    const checkGame = async () => {
      setIsCheckingExistingGame(true);
      const existingGame = await checkExistingGame(tokenAddress);
      setIsCheckingExistingGame(false);

      // 진행 중인 게임이 있으면 콜백 호출하고 모달 닫기
      if (existingGame && !existingGame.isEnded) {
        onExistingGameFound?.(existingGame.gameId.toString());
        onClose();
      }
    };

    checkGame();
  }, [isOpen, tokenAddress, checkExistingGame, onExistingGameFound, onClose]);

  // 스크롤 이벤트 처리
  useEffect(() => {
    const container = modalContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolling(true);

      // 스크롤이 멈추면 1초 후 스크롤바 숨김
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 1000);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // 모달이 닫히지 않았으면 렌더링하지 않음
  if (!isOpen) return null;

  // 기존 게임 확인 중이면 로딩 표시
  if (isCheckingExistingGame) {
    return (
      <div className="squid-modal-backdrop">
        <div className="squid-modal-container">
          <div className="squid-modal-header">
            <h2 className="squid-modal-title">CREATE GAME</h2>
          </div>
          <div className="squid-modal-content">
            <div className="squid-step-content">
              <div className="squid-loading-spinner" />
              <p style={{ marginTop: "16px", textAlign: "center" }}>
                기존 게임 확인 중...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 모달 닫기 핸들러
  const handleClose = () => {
    // processing 중에는 닫기 방지 (에러 발생 시에는 허용)
    if (step === "processing" && !hasError) return;
    setStep("balance-check");
    setHasError(false);
    onClose();
  };

  // 배경 클릭 시 닫기
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div className="squid-modal-backdrop" onClick={handleBackdropClick}>
      <div
        ref={modalContainerRef}
        className={`squid-modal-container ${
          isScrolling ? "is-scrolling" : ""
        }`}
      >
        {/* 헤더 */}
        <div className="squid-modal-header">
          <h2 className="squid-modal-title">CREATE GAME</h2>
          <button
            type="button"
            className="squid-modal-close"
            onClick={handleClose}
            disabled={step === "processing" && !hasError}
          >
            &times;
          </button>
        </div>

        {/* 단계 표시 */}
        <div className="squid-modal-steps">
          <div
            className={`squid-step ${step === "balance-check" ? "active" : ""}`}
          >
            1. Balance
          </div>
          <div className={`squid-step ${step === "settings" ? "active" : ""}`}>
            2. Settings
          </div>
          <div
            className={`squid-step ${
              step === "confirm" || step === "processing" ? "active" : ""
            }`}
          >
            3. Create
          </div>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="squid-modal-content">
          {step === "balance-check" && (
            <BalanceCheckStep
              tokenAddress={tokenAddress}
              tokenSymbol={tokenSymbol}
              onNext={(decimals, symbol) => {
                setTokenDecimals(decimals);
                setRealTokenSymbol(symbol);
                setStep("settings");
              }}
              onClose={handleClose}
            />
          )}

          {step === "settings" && (
            <SettingsStep
              settings={settings}
              tokenSymbol={realTokenSymbol}
              onChange={setSettings}
              onNext={() => setStep("confirm")}
              onBack={() => setStep("balance-check")}
            />
          )}

          {(step === "confirm" || step === "processing") && (
            <ConfirmStep
              settings={settings}
              tokenAddress={tokenAddress}
              tokenSymbol={realTokenSymbol}
              decimals={tokenDecimals}
              isProcessing={step === "processing"}
              onConfirm={() => setStep("processing")}
              onBack={() => setStep("settings")}
              onComplete={(gameId) => {
                setStep("complete");
                onGameCreated?.(gameId);
              }}
              onError={() => setHasError(true)}
            />
          )}

          {step === "complete" && <CompleteStep onClose={handleClose} />}
        </div>
      </div>
    </div>
  );
}
