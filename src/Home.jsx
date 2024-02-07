import Score from "./Score.jsx";
import { useEffect, useState } from "react";
import { socket } from "./Socket.jsx";
import { toast } from "react-toastify";

function joinGameByList(identifiant){
  socket.emit("joinGame",sessionStorage.getItem("sessId"),identifiant);
}

function loadGameByList(code) {
  socket.emit("loadGame", code);
}

function Partie({code, page, type}){
  let type_jeu = "";
  let chemin_img = "";
  switch (String(type)){
    case "1":
      type_jeu = "Bataille ouverte";
      chemin_img = "./Bataille/cardBack.png";
      break;
    case "2":
      type_jeu = "6 qui prend";
      chemin_img = "./Boeuf/boeuf.svg";
      break;
    case "3":
      type_jeu = "Set";
      chemin_img = "./Set/vague.svg";
      break;
    default:
      type_jeu = "Erreur";
      break;
  }
  return(
    <div className="Partie" onClick={page ? () => loadGameByList(code) : () => joinGameByList(code)}>
      <p className="partieText">Partie n°{code}</p>
      <div className="Type">
        <p className="PartieText">{type_jeu} </p>
        <img className="boeuf" src={chemin_img} alt={"Logo " + type_jeu}/>
      </div >
    </div>
  );
}

function ListeDesParties({ hide, retour }) {
  const [parties, setParties] = useState([]);
  const [showGameList, setShowGameList] = useState(false);

  function getListeParties() {
    socket.emit("recuperationListeParties", document.getElementById("choixTypeJeuRecherche").value);
  }

  function afficherListeParties(state) {
    setShowGameList(!showGameList);
    state ? hide() : retour();
  }

  useEffect(() => {
    socket.on('listeDesParties', liste => {
      setParties(liste);
      afficherListeParties(true);
    });
    return () => {
      socket.off("listeDesParties");
      };
  });
  return (
    <>
    {showGameList ? (
      <>
      <div className="retour" onClick={() => afficherListeParties(false)}>
          <span className="back"></span>
          <a href="/#">Retour</a>
          <span></span>
      </div>
      <div className="Container2">
        <p>Parties disponibles</p>
        <div className="gamesList">
          {parties.map((partie, index) => (
            <Partie key={index} code={partie[0]} type={partie[1]}/>
            ))}
        </div>
      </div>
      </>
    ) : (
      <div className="Container2">
        <label htmlFor="choixTypeJeuRecherche">A quel jeu voulez-vous jouer ? </label>
        <select id="choixTypeJeuRecherche">
          <option value="0">Tout types</option>
          <option value="1">Bataille ouverte</option>
          <option value="2">6 qui prend</option>
          <option value="3">Set</option>
        </select>
        <button onClick={getListeParties}>Afficher la liste des parties</button>
      </div>
    )}
    </>
  );
}

function PartiesSauvegardees({ hide, retour }) {
  const [savedGames, setSavedGames] = useState([]);
  const [showSavedGames, setShowSavedGames] = useState(false);

  function loadGame() {
    let code = document.getElementById("loadGame").value;
    socket.emit("loadGame", code);
  }

  function afficherPartiesSauvegardees(state) {
    setShowSavedGames(!showSavedGames);
    state ? hide() : retour();
  }

  function getSavedGames() {
    socket.emit("getSavedGames");
  }
  
  useEffect(() => {
    socket.on("returnSavedGames", liste => {
      setSavedGames(liste);
      afficherPartiesSauvegardees(true);
    });
    return () => {
      socket.off("returnSavedGames");
    };
  });
  return (
    <>
    {showSavedGames ? (
      <>
      <div className="retour" onClick={() => afficherPartiesSauvegardees(false)}>
          <span className="back"></span>
          <a href="/#">Retour</a>
          <span></span>
      </div>
      <div className="Container1">
        <input id="loadGame" type="text" placeholder="Code de la partie sauvegardée" />
        <button type="button" onClick={loadGame}>Charger la partie</button>
      </div>
      <div className="Container1">
        <div className="gamesList">
          {savedGames.map((partie) => (
            <Partie key={partie[0]} code={partie[0]} page={showSavedGames} type={partie[1]}/>
          ))}
        </div>
      </div>
      </>
    ) : (
      <div className="Container1" style={{ alignSelf: "var(--align-container1)" }}>
        <button type="button" onClick={getSavedGames}>Charger une partie sauvegardée</button>
      </div>
    )}
    </>
  );
}

function CreationPartie({ gameType, hide, retour }) {
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [maxJoueurs, setMaxJoueurs] = useState(10);
  const [minJoueurs, setMinJoueurs] = useState(2);
  const [timerValue, setTimerValue] = useState(10);

  function afficherCreationPartie(state) {
    setShowCreateGame(!showCreateGame);
    state ? hide() : retour();
  }

  function creationPartie() {
    let typeJeu = document.getElementById("choixTypeJeu").value;
    gameType(typeJeu);
    socket.emit("creationPartie", typeJeu, minJoueurs, maxJoueurs, timerValue, sessionStorage.getItem("sessId"));
  }

  return (
    <>
    {showCreateGame ? (
      <>
      <div className="retour" onClick={() => afficherCreationPartie(false)}>
          <span className="back"></span>
          <a href="/#">Retour</a>
          <span></span>
      </div>
      <div className="Container1" id="gameCreatingForm" style={{ alignSelf: "var(--align-container1)" }}>
        {/* Contenu de la page de création de partie */}
        <label htmlFor="choixTypeJeu">A quel jeu voulez-vous jouer ? </label>
        <select id="choixTypeJeu">
          <option value="1">Bataille ouverte</option>
          <option value="2">6 qui prend</option>
          <option value="3">Set</option>
        </select>
        <br/>
        <label htmlFor="nbJoueursMin">Combien de joueurs minimum voulez-vous ? </label>
        <input id="nbJoueursMin" onChange={() => setMinJoueurs(document.getElementById("nbJoueursMin").value)} type="number" min="2" max="10" defaultValue={minJoueurs}/>
        <br/>
        <label htmlFor="nbJoueursMax">Combien de joueurs maximum voulez-vous ? </label>
        <input id="nbJoueursMax" onChange={() => setMaxJoueurs(document.getElementById("nbJoueursMax").value)} type="number" min={minJoueurs} max="10" defaultValue={maxJoueurs}/>
        <br/>
        <label htmlFor="timerDuration">Combien de secondes par tour ?</label>
        <input id="timerDuration" onChange={() => setTimerValue(document.getElementById("timerDuration").value)} type="number" min="3" max="100" defaultValue={timerValue}/>
        <button type="button" onClick={creationPartie}>Créer la partie</button>
      </div>
      </>
    ) : (
      <div className="Container1" style={{ alignSelf: "var(--align-container1)" }}>
        <button type="button" onClick={() => afficherCreationPartie(true)}>Créer une partie</button>
      </div>
    )}
    </>
  );
}

function RejoindrePartie() {

  function joinGame() {
    let identifiant = document.getElementById("idGame").value;
    socket.emit("joinGame",sessionStorage.getItem("sessId"),identifiant);
  }

  return (
    <>
    <input id="idGame" type="text" placeholder="Identifiant de la partie" />
    <button onClick={joinGame}>Rejoindre la partie</button>
    </>
  );
}

function Home({ gameType }) {

  const [savedGamesButton, setSavedGamesButton] = useState(true);
  const [scoreButton, setScoreButton] = useState(true);
  const [createGameButton, setCreateGameButton] = useState(true);
  const [joinGameButton, setJoinGameButton] = useState(true);
  const [gamesListButton, setGamesListButton] = useState(true);

  function hide(excludedButton) {
    setSavedGamesButton(excludedButton === "savedGames");
    setScoreButton(excludedButton === "score");
    setCreateGameButton(excludedButton === "createGame");
    setJoinGameButton(excludedButton === "joinGame");
    setGamesListButton(excludedButton === "gamesList");
    document.documentElement.style.setProperty("--align-container1", "center");
    document.documentElement.style.setProperty("--align-container2", "center");
  }

  function handleRetour() {
    setSavedGamesButton(true);
    setScoreButton(true);
    setCreateGameButton(true);
    setJoinGameButton(true);
    setGamesListButton(true);
    document.documentElement.style.setProperty("--align-container1", "flex-end");
    document.documentElement.style.setProperty("--align-container2", "flex-start");
  }

  function roomComplete(){
    toast.error("La partie a atteint son nombre maximum de joueurs");
  }

  function roomDontExist(){
    toast.error("La partie n'existe pas");
  }

  function gameRunning(){
    toast.error("La partie est déjà lancée");
  }
  function maxGames(){
    toast.error("Vous avez atteint le nombre maximum de parties en cours");
  }
  function unvalidArguments(){
    toast.error("Vous avez fourni un argument qui n'est pas valide");
  }

  useEffect(()=>{
    socket.on("roomComplete",roomComplete);
    socket.on("roomDontExist", roomDontExist);
    socket.on("gameRunning", gameRunning);
    socket.on("maxGames", maxGames);
    socket.on("unvalidArguments", unvalidArguments);
    // Set initial alignment when component mounts
    document.documentElement.style.setProperty("--align-container1", "flex-end");
    document.documentElement.style.setProperty("--align-container2", "flex-start");
    return ()=>{
      socket.off("roomComplete");
      socket.off("roomDontExist");
      socket.off("gameRunning");
      socket.off("maxGames");
      socket.off("unvalidArguments");
    }
  }, []);

  function deconnexion() {
    socket.emit("goodbye", sessionStorage.getItem("sessId"));
  }

  return (
    <div className="Home">
      <div className="deco" onClick={deconnexion}>
        <span className="exit"></span>
        <a href="/#">Déconnexion</a>
        <span></span>
      </div>
      {scoreButton && (
        <Score hide={() => hide("score")} retour={handleRetour}/>
      )}
      {(savedGamesButton || createGameButton || joinGameButton) && (
      <div className="ContainerParent">
        {savedGamesButton && (
          <PartiesSauvegardees hide={() => hide("savedGames")} retour={handleRetour}/>
        )}
        {createGameButton && (
          <CreationPartie gameType={gameType} hide={() => hide("createGame")} retour={handleRetour}/>
        )}
        <div className="Container1" style={{ alignSelf: "var(--align-container1)" }}>
          {joinGameButton && (
            <RejoindrePartie/>
          )}
        </div>
      </div>
      )}
      {gamesListButton && (
      <div className="ContainerParent">
        <ListeDesParties hide={() => hide("gamesList")} retour={handleRetour}/>
      </div>
      )}
    </div>
  );
}

export default Home;