import { ReactNode } from "react";
import "./FadeInUp.css";

interface FadeInUpProps {
    children: ReactNode;
    delay?: number; // 딜레이 시간 (ms)
    duration?: number; // 애니메이션 지속 시간 (ms)
    className?: string;
}

export function FadeInUp({ 
    children, 
    delay = 0, 
    duration = 600,
    className = "" 
}: FadeInUpProps) {
    return (
        <div 
            className={`fade-in-up ${className}`}
            style={{
                animationDelay: `${delay}ms`,
                animationDuration: `${duration}ms`,
            }}
        >
            {children}
        </div>
    );
}

