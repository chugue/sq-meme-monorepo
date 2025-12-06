import { useEffect, useState } from "react";
import { backgroundApi } from "../../../contents/lib/backgroundApi";
import type { MyActiveGameItem } from "../../../types/response.types";
import { GameItem } from "./GameItem";

interface MyGamesSectionProps {
    isOpen: boolean;
}

export function MyGamesSection({ isOpen }: MyGamesSectionProps) {
    const [myGames, setMyGames] = useState<MyActiveGameItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            backgroundApi
                .getMyActiveGames()
                .then((response) => {
                    if (response?.myActiveGames) {
                        setMyGames(response.myActiveGames);
                    }
                })
                .catch((error) => {
                    console.error("Failed to fetch my active games:", error);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [isOpen]);

    return (
        <div className="my-games-section">
            <h2 className="my-games-title">MY GAMES</h2>
            <div className="games-list">
                {isLoading ? (
                    <div className="no-games">
                        <span>Loading...</span>
                    </div>
                ) : myGames.length > 0 ? (
                    myGames.map((game) => <GameItem key={game.gameId} game={game} />)
                ) : (
                    <div className="no-games">
                        <span>No games yet</span>
                    </div>
                )}
            </div>
        </div>
    );
}
