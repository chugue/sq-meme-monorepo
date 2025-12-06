import { formatEther } from "viem";
import { AssetCardSkeleton, FadeInUp, TopBar } from "./components";
import { useMemexLogin } from "./hooks/useMemexLogin";
import { useUserAssets, type MyAsset } from "./hooks/useUserAssets";
import "./MyAssetsPage.css";

// 숫자 포맷팅 헬퍼 함수
function formatBalance(balance: string): string {
    const num = parseFloat(balance);
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + "M";
    } else if (num >= 1000) {
        return (num / 1000).toFixed(2) + "K";
    }
    return num.toFixed(2);
}

// AssetCard 컴포넌트
function AssetCard({ asset }: { asset: MyAsset }) {
    return (
        <div className="flex flex-col rounded-md relative ">
            <img src="/icon/assets/asset_frame.png" alt="asset_frame" className="absolute inset-0 w-full h-full -z-1" />
            <div className="flex flex-col px-10 gap-y-4 py-10">
                <div className="flex items-center gap-x-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                        <img
                            src={asset.tokenImage}
                            alt={asset.tokenSymbol}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="text-lg text-white font-bold">
                        ${asset.tokenSymbol}
                    </div>
                </div>
                <div className="flex gap-x-1 border border-gold-bold-dark rounded p-2 justify-end items-center">
                    <div className="text-sm text-gold-gradient-smooth">
                        {formatBalance(formatEther(BigInt(asset.balance)))}
                    </div>
                    <div className="text-sm text-gold-gradient-smooth">
                        {asset.tokenSymbol}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function MyAssetsPage() {
    const { username, profileImageUrl, tokenSymbol } = useMemexLogin();
    const { userAssets, isLoading, refetch, error } = useUserAssets();

    return (
        <div className="relative  bg-brown-0 min-h-screen">
            <div className="absolute max-w-xl left-0 right-0 top-0 object-contain h-[20%] mx-auto pig-shadow z-0" />
            <div className="absolute inset-0 people-shadow top-[30%]" />
            <div className="flex flex-col flex-1 relative z-1">
                <TopBar />

                <div className="flex items-center justify-center gap-x-3 py-2 m-5  text-3xl  bg-black/50 z-1" >
                    <img
                        src="/icon/assets/assets.png"
                        alt="my_memecoins"
                        className="w-14 h-14"
                        style={{ filter: "drop-shadow(0 0 10px rgba(255, 255, 255, 0.5))", imageRendering: "pixelated" }}
                    />
                    <span className="font-bold text-gold-gradient-smooth uppercase">my memecoins</span>
                </div>

                {/* Assets List */}
                <section className="flex flex-col px-5 pb-10 gap-y-2 mt-5 max-w-xl w-full mx-auto">
                    {/* 에러 표시 */}
                    {error && <div className="assets-error">{error}</div>}

                    {/* 로딩 중 - 스켈레톤 */}
                    {isLoading && (
                        <>
                            <AssetCardSkeleton delay={0} />
                            <AssetCardSkeleton delay={100} />
                            <AssetCardSkeleton delay={200} />
                            <AssetCardSkeleton delay={300} />
                        </>
                    )}

                    {/* Memex 토큰 */}
                    {!isLoading && userAssets?.memex && (
                        <FadeInUp delay={0} duration={400}>
                            <AssetCard asset={userAssets.memex} />
                        </FadeInUp>
                    )}

                    {/* My Token */}
                    {!isLoading && userAssets?.myToken && (
                        <FadeInUp delay={50} duration={400}>
                            <AssetCard asset={userAssets.myToken} />
                        </FadeInUp>
                    )}

                    {/* Other Tokens */}
                    {!isLoading && userAssets?.otherTokens && userAssets.otherTokens.length > 0 && (
                        <>
                            {userAssets.otherTokens.map((token, index) => (
                                <FadeInUp key={token.tokenAddress} delay={100 + index * 50} duration={400}>
                                    <AssetCard asset={token} />
                                </FadeInUp>
                            ))}
                        </>
                    )}

                    {/* 토큰이 없을 때 */}
                    {!isLoading &&
                        !userAssets &&
                        !error && <div className="assets-empty">보유한 토큰이 없습니다.</div>}
                </section>
            </div>
        </div>
    );
}
