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
  return (
    <div className="connect-wallet-wrapper">
      {isWalletConnected ? (
        <button className="connect-wallet-btn memex-btn" onClick={onConnectMemex}>
          <span className="btn-text">CONNECT MEMEX</span>
          <span className="btn-glow"></span>
        </button>
      ) : (
        <button className="connect-wallet-btn" onClick={onConnectWallet}>
          <span className="btn-text">CONNECT WALLET</span>
          <span className="btn-glow"></span>
        </button>
      )}
    </div>
  );
}
