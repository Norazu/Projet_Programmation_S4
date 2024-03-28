import { CarteBoeuf, Abandon, Sauvegarde, PlayerList, Timer, LaunchGame, Main, WinnerModal } from "./Game.jsx";
import { useEffect, useState } from "react";
import { socket } from "./Socket.jsx";
import { toast } from "react-toastify";

function LignesCartes({ playerGameId }){
    
    const [lignes, setLignes] = useState([]);
    const [choixLigne, setChoixLigne] = useState(false);

    function ligneChoisie(indexLigne) {
        setChoixLigne(false);
        socket.emit("ligneChoisie", playerGameId, sessionStorage.getItem("sessId"), indexLigne);
    }

    useEffect(() => {
        socket.on("reste", reste => {
            setLignes(reste);
        });
        socket.on("choixLigne", () => {
            setChoixLigne(true);
        });

        return () => {
            socket.off("reste");
            socket.off("choixLigne");
        }
    });

    return (
        <div className="LignesCartes">
            {lignes.map((cards, index) => (
                <>
                {choixLigne ? (<button onClick={() => ligneChoisie(index)}>Choisir cette ligne</button>) : (<></>)}
                <ul className="LigneCartes" id={index} key={index}>
                    {cards.map((cardNum) => (<li><CarteBoeuf CardNumber={cardNum} disabled={true}/></li>))}
                </ul>
                </>
            ))}
        </div>
    );
}

function Boeuf({ gameEnd }){
    const [gameId, setGameId] = useState("");

    useEffect(() => {
        socket.on("setGameId", idRoom => {
            setGameId(idRoom);
        });
        socket.on("playerIsChoosing", idJoueur => {
            toast.info(idJoueur + " est en train de choisir une ligne");
        });
        socket.on("pauseImpossible", () => {
            toast.info("Impossible de mettre en pause, un joueur doit choisir une ligne")
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
            socket.off("playerIsChoosing");
            socket.off("pauseImpossible")
            window.removeEventListener('beforeunload', handleUnload);
        };
    });

    return (
        <>
        <WinnerModal gameEnd={gameEnd}/>
        <Abandon playerGameId={gameId} gameEnd={gameEnd}/>
        <Sauvegarde playerGameId={gameId} gameEnd={gameEnd}/>
        <div className="plateau">
            <PlayerList showCards={false}/>
            <LignesCartes playerGameId={gameId}/>
        </div>
        <Timer/>
        <LaunchGame playerGameId={gameId}/>
        <Main playerGameId={gameId} gameType={2}/>
        </>
    )
}

export default Boeuf;