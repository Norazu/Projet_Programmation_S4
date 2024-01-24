import { useEffect, useState } from "react";
import { socket } from "./socket.js";
var type;

function joinGameByList(identifiant){
  //console.log(typeof(identifiant));
  //console.log(identifiant);
  socket.emit("joinGame",sessionStorage.getItem("sessId"),identifiant);
}

function loadGameByList(code) {
  socket.emit("loadGame", code);
}

function Parties({code, page,type}){
  let type_jeu = "";
  let chemin_img = "";
  switch (type){
  case "1":
    type_jeu = "Bataille ouverte";
    chemin_img = "./Bataille/cardBack.png";
    break;
  case "2":
    type_jeu = "6 qui prend";
    chemin_img = "./Boeuf/boeuf.svg";
    break;
  default:
    type_jeu = "Erreur";
    break;
  }
  return(
    <div className="Parties">
      <p className="partieText">Code de la partie :{code}</p>
      <div className="Type">
        <p className="partieText"> Type de jeu : {type_jeu} </p>
        <img className="boeuf" src={chemin_img} alt={"Logo " + type_jeu} style={{width : 50+"px"}}/>
      </div >
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
    socket.emit("recuperationListeParties", type);

    socket.on('listeDesParties', liste => {
      setParties(liste);
    });
    return () => {
      socket.off("listeDesParties");
      };
  }, []);
    return (
      <div className="playerList">
          {parties.map((partie, index) => (
              <Parties key={index} code={partie[0]} type={partie[1]}/>
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

function Home({ gameType }) {
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [showGameList, setShowGameList] = useState(false);
  const [savedGames, setSavedGames] = useState(false);

  function joinGame() {
    var identifiant = document.getElementById("idGame").value;
    socket.emit("joinGame",sessionStorage.getItem("sessId"),identifiant);
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

  function creationPartie(typeJeu) {
    gameType(typeJeu);
    socket.emit("creationPartie",typeJeu,2,10,sessionStorage.getItem("sessId"));
  }

  function afficherListeParties(typeJeu) {
    type=typeJeu;
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
    socket.emit("goodbye", sessionStorage.getItem("sessId"));
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
                  <option value="1">Bataille ouverte</option>
                  <option value="2">6 qui prend</option>
                </select>
                <button type="button" onClick={() => creationPartie(document.getElementById("choixTypeJeu").value)}>Créer la partie</button>
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
              <div>
                <button type="button" onClick={() => afficherListeParties(document.getElementById("choixTypeJeuRecherche").value)}>Afficher la liste des parties</button>

                <label htmlFor="choixTypeJeuRecherche">A quel jeu voulez-vous jouer ? </label>
                <select id="choixTypeJeuRecherche">
                  <option value="0">Tout types</option>
                  <option value="1">Bataille ouverte</option>
                  <option value="2">6 qui prend</option>
                </select>
              </div>
              )}
          </div>
          </>
        )}
    </div>
  );
}

export default Home;