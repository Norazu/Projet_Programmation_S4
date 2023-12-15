import io from "socket.io-client";
import { useEffect, useState } from "react";
import { socket } from "./socket.js";

let elements = [
  { id: 1, nom: 'test1', accessible: 'oui' },
  { id: 2, nom: 'test2', accessible: 'oui' }
];

function ListeDesElements() {
  return (
    <ul>
      {elements.map((element, index) => (
        <li key={index}>
          <strong>Nom:</strong> {element.nom}, <strong>Accessible:</strong> {element.accessible}
        </li>
      ))}
    </ul>
  );
}

function Home() {
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [showGameList, setShowGameList] = useState(false);

  function joinGame() {
    var identifiant = document.getElementById("idGame").value;
    socket.emit("joinGame",2,identifiant);
  }

  function afficherCreationPartie() {
    setShowCreateGame(true);
  }

  function creationPartie() {
    socket.emit("creationPartie", 1,2,10,1);
  }

  function afficherListeParties() {
    setShowGameList(true);
  }

  return (
    <div className="Home">
      <button type="button" onClick={afficherCreationPartie}>Afficher le formulaire de création de partie</button>
      {showCreateGame && (
        <div>
          {/* Contenu de la page de création de partie */}
          <label htmlFor="choixTypeJeu">Vous voulez jouer à quel jeu? </label>
          <select id="choixTypeJeu">
            <option>Bataille ouverte</option>
          </select>
          <button type="button" onClick={creationPartie}>Créer la partie</button>
        </div>
      )}
      <input id="idGame" type="text" placeholder="Identifiant de la partie" />
      <button onClick={joinGame}>Rejoindre la partie</button>
      <button type="button" onClick={afficherListeParties}> Afficher la liste des parties</button>
      {showGameList && (
        <div>
          {/* Contenu de la liste des parties */}
          <p>Contenu de la liste des parties</p>
          <ListeDesElements />
        </div>
      )}
    </div>
  );
}

export default Home;