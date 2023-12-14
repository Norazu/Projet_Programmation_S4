import "./App.css";

import { useEffect, useState } from "react";
import { socket } from "./socket.js";


function App() {
  function connect(){
    var nom = document.getElementById("name").value;
    var mdp = document.getElementById("password").value;
    alert("votre nom est " + nom + "votre mdp est " + mdp)
    socket.emit("connexion",{nom},{mdp});
  }
  function createAccount(){
    var nom = document.getElementById("name").value;
    var mdp = document.getElementById("password").value;
    socket.emit("newAccount",{nom},{mdp});
  }
  return (
    <div className="App">
      <input id="name" type="text" placeholder="Nom"/>
      <input id="password" type="password"placeholder="mot de passe"/>
      <button onClick={connect}>Connexion</button>
      <button onClick={createAccount}>créer un compte</button>
    </div>
  );
}

export default App;