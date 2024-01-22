import "./App.css";
import "./GameBoeuf.css";
import Game from './Game.js';
import GameBoeuf from './GameBoeuf.js';
import Chat from './Chat.js';
import Home from './Home.js';

import { useEffect, useState } from "react";
import { socket } from "./socket.js";

function App() {
  console.log(sessionStorage.getItem("sessId"));
  const [connected, setConnected] = useState(false);
  const[inGame, setInGame] = useState(false);
  const[gameId,setGameId] = useState("0000");
  const[gameType,setGameType] = useState(null);
  let gamepage;

  function connect(){
    var nom = document.getElementById("name").value;
    var mdp = document.getElementById("password").value;
    socket.emit("connexion",nom,mdp);
  }

  function alreadyConnected() {
    window.alert("Vous êtes déjà connecté sur ce compte");
  }

  function createAccount() {
    var nom = document.getElementById("name").value; 
    var mdp = document.getElementById("password").value;
    socket.emit("newAccount",nom,mdp);
  }

  function notRegistered() {
    window.alert("Nom d'utilisateur ou mot de passe incorrect ou compte inexistant");
  }

  function alreadyRegistered() {
    window.alert("Vous avez déjà un compte, veuillez vous connecter");
  }

  function accountCreated() {
    window.alert("Compte créé avec succès, veuillez vous connecter");
  }

  function onConnect() {
    setConnected(true);
    if (sessionStorage.getItem("sessId") == null) {
      sessionStorage.setItem("sessId",document.getElementById("name").value);
      console.log(sessionStorage.getItem("sessId"));
      socket.emit("hello", sessionStorage.getItem("sessId"));
    }
  }

  function onDisconnect() {
    setConnected(false);
    sessionStorage.clear();
  }

  function goToGame() {
    setInGame(true);
  }

  function backFromGame() {
    setInGame(false);
  }

  function setTypeJeu(type) {
    setGameType(type);
  }

  useEffect(() => {
    if (sessionStorage.getItem("sessId") != null){
      socket.on("connect", () => {
        socket.emit("hello", sessionStorage.getItem("sessId"))
      });
      socket.on("reconnect", () => {
        socket.emit("hello", sessionStorage.getItem("sessId"));
      });
    }
    socket.on("userAlreadyConnected", alreadyConnected);
    socket.on("userNotRegistered", notRegistered);
    socket.on("userAlreadyRegistered", alreadyRegistered);
    socket.on("accountCreated", accountCreated);
    socket.on("connected", onConnect);
    socket.on("goToGame",(idRoom, acknowledgeCallback) => {
      goToGame();
      setGameId(idRoom);
      acknowledgeCallback();
    });
    socket.on("disconnected", onDisconnect);
    return () => {
      socket.off("connect");
      socket.off("userAlreadyConnected");
      socket.off("userNotRegistered");
      socket.off("userAlreadyRegistered");
      socket.off("accountCreated");
      socket.off("connected");
      socket.off("disconnected");
      socket.off("goToGame");
    }
  }, [gameType]);

  return (
    <div className="App">
      {connected ? (
        inGame ? (
          <div className="PartiePage">
            <div className="GamePage">
              <h2 id="codeGame">Code de la partie : {gameId}</h2>
              {gameType == 1 ? (<Game gameEnd={backFromGame}/>) :(<GameBoeuf/>)}
            </div>
            <Chat/>
          </div>
        ) : (
          <Home gameType={setTypeJeu}/>
        )
      ) : (
        <div className="ConnectionPage">
          <div className="Container1">
            <h1>Connexion / Inscription</h1>
            <input id="name" type="text" placeholder="Nom"/>
            <input id="password" type="password"placeholder="mot de passe"/>
            <button onClick={connect}>Connexion</button>
            <button onClick={createAccount}>créer un compte</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;