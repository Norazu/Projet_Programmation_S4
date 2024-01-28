import { useEffect, useState } from "react";
import { socket } from "./socket.js";
import { Abandon, Sauvegarde, PlayerList, Timer, Plateau, Main, WinnerModal } from "./Game.js";


function Bataille({ gameEnd }){

    useEffect(() => {
        // Gestionnaire d'événement pour le déchargement de la fenêtr
        const handleUnload = () => {
            socket.emit("disconnecting")
            // Déconnectez le socket avant le déchargement de la fenêtre
            socket.close();
        };
        // Ajoutez le gestionnaire d'événement à l'événement unload
        window.addEventListener('beforeunload', handleUnload);
        
        return () => {
            // Retirez le gestionnaire d'événement lors du démontage du composant
            window.removeEventListener('beforeunload', handleUnload);
        };
    })
    return(
        <div className="Game">
            <WinnerModal gameEnd={gameEnd}/>
            <Abandon gameEnd={gameEnd}/>
            <Sauvegarde gameEnd={gameEnd}/>
            <PlayerList showCards={true}/>
            <Timer/>
            <Plateau/>
            <Main gameType={1}/>
        </div>
    );
}

export default Bataille;