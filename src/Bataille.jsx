import { useEffect, useState } from "react";
import { socket } from "./Socket.jsx";
import { Abandon, Sauvegarde, PlayerList, Timer, LaunchGame, Main, WinnerModal } from "./Game.jsx";

function Bataille({ gameEnd }){
    const [gameId, setGameId] = useState("");

    useEffect(() => {
        socket.on("setGameId", idRoom => {
            setGameId(idRoom);
        });
        // Gestionnaire d'événement pour le déchargement de la fenêtr
        const handleUnload = () => {
            socket.emit("disconnecting");
            // Déconnectez le socket avant le déchargement de la fenêtre
            socket.close();
        };
        // Ajoutez le gestionnaire d'événement à l'événement unload
        window.addEventListener('beforeunload', handleUnload);
        
        return () => {
            socket.off("setGameId");
            // Retirez le gestionnaire d'événement lors du démontage du composant
            window.removeEventListener('beforeunload', handleUnload);
        };
    });
    return(
        <>
        <WinnerModal gameEnd={gameEnd}/>
        <Abandon playerGameId={gameId} gameEnd={gameEnd}/>
        <Sauvegarde playerGameId={gameId} gameEnd={gameEnd}/>
        <div className="plateau">
            <PlayerList showCards={true}/>
        </div>
        <Timer/>
        <LaunchGame playerGameId={gameId}/>
        <Main playerGameId={gameId} gameType={1}/>
        </>
    );
}

export default Bataille;