import io from "socket.io-client";
import { useEffect, useState } from "react";

const socket = io.connect("http://localhost:3001");

var playerId = "001";

function Sauvegarde(){
    return(
        <button>Sauvegarder la partie</button>
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
        socket.emit("getPlayers");

        // Mettez à jour le state lorsque la liste de joueurs est reçue
        socket.on("playersList", (list) => {
            setPlayers(list);
        });

        // Nettoyage de l'écouteur lorsque le composant est démonté
        return () => {
            socket.off("playersList");
        };
    }, []); // Le tableau vide signifie que cela s'exécute une seule fois lors du montage

    return (
        <div className="playerList">
            {players.map((player) => (
                <Player pseudo={player[0]} nbCartes={player[1]} />
            ))}
        </div>
    );
}

function Timer(){
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        socket.on("timeLeft", (timeLeft) => {
            setTimer(timeLeft);
        });

        return () => {
            socket.off("timeLeft");
        };
    }, []);

    function startTimer(){
        socket.emit("startTimer");
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

    const buttonStyle = {
        backgroundColor: isSelected ? 'green' : '',
        border: 'none',
        cursor: 'pointer',
    };

    const imgStyle = {
        padding: "10px"
    }

    return (
        <button onClick={selectThisCard} style={buttonStyle}>
            <img src={imgSource} alt={cardName} width="100" style={imgStyle}/>
        </button>
    );
}

function Main() {
    const [cardList, setCardList] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);

    useEffect(() => {
        socket.emit("getCards", playerId);

        socket.on("cardsList", (list) => {
            setCardList(list);
        });

        return () => {
            socket.off("cardsList");
        };
    }, []);

    const handleSelectCard = (cardName) => {
        setSelectedCard(cardName);
    };

    useEffect(() => {
        socket.on("choosingEnd",()=>{
            if(selectedCard == null){
                setSelectedCard(cardList[0])
            }
            socket.emit("submitCard", { playerId, selectedCard });
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

function Chatroom(){
    return(
        <h2>Chatroom</h2>
    );
}

function Game(){
    return(
        <div>
            <Sauvegarde/>
            <PlayerList/>
            <Timer/>
            <Main/>
            <Chatroom/>
        </div>
    );
}

export default Game;