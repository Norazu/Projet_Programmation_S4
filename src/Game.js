import { useEffect, useState, useRef } from "react";
import { socket } from "./socket.js";
import { toast } from "react-toastify";

var playerGameId = "";

export function Abandon({ gameEnd }) {
    function giveUp(gameId, pseudo) {
        socket.emit("giveUp", gameId, pseudo);
    }
    function partieAbandonnee() {
        gameEnd();
    }
    useEffect(()=>{
        socket.on("gaveUp", partieAbandonnee);
        return () => {
            socket.off("gaveUp");
        }
    })
    return (
        <button id="giveUp" onClick={() => giveUp(playerGameId, sessionStorage.getItem("sessId"))}>Abandonner</button>
    );
}

export function Sauvegarde({ gameEnd }) {
    const [gameIsPaused, setGameIsPaused] = useState(false);

    function gameEnPause() {
        setGameIsPaused(true);
        document.getElementById("pause").innerText = "Enlever la pause";
    }

    function gameReprise() {
        setGameIsPaused(false);
        document.getElementById("pause").innerText = "Pause";
    }

    function pauseGameNotStarted() {
        toast.error("Vous ne pouvez pas mettre en pause la partie si elle n'a pas démarré");
    }

    function pasPermPause() {
        toast.error("Vous n'avez pas la permission de mettre en pause la partie");
    };

    function pause() {
        if (!gameIsPaused) {
            socket.emit("pauseGame", playerGameId, sessionStorage.getItem("sessId"));
        } else {
            socket.emit("unpauseGame", playerGameId, sessionStorage.getItem("sessId"));
        }
    };

    function saveGame(gameId, pseudo) {
        socket.emit("saveGame", gameId, pseudo);
    }

    function pasPermSauvegarde() {
        toast.error("Vous n'avez pas la permission de sauvegarder la partie");
    }

    function saveGameNotStarted() {
        toast.error("Vous ne pouvez pas sauvegarder si la partie n'a pas démarré");
    }

    function reload(id) {
        toast.info("Le joueur " + id + " a abandonné");
        window.location.reload();
    }

    function partieSaved() {
        toast.info("Partie sauvegardée avec succès");
        gameEnd();
    }

    useEffect(() => {
        socket.on("quit", id => {
            reload(id);
        });
        socket.on("pasPermPause", pasPermPause);
        socket.on("pauseGameNotStarted", pauseGameNotStarted);
        socket.on("gameEnPause", gameEnPause);
        socket.on("gameReprise", gameReprise);
        socket.on("PasPermSauvegarde", pasPermSauvegarde);
        socket.on("SaveGameNotStarted", saveGameNotStarted);
        socket.on("partieSauvegardee", partieSaved);
        return () => {
            socket.off("quit");
            socket.off("pasPermPause");
            socket.off("pauseGameNotStarted");
            socket.off("gameEnPause");
            socket.off("gameReprise");
            socket.off("PasPermSauvegarde");
            socket.off("SaveGameNotStarted");
            socket.off("partieSauvegardee");
        }

    });

    return (
        <>
            <button id="pause" onClick={() => pause()}>Pause</button>
            {gameIsPaused && (
                <button onClick={() => saveGame(playerGameId, sessionStorage.getItem("sessId"))}>Sauvegarder la partie</button>
            )}
        </>
    );
}

function OtherPlayerCard({ cardName }) {
    return (
        <img src={"./Cards/" + cardName + ".png"} alt={cardName} width="100" />
    );
}

function Player({ pseudo, nbCartes, showCards, score }) {
    const [cards, setCards] = useState([]);
    const hueRotateValue = Math.floor(Math.random() * 360);
    socket.on("fight", (winner, allCards) => {
        setCards([]);
        allCards.forEach((element) => {
            if (element[0] === pseudo) {
                setCards((prevCards) => [...prevCards, element[1]]);
            }
        });
    });
    if (showCards) {
        return (
            <div className="PLayerContainer">
                <p className="pseudo" style={{ filter: `hue-rotate(${hueRotateValue}deg)` }}>{pseudo}</p>
                <div className="Player" style={{ filter: `hue-rotate(${hueRotateValue}deg)` }}>
                    <p className="cartes">{nbCartes}</p>
                </div>
                <div className="cardsPlayed">
                    {cards.map((cardName, index) => (
                        <OtherPlayerCard key={index} cardName={cardName} />
                    ))}
                </div>
            </div>
        );
    } else {
        return (
            <div className="PLayerContainer">
                <p className="pseudo" style={{ filter: `hue-rotate(${hueRotateValue}deg)` }}>{pseudo}</p>
                <p className="score" style={{ filter: `hue-rotate(${hueRotateValue}deg)` }}>{score}</p>
                <div className="cardsPlayed">
                    {cards.map((cardName, index) => (
                        <OtherPlayerCard cardName={cardName} key={index}/>
                    ))}
                </div>
            </div>
        )
    }
}


export function PlayerList({ showCards }) {
    const [players, setPlayers] = useState([]);
    const [nbCartes, setNbCartes] = useState({});
    const [scores, setScores] = useState({});

    useEffect(() => {
        // Mettez à jour le state lorsque la liste de joueurs est reçue
        socket.on("playersList", (list) => {
            setPlayers(list);
        });

        socket.on("setGameId", (idRoom) => {
            playerGameId = idRoom;
        });

        socket.on("nbCartes", (nbCartesByPlayers) => {
            setNbCartes(nbCartesByPlayers);
        });
        
        socket.on("scorePlayer", (scoreByPlayer) => {
            setScores(scoreByPlayer);
        });

        // Nettoyage de l'écouteur lorsque le composant est démonté
        return () => {
            socket.off("playersList");
            socket.off("setGameId");
            socket.off("nbCartes");
            socket.off("scorePlayer");
        };
    }, []); // Le tableau vide signifie que cela s'exécute une seule fois lors du montage

    function getNbCartes(player) {
        var nbCartesPlayer = 0;
        if (nbCartes[player] !== undefined) {
            nbCartesPlayer = nbCartes[player];
        }
        return nbCartesPlayer;
    }

    function getScore(player) {
        var score = 0;
        if (scores[player] !== undefined) {
            score = scores[player];
        }
        return score;
    }

    return (
        <div className="playerList">
            <h2>Joueurs de la partie : </h2>
            {players.map((player, index) => (
                <Player key={index} pseudo={player} nbCartes={getNbCartes(player)} score={getScore(player)} showCards={showCards} />
            ))}
        </div>
    );
}

export function Timer() {
    const [timer, setTimer] = useState(5);

    useEffect(() => {
        socket.on("timeLeft", (timeLeft) => {
            setTimer(timeLeft);
        });

        return () => {
            socket.off("timeLeft");
        };
    }, []);

    return (
        <div>
            <p>Temps Restant : {timer}</p>
        </div>
    );
}

function Carte({ cardName, onSelect, isSelected }) {
    var dir = "./Bataille/Cards/";
    var ext = ".png";
    var imgSource = dir + cardName + ext;

    const selectThisCard = () => {
        onSelect(cardName);
    };

    const etat = isSelected ? 'carteChoisie' : 'default';

    return (
        <button onClick={selectThisCard} className="carte" data-etat={etat}>
            <img src={imgSource} alt={cardName} width="100" />
            <div className="overlay"></div>
        </button>
    );
}

export function CarteBoeuf({ CardNumber, disabled, onSelect, isSelected }) {

    const selectThisCard = () => {
        if(!disabled){
            onSelect(CardNumber);
        }
    };

    let etat = isSelected ? 'carteChoisie' : 'default';

    if(disabled){
        etat = 'disabled';
    }

    let teteNb;

    if (CardNumber === 55) {
        teteNb = 7;
    } else if (CardNumber % 10 === 0) {
        teteNb = 3;
    } else if (CardNumber % 5 === 0) {
        teteNb = 2;
    } else {
        teteNb = 1;
    }
    if (CardNumber % 11 === 0 && CardNumber !== 55) {
        teteNb += 4;
    }

    var tetes = [];
    for (var i = 0; i < teteNb; i++) {
        tetes.push(<div className="tete_boeuf" key={i} />);
    }

    return (
        <button disabled={disabled} className="carte_boeuf" onClick={selectThisCard} data-etat={etat}>
            <div className="carte" data-tetes={teteNb}>
                <div className="carteTop">
                    <p className="CardNumber">{CardNumber}</p>
                    <div className="tetes">{tetes}</div>
                    <p className="CardNumber">{CardNumber}</p>
                </div>
                <p className="CardNumber_Center">{CardNumber}</p>
                <div className="carteBot">
                    <p className="CardNumber">{CardNumber}</p>
                    <p className="CardNumber">{CardNumber}</p>
                </div>
            </div>
            <div className="overlay"></div>
        </button>
    );
}

export function Main({ gameType }) {
    const [cardList, setCardList] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);

    useEffect(() => {
        socket.emit("getCards", sessionStorage.getItem("sessId"), playerGameId);

        socket.on("cardsList", (list) => {
            setCardList(list);
        });

        socket.on("cardsChanged", () => {
            socket.emit("getCards", sessionStorage.getItem("sessId"), playerGameId);
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
        socket.on("choosingEnd", () => {
            if (selectedCard == null) {
                setSelectedCard(cardList[0]);
                socket.emit("submitCard", sessionStorage.getItem("sessId"), cardList[0], playerGameId);
            } else {
                socket.emit("submitCard", sessionStorage.getItem("sessId"), selectedCard, playerGameId);
            }
        });

        socket.on("unselectCard", () => {
            setSelectedCard(null);
        })

        socket.on("secondChoosingEnd", (playerList, cardsToWin) => {
            if (playerList.includes(sessionStorage.getItem("sessId"))) {
                if (selectedCard == null) {
                    setSelectedCard(cardList[0]);
                    socket.emit("submitCardSecondTime", sessionStorage.getItem("sessId"), cardList[0], playerGameId, cardsToWin);
                } else {
                    socket.emit("submitCardSecondTime", sessionStorage.getItem("sessId"), selectedCard, playerGameId, cardsToWin);
                }
            }
        });

        return () => {
            socket.off("choosingEnd");
            socket.off("unselectCard");
            socket.off("secondChoosingEnd");
        };
    }, [cardList, selectedCard]);
    switch (gameType) {
        case 1:
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
        case 2:
            return (
                <div className="main">
                    <h2>Votre main</h2>
                    {cardList.map((cardName) => (
                        <CarteBoeuf
                            CardNumber={cardName}
                            onSelect={handleSelectCard}
                            isSelected={selectedCard === cardName}
                        />
                    ))}
                </div>
            );
        default:
            break;
    }
}

export function Plateau() {
    function notEnoughPlayers() {
        toast.info("Il n'y a pas assez de joueurs pour démarrer une partie");
    }
    function pasDePerms() {
        toast.error("Vous n'avez pas la permission de démarrer la partie");
    }

    useEffect(() => {
        socket.on("notEnoughPlayers", notEnoughPlayers);
        socket.on("PasDePerms", pasDePerms);
        return () => {
            socket.off("notEnoughPlayers")
            socket.off("PasDePerms")
        }
    })

    function launchGame() {
        socket.emit("launchGame", playerGameId, sessionStorage.getItem("sessId"));
    }

    return (
        <div>
            <button onClick={launchGame}>Lancer la partie</button>
        </div>
    );
}

export function WinnerModal({ gameEnd }) {
    const [winner, setWinner] = useState("");
    const modalRef = useRef();

    useEffect(() => {
        socket.on("victory",(data)=>{
            setWinner(data);
            const modal = document.getElementById("winnerWinnerChickenDinner");
            modalRef.current = modal;
            modal.showModal();
            setTimeout(() => {
                gameEnd();
            }, 10000);
        });
        return () => {
            socket.off("victory");
        }
    },[gameEnd]);
    return (
        <dialog id="winnerWinnerChickenDinner">
            <p>{winner}</p>
            <p id="secondline">a gagné</p>
        </dialog>
    );
}