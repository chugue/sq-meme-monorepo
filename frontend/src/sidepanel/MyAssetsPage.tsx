import { TopBar } from "./components";
import { useMemexLogin } from "./hooks/useMemexLogin";
import { useWalletAssets } from "./hooks/useWalletAssets";
import "./MyAssetsPage.css";


export function MyAssetsPage() {
    const { username, profileImageUrl, tokenSymbol } = useMemexLogin();
    const { assets, isLoading, error, refetch } = useWalletAssets();

    return (
        <div className="relative  bg-brown-0 min-h-screen">
            <div className="absolute max-w-xl left-0 right-0 top-0 object-contain h-[20%] mx-auto pig-shadow z-0" />
            <div className="absolute inset-0 people-shadow top-[30%]" />
            <div className="flex flex-col flex-1 relative z-1">
                <TopBar />

                <div className="flex items-center justify-center gap-x-3 py-3 mx-5 mt-5  text-3xl  bg-black/50 z-1" >
                    <span className="font-bold text-gold-gradient-smooth uppercase">my memecoins</span>
                </div>

                {/* Assets List */}
                <section className="my-assets-content">
                    {/* 에러 표시 */}
                    {error && <div className="assets-error">{error}</div>}

                    {/* 로딩 중 */}
                    {isLoading && !assets.native && assets.tokens.length === 0 && (
                        <div className="assets-loading">토큰 목록 로딩 중...</div>
                    )}

                    {/* Native Coin (M) */}
                    {assets.native && (
                        <div className="asset-card">
                            <div className="asset-icon-wrapper">
                                <img
                                    src="/icon/memex.png"
                                    alt={assets.native.symbol}
                                    className="asset-icon-image"
                                />
                            </div>
                            <div className="asset-info">
                                <span className="asset-symbol">${assets.native.symbol}</span>
                                <div className="asset-balance-box">
                                    <span className="asset-balance">
                                        {assets.native.balanceFormatted}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ERC-20 Tokens */}
                    {assets.tokens.map((token) => (
                        <div key={token.contractAddress} className="asset-card">
                            <div className="asset-icon-wrapper emoji">
                                <span className="asset-emoji">
                                    {token.symbol === tokenSymbol ? "🪙" : "💰"}
                                </span>
                            </div>
                            <div className="asset-info">
                                <span className="asset-symbol">${token.symbol}</span>
                                <div className="asset-balance-box">
                                    <span className="asset-balance">{token.balanceFormatted}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* 토큰이 없을 때 */}
                    {!isLoading &&
                        !assets.native &&
                        assets.tokens.length === 0 &&
                        !error && <div className="assets-empty">보유한 토큰이 없습니다.</div>}
                </section>
            </div>
        </div>
    );
}
