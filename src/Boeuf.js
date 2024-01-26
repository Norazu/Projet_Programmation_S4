import { CarteBoeuf, Abandon, Sauvegarde, PlayerList, Timer, Plateau, Main } from "./Game.js";
import { useEffect, useState } from "react";
import { socket } from "./socket.js";

let playerGameId = "";

function LignesCartes(){
    
    const [lignes, setLignes] = useState([]);
    const [choixLigne, setChoixLigne] = useState(false);

    function ligneChoisie(indexLigne) {
        setChoixLigne(false);
        socket.emit("ligneChoisie", playerGameId, sessionStorage.getItem("sessId"), indexLigne);
        console.log("signal sent");
    }

    useEffect(() => {
        socket.on("reste", reste => {
            setLignes(reste);
        });
        socket.on("choixLigne", (gameId) => {
            playerGameId = gameId;
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

    useEffect(() => {
        // Gestionnaire d'événement pour le déchargement de la fenêtr
        const handleUnload = () => {
            socket.emit("disconnecting")
            // Déconnectez le socket avant le déchargement de la fenêtre
            socket.close();
        };
        // Ajoutez le gestionnaire d'événement à l'événement unload
        window.addEventListener('beforeunload', handleUnload);
        socket.on("victory",(data)=>{
            window.alert("Le vainqueur de la partie est "+data);
            setTimeout(function() {
                gameEnd();
            }, 7000);
        })
        
        socket.on("victory",(data)=>{
            window.alert("Le vainqueur de la partie est "+data);
            setTimeout(function() {
                gameEnd();
              }, 7000);
        })
        
        return () => {
            socket.off("victory");
            window.removeEventListener('beforeunload', handleUnload);
        };
    })

    return (
        <div className="Game">
            <Abandon gameEnd={gameEnd}/>
            <Sauvegarde gameEnd={gameEnd}/>
            <PlayerList showCards={false}/>
            <LignesCartes/>
            <Timer/>
            <Plateau/>
            <Main gameType={2}/>
        </div>
    )
}

export default Boeuf;