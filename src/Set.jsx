import { Abandon, Sauvegarde, PlayerList, LaunchGame, WinnerModal } from "./Game.jsx";
import { useEffect, useState } from "react";
import { socket } from "./Socket.jsx";
import { toast } from "react-toastify";

function CarteSet({ carte, onSelect }) {
    const formes = [];
    const [etat, setEtat] = useState("default");

    function selectCard() {
        setEtat(etat === "default" ? "selected" : "default");
        onSelect(carte);
    }

    useEffect(() => {
        socket.on("unselectAll", () => {
            setEtat("default");
        });
        return () => {
            socket.off("unselectAll");
        }
    });

    for (let i = 0; i < carte.nombre; i++) {
        formes.push(
            <div key={i} className="formeContainer">
                <div className="forme" couleur={carte.couleur} forme={carte.forme} remplissage={carte.remplissage}></div>
            </div>
        );
    }
    return (
        <button className="carteSet" onClick={selectCard} data-etat={etat}>
            {formes}
            <div className="overlay"></div>
        </button>
    );
}

function LignesCartesSet({ gameId }) {
    const [cartes, setCartes] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]);

    function isEqual(carte1, carte2) {
        for (const key in carte1) {
            if (carte1[key] !== carte2[key]) {
                return false;
            }
        }
        return true;
    }

    function onSelect(carte) {
        setSelectedCards(prevSelectedCards => {
            let addCard = true;
            for (let i = 0; i < prevSelectedCards.length; i++) {
                if (isEqual(prevSelectedCards[i], carte)) {
                    prevSelectedCards.splice(i, 1);
                    addCard = false;
                }
            }
            if (addCard) {
                return [...prevSelectedCards, carte];
            } else {
                return [...prevSelectedCards];
            }
        });
    }

    function parsePlateau(plateau) {
        let nouvellesCartes;
        if (plateau.length === 12) {
            nouvellesCartes = [
                plateau.slice(0, 4),
                plateau.slice(4, 8),
                plateau.slice(8, 12)
            ];
        } else {
            nouvellesCartes = [
                plateau.slice(0, 5),
                plateau.slice(5, 10),
                plateau.slice(10, 15)
            ];
        }
        setCartes(nouvellesCartes);
    }

    useEffect(() => {
        socket.on("plateau", plateau => {
            parsePlateau(plateau);
        });
        socket.on("notFoundSet", () => {
            toast.error("Ce n'est pas un SET, vous perdez trois points");
            setSelectedCards([]);
        });
        socket.on("foundSet", () => {
            toast.success("Bravo !!, +3 points");
            setSelectedCards([]);
        });
        if (selectedCards.length === 3) {
            socket.emit("set", selectedCards, sessionStorage.getItem("sessId"), gameId);
        }
        return () => {
            socket.off("plateau");
            socket.off("notFoundSet");
            socket.off("foundSet");
        };
    });

    return(
        <div className="LignesCartes">
            {cartes.map((ligne, index) => (
                <ul className="LigneCartes" id={index} key={index}>
                    {ligne.map((carte, index) => (
                        <li>
                            <CarteSet key={index} carte={carte} onSelect={onSelect}/>
                        </li>
                    ))}
                </ul>
            ))}
        </div>
    );
}

function Indice({ gameId }) {
    const [indice, setIndice] = useState(false);
    const [ligne, setLigne] = useState([]);

    function getIndice() {
        socket.emit("getIndice", gameId);
    }

    useEffect(() => {
        socket.on("indice", (set) => {
            setLigne(set);
            setIndice(true);
            setTimeout(() => {
                setIndice(false);
            }, 5000);
        })
        return () => {
            socket.off("indice");
        }
    });

    return (
        <>
        {indice ? (
            <ul className="LigneCartes">
                {ligne.map((carte, index) => (
                    <li>
                        <CarteSet key={index} carte={carte}/>
                    </li>
                ))}
            </ul>
        ) : (
            <button onClick={getIndice}>Indice</button>
        )}
        </>
    );
}

function Set({ gameEnd }) {
    const [gameId, setGameId] = useState("");

    useEffect(() => {
        socket.on("setGameId", idRoom => {
            setGameId(idRoom);
        });
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
        <Abandon playerGameId={gameId} gameEnd={gameEnd}/>
        <Sauvegarde playerGameId={gameId} gameEnd={gameEnd}/>
        <div className="plateau">
            <PlayerList showCards={false}/>
            <LignesCartesSet gameId={gameId}/>
            <Indice gameId={gameId}/>
        </div>
        <LaunchGame playerGameId={gameId}/>
        </>
    );
}

export default Set;