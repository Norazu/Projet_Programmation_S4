import { useEffect, useState } from "react";
import { socket } from "./socket.js";

function joinGame() {
  var identifiant = document.getElementById("idGame").value;
  socket.emit("joinGame",localStorage.getItem("sessId"),identifiant);
}

function joinGameByList(identifiant){
  //console.log(typeof(identifiant));
  //console.log(identifiant);
  socket.emit("joinGame",localStorage.getItem("sessId"),identifiant);
}

function Parties({code}){
  return(
      <div className="Parties">
          <p>Code de la partie: {code}</p>
          <button onClick={()=>joinGameByList(code)}>Rejoindre la partie</button>
      </div>
  );
}

function ListeDesElements() {
  const [parties, setParties] = useState([]);

  useEffect(() => {
    socket.emit("recuperationListeParties", 1);

    socket.on('listeDesParties', liste => {
      setParties(liste);
    });
    return () => {
      socket.off("listeDesParties");
      };
  }, []);
    return (
      <div className="playerList">
          {parties.map((partie) => (
              <Parties code={partie[0]}/>
          ))}
      </div>
  );
}

function Home() {
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [showGameList, setShowGameList] = useState(false);

  function joinGame() {
    var identifiant = document.getElementById("idGame").value;
    socket.emit("joinGame",localStorage.getItem("sessId"),identifiant);
  }

  function afficherCreationPartie() {
    setShowCreateGame(true);
  }

  function creationPartie() {
    socket.emit("creationPartie",1,2,10,localStorage.getItem("sessId"));
  }

  function afficherListeParties() {
    setShowGameList(true);
  }
  function roomComplete(){
    window.alert("La partie a atteint son nombre maximum de joueurs");
  }
  function roomDontExist(){
    window.alert("La partie n'existe pas");
  }
  function gameRunning(){
    window.alert("La partie est déjà lancée");
  }
  useEffect(()=>{
    socket.on("roomComplete",roomComplete);
    socket.on("roomDontExist", roomDontExist);
    socket.on("gameRunning", gameRunning);
    return ()=>{
      socket.off("roomComplete");
      socket.off("roomDontExist");
      socket.off("gameRunning");
    }


  });

  function deconnexion() {
    socket.emit("goodbye", localStorage.getItem("sessId"));
  }

  return (
    <div className="Home">
      <button id="deco" onClick={deconnexion}>Se déconnecter</button>
      <div className="Container1">
        <button type="button" onClick={afficherCreationPartie}>Afficher le formulaire de création de partie</button>
        {showCreateGame && (
          <div>
            {/* Contenu de la page de création de partie */}
            <label htmlFor="choixTypeJeu">A quel jeu voulez-vous jouer ? </label>
            <select id="choixTypeJeu">
              <option>Bataille ouverte</option>
            </select>
            <button type="button" onClick={creationPartie}>Créer la partie</button>
          </div>
        )}
        <input id="idGame" type="text" placeholder="Identifiant de la partie" />
        <button onClick={joinGame}>Rejoindre la partie</button>
      </div>
      <div className="Container1">
        {!showGameList && (
        <button type="button" onClick={afficherListeParties}> Afficher la liste des parties</button>
        )}
        {showGameList && (
          <div className="Container1">
            {/* Contenu de la liste des parties */}
            <p>Parties disponibles</p>
            <ListeDesElements />
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;