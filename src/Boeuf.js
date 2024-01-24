import { CarteBoeuf, Abandon, Sauvegarde, PlayerList, Timer, Plateau, Main } from "./Game.js";
import { useEffect, useState } from "react";
import { socket } from "./socket.js";

function LignesCartes(){
    
    const [lignes, setLignes] = useState([]);
    const [choixLigne, setChoixLigne] = useState(false);

    function ligneChoisie(indexLigne) {
        setChoixLigne(false);
        socket.emit("ligneChoisie", indexLigne);
    }

    useEffect(() => {
        socket.on("reste", reste => {
            setLignes(reste);
        });
        socket.on("choixLigne", () => {
            setChoixLigne(true);
            console.log(choixLigne);
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

function Boeuf({gameEnd}){
    return (
        <div className="Game">
            <Abandon gameEnd={gameEnd}/>
            <Sauvegarde/>
            <PlayerList showCards={false}/>
            <LignesCartes/>
            <Timer/>
            <Plateau/>
            <Main gameType={2}/>
        </div>
    )
}

export default Boeuf;