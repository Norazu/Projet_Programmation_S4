import { useEffect } from "react";
import { socket } from "./Socket.jsx";
import { Abandon, Sauvegarde, PlayerList, Timer, LaunchGame, Main, WinnerModal } from "./Game.jsx";

function Bataille({ gameEnd }){

    useEffect(() => {
        // Gestionnaire d'événement pour le déchargement de la fenêtr
        const handleUnload = () => {
            socket.emit("disconnecting");
            // Déconnectez le socket avant le déchargement de la fenêtre
            socket.close();
        };
        // Ajoutez le gestionnaire d'événement à l'événement unload
        window.addEventListener('beforeunload', handleUnload);
        
        return () => {
            // Retirez le gestionnaire d'événement lors du démontage du composant
            window.removeEventListener('beforeunload', handleUnload);
        };
    });
    return(
        <>
        <WinnerModal gameEnd={gameEnd}/>
        <Abandon gameEnd={gameEnd}/>
        <Sauvegarde gameEnd={gameEnd}/>
        <div className="plateau">
            <PlayerList showCards={true}/>
        </div>
        <Timer/>
        <LaunchGame/>
        <Main gameType={1}/>
        </>
    );
}

export default Bataille;