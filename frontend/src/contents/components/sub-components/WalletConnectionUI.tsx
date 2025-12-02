import { formatAddress } from '../../utils/messageFormatter';

interface WalletConnectionUIProps {
    isConnected: boolean;
    address: string | null;
    isLoading: boolean;
    error: string | null;
    onConnect: () => Promise<void>;
    onDisconnect: () => void;
}

export function WalletConnectionUI({
    isConnected,
    address,
    isLoading,
    error,
    onConnect,
    onDisconnect,
}: WalletConnectionUIProps) {
    if (isLoading) {
        return <div className="squid-wallet-notice">CONNECTING WALLET...</div>;
    }

    if (!isConnected) {
        return (
            <div className="squid-wallet-buttons">
                <button
                    type="button"
                    onClick={onConnect}
                    className="squid-wallet-button"
                    disabled={isLoading}
                >
                    CONNECT WALLET
                </button>
                {error && (
                    <div className="squid-tx-error" style={{ marginTop: '8px' }}>
                        {error}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="squid-wallet-connected">
            <div className="squid-wallet-notice">
                CONNECTED: {formatAddress(address || '')}
            </div>
            <button
                type="button"
                onClick={onDisconnect}
                className="squid-wallet-button"
                style={{ fontSize: '8px', padding: '4px 8px' }}
            >
                DISCONNECT
            </button>
        </div>
    );
}
