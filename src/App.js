import "./App.css";
import Game from './Game';
import Chat from './Chat';

import { useEffect, useState } from "react";
import { socket } from "./socket.js";


function App() {
  const [connected, setConnected] = useState(false);
  
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
  }
  useEffect(() => {
    socket.on("userNotRegistered", notRegistered);
    socket.on("userAlreadyRegistered", alreadyRegistered);      
    socket.on("connected", onConnect);
    return () => {
      socket.off("userNotRegistered");
      socket.off("userAlreadyRegistered");
      socket.off("connected");
    }
  });
  return (
    <div className="App">
      {connected ? (
        <div>
          <Game />
          <Chat />
        </div>
      ) : (
        <div>
          <input id="name" type="text" placeholder="Nom"/>
          <input id="password" type="password"placeholder="mot de passe"/>
          <button onClick={connect}>Connexion</button>
          <button onClick={createAccount}>créer un compte</button>
        </div>
      )}
    </div>
  );
}

export default App;