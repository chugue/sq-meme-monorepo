/**
 * Flip Counter 타이머 컴포넌트
 * - 숫자가 바뀔 때 플립 애니메이션
 */

import { AnimatePresence, motion } from "framer-motion";
import { memo, useEffect } from "react";
import { FONTS, loadFont } from "../../utils/loadFont";

const TIMER_ADDITIONAL_STYLES = `
    .squid-timer-value {
        font-family: 'Timer', monospace !important;
        font-size: 40px !important;
    }
    .squid-timer-value * {
        font-family: inherit !important;
        font-size: inherit !important;
    }
`;

// 그라데이션 텍스트 스타일 (CSS의 squid-timer-value와 동일)
const gradientStyle: React.CSSProperties = {
    fontFamily: "'Timer', monospace",
    background: "linear-gradient(180deg, #ff494d 26.05%, #c20004 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    fontSize: "50px",
};

interface FlipDigitProps {
    digit: string;
}

const FlipDigit = memo(function FlipDigit({ digit }: FlipDigitProps) {
    return (
        <span style={{ display: "inline-block", position: "relative" }}>
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={digit}
                    initial={{ y: -8, opacity: 0.5 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 8, opacity: 0 }}
                    transition={{
                        duration: 0.15,
                        ease: "easeOut",
                    }}
                    style={{
                        display: "inline-block",
                        ...gradientStyle,
                    }}
                >
                    {digit}
                </motion.span>
            </AnimatePresence>
        </span>
    );
});

interface FlipTimerProps {
    time: string; // "HH:MM:SS" format
}

export const FlipTimer = memo(function FlipTimer({ time }: FlipTimerProps) {
    // 폰트 로드
    useEffect(() => {
        loadFont({
            ...FONTS.TIMER,
            additionalStyles: TIMER_ADDITIONAL_STYLES,
        });
    }, []);

    const chars = time.split("");

    return (
        <span
            style={{
                display: "inline-flex",
                fontFamily: "'Timer', monospace",
            }}
        >
            {chars.map((char, index) =>
                char === ":" ? (
                    <span key={`colon-${index}`} style={gradientStyle}>
                        :
                    </span>
                ) : (
                    <FlipDigit key={`digit-${index}`} digit={char} />
                ),
            )}
        </span>
    );
});
