/**
 * Flip Prize 컴포넌트
 * - 숫자가 바뀔 때 오른쪽에서 왼쪽으로 순차적으로 플립 애니메이션
 */

import { AnimatePresence, motion } from "framer-motion";
import { memo, useEffect, useRef, useState } from "react";

// squid-prize-value와 동일한 그라데이션 스타일
const prizeStyle: React.CSSProperties = {
    fontFamily: '"Press Start 2P", cursive',
    fontWeight: 400,
    fontSize: "11.5px",
    lineHeight: "150%",
    background: "linear-gradient(112.47deg, #ffe9bd 37.39%, #e0b372 81.42%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
};

interface FlipDigitProps {
    digit: string;
    delay: number;
    animationKey: number;
}

const FlipDigit = memo(function FlipDigit({
    digit,
    delay,
    animationKey,
}: FlipDigitProps) {
    return (
        <span
            style={{
                display: "inline-block",
                position: "relative",
                overflow: "hidden",
                height: "1.2em",
            }}
        >
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                    key={`${animationKey}-${digit}`}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{
                        duration: 0.5,
                        delay: delay,
                        ease: [0.25, 0.1, 0.25, 1],
                    }}
                    style={{ display: "inline-block", ...prizeStyle }}
                >
                    {digit}
                </motion.span>
            </AnimatePresence>
        </span>
    );
});

interface FlipPrizeProps {
    value: string; // 포맷된 숫자 문자열 (예: "1,234")
    animationDelay?: number; // 애니메이션 시작 전 딜레이 (ms)
}

export const FlipPrize = memo(function FlipPrize({
    value,
    animationDelay = 1000,
}: FlipPrizeProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const [animationKey, setAnimationKey] = useState(0);
    const prevValueRef = useRef(value);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // 초기값 동기화
        if (prevValueRef.current === value && displayValue === value) return;

        // 딜레이 후 애니메이션 시작
        timeoutRef.current = setTimeout(() => {
            setAnimationKey((k) => k + 1); // 애니메이션 트리거
            setDisplayValue(value);
            prevValueRef.current = value;
        }, animationDelay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [value, animationDelay, displayValue]);

    const chars = displayValue.split("");
    const digitCount = chars.filter((c) => /\d/.test(c)).length;

    // 오른쪽에서 왼쪽으로 stagger (1의 자리부터)
    let digitIndex = 0;
    const staggerDelay = 0.05; // 각 자릿수 간 딜레이

    return (
        <span
            style={{
                display: "inline-flex",
            }}
        >
            {chars.map((char, index) => {
                if (/\d/.test(char)) {
                    // 오른쪽에서 왼쪽으로 딜레이 계산
                    const currentDigitIndex = digitIndex;
                    digitIndex++;
                    const delay =
                        (digitCount - 1 - currentDigitIndex) * staggerDelay;

                    return (
                        <FlipDigit
                            key={`digit-${index}`}
                            digit={char}
                            delay={delay}
                            animationKey={animationKey}
                        />
                    );
                }
                // 콤마, 점 등 특수문자
                return (
                    <span key={`char-${index}`} style={prizeStyle}>
                        {char}
                    </span>
                );
            })}
        </span>
    );
});
