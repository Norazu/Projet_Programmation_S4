import { Abandon, Sauvegarde, PlayerList, Timer, LaunchGame, WinnerModal } from "./Game.jsx";
import { useEffect, useState } from "react";
import { socket } from "./Socket.jsx";
import { toast } from "react-toastify";

let playerGameId = "";

function CarteSet({ carte, onSelect, isSelected }) {
    const formes = [];

    let etat = isSelected ? "selected" : "default";

    function selectCard() {
        onSelect(carte);
    }

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

function LignesCartesSet() {
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

    function isSelected(carte) {
        for (let item of selectedCards) {
            if (isEqual(item, carte)) {
                return true;
            }
        }
        return false
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
        setTimeout(() => { // Using setTimeout to ensure state update before signal emission
            if (selectedCards.length === 3) {
                socket.emit("set", selectedCards, sessionStorage.getItem("sessId"), playerGameId);
            }
        }, 0);
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
        socket.on("plateau", (plateau, gameId) => {
            playerGameId = gameId;
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
                    {ligne.map((carte) => (
                        <li>
                            <CarteSet key={index} carte={carte} onSelect={onSelect} isSelected={isSelected(carte)}/>
                        </li>
                    ))}
                </ul>
            ))}
        </div>
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
            <LignesCartesSet/>
        </div>
        <Timer/>
        <LaunchGame/>
        </>
    );
}

export default Set;