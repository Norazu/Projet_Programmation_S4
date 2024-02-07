import { Abandon, Sauvegarde, PlayerList, Timer, LaunchGame, WinnerModal } from "./Game.jsx";
import { useEffect, useState } from "react";
import { socket } from "./Socket.jsx";
import { toast } from "react-toastify";

function CarteSet({ couleur, forme, nombre, remplissage }) {
    const formes = [];

    for (let i = 0; i < nombre; i++) {
        formes.push(
            <div key={i} className="formeContainer">
                <div className="forme" couleur={couleur} forme={forme} remplissage={remplissage}></div>
            </div>
        );
    }
    return (
        <button className="carteSet">
            {formes}
            <div className="overlay"></div>
        </button>
    );
}

function ListeCartesSet() {
    let cartes = [{couleur : "rouge", forme : "vague", nombre : 1, remplissage : "vide"},
    {couleur : "vert", forme : "ovale", nombre : 2, remplissage : "raye"},
    {couleur : "violet", forme : "losange", nombre : 3, remplissage : "plein"}];

    return(
        <>
        {cartes.map((carte, index) => (
            <CarteSet key={index} couleur={carte.couleur} forme={carte.forme} nombre={carte.nombre} remplissage={carte.remplissage}/>
        ))}
        </>
    );
}

function Set({ gameEnd }) {

    useEffect(() => {
        
        // Gestionnaire d'événement pour le déchargement de la fenêtre
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
            <ListeCartesSet/>
        </div>
        <Timer/>
        <LaunchGame/>
        </>
    );
}

export default Set;