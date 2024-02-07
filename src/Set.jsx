import { Abandon, Sauvegarde, PlayerList, Timer, LaunchGame, WinnerModal } from "./Game.jsx";
import { useEffect, useState } from "react";
import { socket } from "./Socket.jsx";
import { toast } from "react-toastify";

function Set({ gameEnd }) {

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
            window.removeEventListener('beforeunload', handleUnload);
        };
    });

    return (
        <>
        <WinnerModal gameEnd={gameEnd}/>
        <Abandon gameEnd={gameEnd}/>
        <Sauvegarde gameEnd={gameEnd}/>
        <div className="plateau">
            <PlayerList showCards={false}/>
        </div>
        <Timer/>
        <LaunchGame/>
        </>
    );
}