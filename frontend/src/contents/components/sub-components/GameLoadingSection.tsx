import { getExtensionImageUrl } from "@/contents/utils/getExtensionImageUrl";
import { FONTS, loadFont } from "@/contents/utils/loadFont";
import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { currentPageInfoAtom } from "../../atoms/currentPageInfoAtoms";
import "./GameLoadingSection.css";

// 주소 축약 (0x856C...e74A 형태)
function shortenAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * 게임 정보 로딩 중 화면
 */
export function GameLoadingSection() {
    const currentPageInfo = useAtomValue(currentPageInfoAtom);

    // 폰트 로드
    useEffect(() => {
        loadFont(FONTS.PRESS_START_2P);
    }, []);

    const tokenAddress = currentPageInfo?.contractAddress || "";
    const xHandle = currentPageInfo?.username
        ? `@${currentPageInfo.username}`
        : "";

    return (
        <div className="game-loading-container">
            {/* 오징어 캐릭터 이미지 */}
            <motion.div
                className="squid-character"
                animate={{
                    y: [0, -10, 0],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            >
                <img
                    src={getExtensionImageUrl("icon/mascot-loading.png")}
                    alt="Squid"
                    className="squid-image"
                />
            </motion.div>

            {/* 토큰 정보 프레임 */}
            <motion.div
                className="token-info-frame"
                style={{ minHeight: "108px" }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                {/* 왼쪽 대괄호 */}
                <div className="bracket left-bracket">
                    <div className="bracket-top"></div>
                    <div className="bracket-line"></div>
                    <div className="bracket-bottom"></div>
                </div>

                {/* 토큰 정보 */}
                <div className="token-info-content">
                    <span className="token-label">TOKEN ADDRESS</span>
                    <span className="token-value">
                        {shortenAddress(tokenAddress)}
                    </span>
                    {xHandle && <span className="token-handle">{xHandle}</span>}
                </div>

                {/* 오른쪽 대괄호 */}
                <div className="bracket right-bracket">
                    <div className="bracket-top"></div>
                    <div className="bracket-line"></div>
                    <div className="bracket-bottom"></div>
                </div>
            </motion.div>

            {/* LOADING 텍스트 */}
            <div className="loading-text">LOADING...</div>
        </div>
    );
}
