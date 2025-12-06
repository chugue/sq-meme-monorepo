import "./AssetCardSkeleton.css";
import { FadeInUp } from "./FadeInUp";

interface AssetCardSkeletonProps {
    delay?: number;
}

export function AssetCardSkeleton({ delay = 0 }: AssetCardSkeletonProps) {
    return (
        <FadeInUp delay={delay}>
            <div className="flex flex-col rounded-md relative">
                <img
                    src="/icon/assets/asset_frame.png"
                    alt="asset_frame"
                    className="absolute inset-0 w-full h-full -z-1 opacity-50"
                />
                <div className="flex flex-col px-10 gap-y-4 py-10">
                    <div className="flex items-center gap-x-4">
                        {/* 토큰 이미지 스켈레톤 */}
                        <div className="w-12 h-12 rounded-full shrink-0 skeleton-circle" />
                        {/* 토큰 심볼 스켈레톤 */}
                        <div className="h-6 w-24 skeleton-bar" />
                    </div>
                    {/* 잔액 박스 스켈레톤 */}
                    <div className="flex gap-x-1 border border-gold-bold-dark rounded p-2 justify-end items-center">
                        <div className="h-4 w-16 skeleton-bar" />
                        <div className="h-4 w-12 skeleton-bar" />
                    </div>
                </div>
            </div>
        </FadeInUp>
    );
}

