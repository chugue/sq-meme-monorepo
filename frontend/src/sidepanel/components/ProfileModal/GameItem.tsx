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
        <div className="game-item">
            <img src={game.tokenImage || ""} alt={game.tokenSymbol || "Token"} className="game-token-image" />
            <span className="game-token-name">{game.tokenSymbol || "Unknown"}</span>
            <div className="game-info">
                <span className="game-prize-pool">{formatPrizePool(game.currentPrizePool)}</span>
                <span className="game-time-remaining">{timeRemaining}</span>
            </div>
        </div>
    );
}
