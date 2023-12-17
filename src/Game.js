import { useEffect, useState } from "react";
import { socket } from "./socket.js";

var playerGameId = "";

function Sauvegarde(){
    function saveGame(gameId){
        socket.emit("saveGame",gameId);
    }
    return(
        <button onClick={()=>saveGame(playerGameId)}>Sauvegarder la partie</button>
    );
}

function OtherPlayerCard({cardName}){
    return(
        <img src={"./Cards/"+cardName+".png"} alt={cardName} width="100"/>
    );
}

function Player({ pseudo, nbCartes }) {
    const [cards, setCards] = useState([]);
    socket.on("fight", (winner, allCards) => {
        setCards([]);
        allCards.forEach((element) => {
        if (element[0] === pseudo) {
          setCards((prevCards) => [...prevCards, element[1]]);
        }
      });
    });
  
    return (
      <div className="Player">
        <p>Nom: {pseudo}</p>
        <p>Cartes: {pseudo}</p>
        {cards.map((cardName, index) => (
            <OtherPlayerCard cardName={cardName} />
        ))}
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
            socket.off("setGameId");
        };
    }, []); // Le tableau vide signifie que cela s'exécute une seule fois lors du montage

    return (
        <div className="playerList">
            <h2>Joueurs de la partie : </h2>
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

    return(
        <div>
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
        socket.emit("getCards", localStorage.getItem("sessId"), playerGameId);

        socket.on("cardsList", (list) => {
            setCardList(list);
        });

        socket.on("cardsChanged",()=>{
            socket.emit("getCards",localStorage.getItem("sessId"),playerGameId);
        });

        return () => {
            socket.off("cardsList");
            socket.off("cardsChanged");
        };
    }, []);

    const handleSelectCard = (cardName) => {
        setSelectedCard(cardName);
    };

    useEffect(() => {
        socket.on("choosingEnd",()=>{
            if(selectedCard == null){
                setSelectedCard(cardList[0]);
                socket.emit("submitCard", localStorage.getItem("sessId"), cardList[0], playerGameId);
            } else {
                socket.emit("submitCard", localStorage.getItem("sessId"), selectedCard, playerGameId);
            }
        });

        socket.on("unselectCard",()=>{
            setSelectedCard(null);
        })

        socket.on("secondChoosingEnd",(playerList, cardsToWin)=>{
            if(playerList.includes(localStorage.getItem("sessId"))){
                if(selectedCard == null){
                    setSelectedCard(cardList[0]);
                    socket.emit("submitCardSecondTime", localStorage.getItem("sessId"), cardList[0], playerGameId, cardsToWin);
                } else {
                    socket.emit("submitCardSecondTime", localStorage.getItem("sessId"), selectedCard, playerGameId, cardsToWin);
                }
            }
        });

        return () => {
            socket.off("choosingEnd");
            socket.off("unselectCard");
            socket.off("secondChoosingEnd");
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
    function notEnoughPlayers(){
        window.alert("Il n'y a pas assez de joueurs pour démarrer une partie");
      }
    useEffect(() =>{
        socket.on("notEnoughPlayers", notEnoughPlayers)
        return ()=> {
            socket.off("notEnoughPlayers")
        }
    })

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
    useEffect(() => {
    
        // Gestionnaire d'événement pour le déchargement de la fenêtre
        const handleUnload = () => {
            socket.emit("disconnecting")
          // Déconnectez le socket avant le déchargement de la fenêtre
          socket.close();
        };
    
        // Ajoutez le gestionnaire d'événement à l'événement unload
        window.addEventListener('beforeunload', handleUnload);
    
        // Nettoyage lorsque le composant est démonté
        return () => {
          // Retirez le gestionnaire d'événement lors du démontage du composant
          window.removeEventListener('beforeunload', handleUnload);
    
        };
      }, []);

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