import { useEffect, useState } from "react";
import { socket } from "./socket.js";

var playerGameId = "";

function Sauvegarde(){
    function saveGame(gameId,pseudo){
        socket.emit("saveGame",gameId,pseudo);
    }
    function pasPermSauvegarde(){
        window.alert("Vous n'avez pas la permission de sauvegarder, seul le créateur de la partie le peut");
    }
    function saveGameNotStarted(){
        window.alert("Vous ne pouvez pas sauvegarder si la partie n'a pas démarré");
    }
    useEffect(()=>{
        socket.on("PasPermSauvegarde", pasPermSauvegarde);
        socket.on("SaveGameNotStarted", saveGameNotStarted)
        return ()=>{
          socket.off("PasPermSauvegarde");
          socket.off("SaveGameNotStarted");
        }
    
      });

    return(
        <button onClick={()=>saveGame(playerGameId,localStorage.getItem("sessId"))}>Sauvegarder la partie</button>
    );
}

function OtherPlayerCard({cardName}){
    return(
        <img src={"./Cards/"+cardName+".png"} alt={cardName} width="100"/>
    );
}

function Player({ pseudo, nbCartes }) {
    const [cards, setCards] = useState([]);
    const [hueRotateValue, setHueRotateValue] = useState(Math.floor(Math.random() * 360));
    socket.on("fight", (winner, allCards) => {
        setCards([]);
        allCards.forEach((element) => {
        if (element[0] === pseudo) {
          setCards((prevCards) => [...prevCards, element[1]]);
        }
      });
    });
    return (
        <div className="PLayerContainer">
            <p className="pseudo" style={{ filter: `hue-rotate(${hueRotateValue}deg)` }}>{pseudo}</p>
            <div className="Player" style={{ filter: `hue-rotate(${hueRotateValue}deg)` }}>
                <p className="cartes">{nbCartes}</p>
            </div>
            <div className="cardsPlayed">
                {cards.map((cardName, index) => (
                    <OtherPlayerCard cardName={cardName} />
                    ))}
            </div>
        </div>
    );
  }
  

function PlayerList() {
    const [players, setPlayers] = useState([]);
    const [nbCartes, setNbCartes] = useState({});

    useEffect(() => {
        // Mettez à jour le state lorsque la liste de joueurs est reçue
        socket.on("playersList", (list) => {
            setPlayers(list);
        });

        socket.on("setGameId",(idRoom)=>{
            playerGameId = idRoom;
        });

        socket.on("nbCartes",(nbCartesByPlayers) => {
            setNbCartes(nbCartesByPlayers);
        });

        // Nettoyage de l'écouteur lorsque le composant est démonté
        return () => {
            socket.off("playersList");
            socket.off("setGameId");
            socket.off("nbCartes");
        };
    }, []); // Le tableau vide signifie que cela s'exécute une seule fois lors du montage

    function getNbCartes(player){
        var nbCartesPlayer = 0;
        if(nbCartes[player]!=undefined){
            nbCartesPlayer = nbCartes[player];
        }
        return nbCartesPlayer;
    }

    return (
        <div className="playerList">
            <h2>Joueurs de la partie : </h2>
            {players.map((player) => (
                <Player pseudo={player} nbCartes={getNbCartes(player)} />
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
    function pasDePerms(){
        window.alert("Vous n'avez pas la permission de démarrer la partie, seul le createur peut");
    }

    useEffect(() =>{
        socket.on("notEnoughPlayers", notEnoughPlayers);
        socket.on("PasDePerms",pasDePerms);
        return ()=> {
            socket.off("notEnoughPlayers")
            socket.off("PasDePerms")
        }
    })

    function launchGame(){
        socket.emit("launchGame",playerGameId,localStorage.getItem("sessId"));
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