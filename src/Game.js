import { useEffect, useState } from "react";
import { socket } from "./socket.js";

var playerId = localStorage.getItem("sessId");
var playerGameId = "";

function Sauvegarde(){
    function saveGame(gameId){
        socket.emit("saveGame",gameId);
    }
    return(
        <button onClick={()=>saveGame(playerGameId)}>Sauvegarder la partie</button>
    );
}

function Player({pseudo, nbCartes}){
    return(
        <div className="Player">
            <p>Nom: {pseudo}</p>
            <p>Cartes: {nbCartes}</p>
        </div>
    );
}

function PlayerList() {
    const [players, setPlayers] = useState([]);

    useEffect(() => {
        // Mettez à jour le state lorsque la liste de joueurs est reçue
        socket.on("playersList", (list) => {
            setPlayers(list);
        });

        socket.on("setGameId",(idRoom)=>{
            playerGameId = idRoom;
        });

        // Nettoyage de l'écouteur lorsque le composant est démonté
        return () => {
            socket.off("playersList");
            socket.off("setGameId")
        };
    }, []); // Le tableau vide signifie que cela s'exécute une seule fois lors du montage

    return (
        <div className="playerList">
            <h2>Joueurs de la partie : {playerGameId}</h2>
            {players.map((player) => (
                <Player pseudo={player} nbCartes={player} />
            ))}
        </div>
    );
}

function Timer(){
    const [timer, setTimer] = useState(5);

    useEffect(() => {
        socket.on("timeLeft", (timeLeft) => {
            setTimer(timeLeft);
        });

        return () => {
            socket.off("timeLeft");
        };
    }, []);

    function startTimer(){
        socket.emit("startTimer",playerGameId);
    }

    return(
        <div>
            <button onClick={startTimer}>Start Timer</button>
            <p>Temps Restant : {timer}</p>
        </div>
    );
}

function Carte({ cardName, onSelect, isSelected }) {
    var dir = "./Cards/";
    var ext = ".png";
    var imgSource = dir + cardName + ext;

    const selectThisCard = () => {
        onSelect(cardName);
    };

    const etat = isSelected ? 'carteChoisie' : 'default';

    return (
        <button onClick={selectThisCard} className="carte" data-etat={etat}>
            <img src={imgSource} alt={cardName} width="100"/>
            <div className="overlay"></div>
        </button>
    );
}

function Main() {
    const [cardList, setCardList] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);

    useEffect(() => {
        socket.emit("getCards", playerId, playerGameId);

        socket.on("cardsList", (list) => {
            setCardList(list);
        });

        socket.on("shuffleDone",()=>{
            socket.emit("getCards",playerId, playerGameId);
        });

        return () => {
            socket.off("cardsList");
            socket.off("shuffleDone");
        };
    }, []);

    const handleSelectCard = (cardName) => {
        setSelectedCard(cardName);
    };

    useEffect(() => {
        socket.on("choosingEnd",()=>{
            if(selectedCard == null){
                setSelectedCard(cardList[0]);
                socket.emit("submitCard", playerId, cardList[0], playerGameId);
            } else {
                socket.emit("submitCard", playerId, selectedCard, playerGameId);
            }
        });

        return () => {
            socket.off("choosingEnd");
        };
    },[cardList, selectedCard]);

    return (
        <div className="main">
            <h2>Votre main</h2>
            {cardList.map((cardName) => (
                <Carte
                    key={cardName}
                    cardName={cardName}
                    onSelect={handleSelectCard}
                    isSelected={selectedCard === cardName}
                />
            ))}
        </div>
    );
}

function Plateau(){
    function launchGame(){
        socket.emit("launchGame",playerGameId);
    }
    return (
        <div>
            <button onClick={launchGame}>Lancer la partie</button>
        </div>
    );
}

function Game(){
    return(
        <div className="Game">
            <Sauvegarde/>
            <PlayerList/>
            <Timer/>
            <Plateau/>
            <Main/>
        </div>
    );
}

export default Game;