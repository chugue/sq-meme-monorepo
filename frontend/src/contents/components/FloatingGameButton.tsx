import { useEffect, useState } from "react";
import squidoGif from "../../../assets/squido.gif";
import "./FloatingGameButton.css";

interface FloatingGameButtonProps {
    onClick: () => void;
}

/**
 * 플로팅 게임 버튼 컴포넌트
 * 우측 하단에 fixed 위치로 배치되는 원형 버튼
 * 호버 시: 아이콘 좌우 흔들림 + 무지개 랜덤 배경색
 */
export function FloatingGameButton({ onClick }: FloatingGameButtonProps) {
    const [backgroundColor, setBackgroundColor] = useState("#ff006e");
    const [isHovered, setIsHovered] = useState(false);

    // 호버 시에만 무지개 색상 랜덤 변경
    useEffect(() => {
        if (!isHovered) {
            // 호버 해제 시 기본 색상으로 복귀
            setBackgroundColor("#ff006e");
            return;
        }

        const rainbowColors = [
            "#ff006e", // 핑크
            "#8338ec", // 보라
            "#3a86ff", // 파랑
            "#06ffa5", // 청록
            "#ffbe0b", // 노랑
            "#fb5607", // 주황
            "#ff006e", // 핑크
            "#e63946", // 빨강
            "#f77f00", // 오렌지
            "#fcbf49", // 골드
            "#eae2b7", // 베이지
            "#d62828", // 다크레드
        ];

        const interval = setInterval(() => {
            const randomColor =
                rainbowColors[Math.floor(Math.random() * rainbowColors.length)];
            setBackgroundColor(randomColor);
        }, 100); // 0.1초마다 색상 변경

        return () => clearInterval(interval);
    }, [isHovered]);

    const handleClick = () => {
        console.log("🦑 [FloatingGameButton] 클릭됨");
        onClick();
    };

    return (
        <button
            type="button"
            className="squid-floating-game-button"
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label="게임 열기"
            style={{
                background: `linear-gradient(135deg, ${backgroundColor} 0%, ${backgroundColor}dd 100%)`,
                borderColor: backgroundColor,
            }}
        >
            <img
                src={squidoGif}
                alt="Squido"
                className="squid-floating-game-button-icon"
            />
        </button>
    );
}

