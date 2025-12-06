import { useEffect, useRef, useState } from "react";
import logo from "../../assets/logo.png";
import "./StartingLoading.css";

interface StartingLoadingProps {
    onComplete?: () => void;
    duration?: number; // GIF 재생 시간 (밀리초), 기본값 3000ms
}

// 별 컴포넌트
const Star = ({ top, left, size, delay }: { top: number; left: number; size: number; delay: number }) => {
    return (
        <div
            className="star"
            style={{
                position: "absolute",
                top: `${top}%`,
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                animationDelay: `${delay}s`,
            }}
        >
            <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M12 2L14.09 8.26L20 10L14.09 11.74L12 18L9.91 11.74L4 10L9.91 8.26L12 2Z"
                    fill="white"
                    opacity="0.8"
                />
            </svg>
        </div>
    );
};

// 별들을 생성하는 함수
const generateStars = (count: number, topRange: { min: number; max: number }) => {
    const stars = [];
    for (let i = 0; i < count; i++) {
        stars.push({
            top: Math.random() * (topRange.max - topRange.min) + topRange.min,
            left: Math.random() * 100,
            size: Math.random() * 3 + 5, // 5px ~ 8px
            delay: Math.random() * 2, // 0 ~ 2초
        });
    }
    return stars;
};

export default function StartingLoading({ onComplete, duration = 3000 }: StartingLoadingProps) {
    const [hasPlayed, setHasPlayed] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 상단과 하단 별들 생성 (한 번만 생성)
    const [topStars] = useState(() => generateStars(30, { min: 0, max: 20 })); // 상단 0-20%
    const [bottomStars] = useState(() => generateStars(30, { min: 80, max: 100 })); // 하단 80-100%

    useEffect(() => {
        // 한 번만 실행되도록 체크
        if (hasPlayed) return;

        const handleImageLoad = () => {
            // 이미지가 로드된 후 지정된 시간만큼 대기 후 콜백 실행
            timeoutRef.current = setTimeout(() => {
                setHasPlayed(true);
                onComplete?.();
            }, duration);
        };

        const img = imgRef.current;
        if (img) {
            if (img.complete) {
                // 이미 로드된 경우
                handleImageLoad();
            } else {
                img.addEventListener("load", handleImageLoad);
            }
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (img) {
                img.removeEventListener("load", handleImageLoad);
            }
        };
    }, [onComplete, duration, hasPlayed]);

    return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-[#070a31] relative overflow-hidden">
            {/* 상단 별들 */}
            {topStars.map((star, index) => (
                <Star key={`top-${index}`} {...star} />
            ))}

            {/* 하단 별들 */}
            {bottomStars.map((star, index) => (
                <Star key={`bottom-${index}`} {...star} />
            ))}

            <img
                ref={imgRef}
                src={"/start-loading.gif"}
                alt="Starting Loading"
                className="w-full h-full relative z-10"
                style={{ objectFit: "contain", imageRendering: "auto", }}
            />

            <div className="w-full absolute left-0 right-0 bottom-0 h-[50vh] flex items-start justify-center z-20">
                <img
                    src={logo}
                    alt="Logo"
                    className="w-3/5 max-w-xs aspect-square object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] animate-float logo-pixelated"
                />
                <div className="w-12 h-24 bg-[#070a31] absolute bottom-10 right-0 rounded-lg" />
            </div>
        </div>
    );
}