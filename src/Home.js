import { useEffect, useState } from "react";
import { socket } from "./socket.js";

function joinGameByList(identifiant){
  //console.log(typeof(identifiant));
  //console.log(identifiant);
  socket.emit("joinGame",localStorage.getItem("sessId"),identifiant);
}

function loadGameByList(code) {
  socket.emit("loadGame", code);
}

function Parties({code, page}){
  return(
    <div className="Parties">
      <p>Code de la partie : {code}</p>
      {page ? (
        <>
        <button onClick={() => loadGameByList(code)}>Charger la partie</button>
        </>
      ) : (
        <>
        <button onClick={() => joinGameByList(code)}>Rejoindre la partie</button>
        </>
      )}
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

function PartiesSauvegardees() {
  const [savedGames, setSavedGames] = useState([]);
  const [savePage, setSavePage] = useState(false);

  useEffect(() => {
    socket.emit("getSavedGames");

    socket.on("returnSavedGames", liste => {
      setSavedGames(liste);
      setSavePage(true);
    });
    return () => {
      socket.off("returnSavedGames");
    };
  }, []);
  return (
    <div className="playerList">
      {savePage && savedGames.map((partie) => (
          <Parties code={partie[0]} page={savePage}/>
      ))}
    </div>
  );
}

function Home() {
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [showGameList, setShowGameList] = useState(false);
  const [savedGames, setSavedGames] = useState(false);

  function joinGame() {
    var identifiant = document.getElementById("idGame").value;
    socket.emit("joinGame",localStorage.getItem("sessId"),identifiant);
  }

  function loadGame() {
    var code = document.getElementById("loadGame").value;
    socket.emit("loadGame", code);
  }

  function toSavedGames() {
    setSavedGames(true);
  }

  function afficherCreationPartie() {
    setShowCreateGame(!showCreateGame);
  }

  function creationPartie() {
    socket.emit("creationPartie",1,2,10,localStorage.getItem("sessId"));
  }

  function afficherListeParties() {
    setShowGameList(!showGameList);
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
        {savedGames ? (
          <>
          <div className="Container1">
            <input id="loadGame" type="text" placeholder="Code de la partie sauvegardée" />
            <button type="button" onClick={loadGame}>Charger la partie</button>
          </div>
          <div className="Container1">
            <PartiesSauvegardees />
          </div>
          <button type="button" onClick={() => setSavedGames(false)}>Retour</button>
          </>
        ) : (
          <>
          <div className="Container1">
            <button type="button" onClick={toSavedGames}>Charger une partie sauvegardée</button>
            {showCreateGame ? (
              <>
              <button type="button" onClick={afficherCreationPartie}>Masquer le menu de création de partie</button>
              <div>
                {/* Contenu de la page de création de partie */}
                <label htmlFor="choixTypeJeu">A quel jeu voulez-vous jouer ? </label>
                <select id="choixTypeJeu">
                  <option>Bataille ouverte</option>
                </select>
                <button type="button" onClick={creationPartie}>Créer la partie</button>
              </div>
              </>
            ) : (
              <button type="button" onClick={afficherCreationPartie}>Créer une partie</button>
            )}
            <input id="idGame" type="text" placeholder="Identifiant de la partie" />
            <button onClick={joinGame}>Rejoindre la partie</button>
          </div>
          <div className="Container1">
            {showGameList ? (
              <div className="Container1">
                <button type="button" onClick={afficherListeParties}>Masquer la liste des parties</button>
                {/* Contenu de la liste des parties */}
                <p>Parties disponibles</p>
                <ListeDesElements />
              </div>
            ) : (
              <button type="button" onClick={afficherListeParties}>Afficher la liste des parties</button>
            )}
          </div>
          </>
        )}
    </div>
  );
}

export default Home;