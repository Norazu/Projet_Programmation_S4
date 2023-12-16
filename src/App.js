import "./App.css";
import Game from './Game';
import Chat from './Chat';
import Home from './Home';

import { useEffect, useState } from "react";
import { socket } from "./socket.js";

function App() {
  console.log(localStorage.getItem("sessId"));
  const [connected, setConnected] = useState(false);
  const[inGame, setInGame] = useState(false);
  const[gameId,setGameId] = useState("0000")

  function connect(){
    var nom = document.getElementById("name").value;
    var mdp = document.getElementById("password").value;
    socket.emit("connexion",nom,mdp);
  }
  function createAccount(){
    var nom = document.getElementById("name").value; 
    var mdp = document.getElementById("password").value;
    socket.emit("newAccount",nom,mdp);
  }
  function notRegistered(){
    window.alert("Nom d'utilisateur ou mot de passe incorrect ou compte inexistant");
  }
  function alreadyRegistered(){
    window.alert("Vous avez déjà un compte, veuillez vous connecter");
  }
  function onConnect(){
    setConnected(true);
    if (localStorage.getItem("sessId") == null) {
      localStorage.setItem("sessId",document.getElementById("name").value);
      console.log(localStorage.getItem("sessId"));
      socket.emit("hello", localStorage.getItem("sessId"));
    }
  }
  function onDisconnect(){
    setConnected(false);
    localStorage.clear();
  }
  function goToGame(){
    setInGame(true);
  }

  useEffect(() => {
    if (localStorage.getItem("sessId") != null){
      socket.on("connect", () => {
        socket.emit("hello", localStorage.getItem("sessId"))
      });
    }
    socket.on("userNotRegistered", notRegistered);
    socket.on("userAlreadyRegistered", alreadyRegistered);      
    socket.on("connected", onConnect);
    socket.on("goToGame",(idRoom)=>{
      goToGame();
      setGameId(idRoom);
    });
    socket.on("disconnected", onDisconnect);
    return () => {
      socket.off("connect");
      socket.off("userNotRegistered");
      socket.off("userAlreadyRegistered");
      socket.off("connected");
      socket.off("disconnected");
      socket.off("goToGame");
    }
  });
  return (
    <div className="App">
      {connected ? (
        inGame ? (
        <div>
          <h2>Code de la partie {gameId}</h2>
          <Game/>
          <Chat/>
        </div>

        ) : (
          <Home/>
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