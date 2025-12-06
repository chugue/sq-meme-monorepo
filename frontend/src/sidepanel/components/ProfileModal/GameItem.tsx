import { backgroundApi } from "@/contents/lib/backgroundApi";
import { useEffect, useState } from "react";
import type { MyActiveGameItem } from "../../../types/response.types";
import { formatPrizePool, formatTimeRemaining } from "./formatters";

interface GameItemProps {
    game: MyActiveGameItem;
}

export function GameItem({ game }: GameItemProps) {
    const [timeRemaining, setTimeRemaining] = useState(() => formatTimeRemaining(game.endTime));

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeRemaining(formatTimeRemaining(game.endTime));
        }, 1000);

        return () => clearInterval(interval);
    }, [game.endTime]);

    return (
        <div
            className="game-item cursor-pointer"
            onClick={async () => {
                if (game.tokenUsername && game.tokenUsertag) {
                    try {
                        await backgroundApi.navigateToUrl(`https://app.memex.xyz/profile/${game.tokenUsername}/${game.tokenUsertag}`);
                    } catch (error) {
                        console.error("navigateToUrl error:", error);
                    }
                }
            }}
        >
            <img src={game.tokenImage || ""} alt={game.tokenSymbol || "Token"} className="w-15 h-15 rounded-full overflow-hidden shadow-xl" />
            <span className="game-token-name">{game.tokenSymbol || "Unknown"}</span>
            <div className="game-info">
                <span className="game-prize-pool">{formatPrizePool(game.currentPrizePool)}</span>
                <span className="font-pixel text-white text-[12px]">{timeRemaining}</span>
            </div>
        </div>
    );
}
