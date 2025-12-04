import { useEffect, useRef, useState } from "react";
import "./GamePopup.css";

interface GamePopupProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    onOpen?: () => void; // 팝업이 열릴 때 호출되는 콜백
}

/**
 * 게임 팝업 컴포넌트
 * 게임 컨텐츠를 팝업 모달로 표시
 */
export function GamePopup({ isOpen, onClose, children, onOpen }: GamePopupProps) {
    const [isScrolling, setIsScrolling] = useState(false);
    const popupContainerRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const prevIsOpenRef = useRef<boolean>(false);

    // 모달이 열릴 때 body 스크롤 방지 및 onOpen 콜백 호출
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            // 팝업이 닫혔다가 다시 열릴 때 onOpen 콜백 호출
            if (!prevIsOpenRef.current && onOpen) {
                onOpen();
            }
        } else {
            document.body.style.overflow = "";
        }
        prevIsOpenRef.current = isOpen;

        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen, onOpen]);

    // 스크롤 이벤트 처리
    useEffect(() => {
        const container = popupContainerRef.current;
        if (!container || !isOpen) return;

        const handleScroll = () => {
            setIsScrolling(true);

            // 스크롤이 멈추면 1초 후 스크롤바 숨김
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
            }, 1000);
        };

        container.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            container.removeEventListener("scroll", handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [isOpen]);

    // 배경 클릭 시 닫기
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // 모달이 닫혀있으면 렌더링하지 않음
    if (!isOpen) return null;


    return (
        <div className="squid-game-popup-backdrop" onClick={handleBackdropClick}>
            <div
                ref={popupContainerRef}
                className={`squid-game-popup-container ${isScrolling ? "is-scrolling" : ""
                    }`}
            >
                {/* 헤더 */}
                <div className="squid-game-popup-header">
                    <h2 className="squid-game-popup-title">SQUID MEME GAME</h2>
                    <button
                        type="button"
                        className="squid-game-popup-close"
                        onClick={onClose}
                        aria-label="닫기"
                    >
                        &times;
                    </button>
                </div>

                {/* 컨텐츠 영역 */}
                <div className="squid-game-popup-content">{children}</div>
            </div>
        </div>
    );
}

