import "./Style/app.css";
import "./Style/boeuf.css";
import "./Style/score.css";
import 'react-toastify/dist/ReactToastify.css';
import Bataille from './Bataille.js';
import Boeuf from './Boeuf.js';
import Chat from './Chat.js';
import Home from './Home.js';

import { useEffect, useState } from "react";
import { socket } from "./socket.js";
import { ToastContainer, toast } from "react-toastify";

function App() {
  console.log(sessionStorage.getItem("sessId"));

  const [connected, setConnected] = useState(false);
  const[inGame, setInGame] = useState(false);
  const[gameId,setGameId] = useState("0000");
  const[gameType,setGameType] = useState(null);

  function connect(){
    var nom = document.getElementById("name").value;
    var mdp = document.getElementById("password").value;
    socket.emit("connexion",nom,mdp);
  }

  function alreadyConnected() {
    toast.warn("Vous êtes déjà connecté sur ce compte");
    resetFields();
  }

  function createAccount() {
    var nom = document.getElementById("name").value; 
    var mdp = document.getElementById("password").value;
    socket.emit("newAccount",nom,mdp);
  }

  function notRegistered() {
    toast.error("Nom d'utilisateur ou mot de passe incorrect ou compte inexistant");
    resetFields();
  }

  function alreadyRegistered() {
    toast.warn("Vous avez déjà un compte, veuillez vous connecter");
    resetFields();
  }

  function accountCreated() {
    toast.success("Compte créé avec succès, veuillez vous connecter");
    resetFields();
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

  function backFromGame() {
    toast.info("Vous avez été ramené au menu principal");
    setInGame(false);
    setGameType(null);
    setGameId("0000");
  }

  function setTypeJeu(type) {
    setGameType(type);
  }

  function resetFields() {
    document.getElementById("name").value = "";
    document.getElementById("password").value = "";
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
    socket.on("goToGame",(idRoom, typeJeu, acknowledgeCallback) => {
      setInGame(true);
      setGameType(typeJeu);
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
  });

  function parallax(e){
    let elem = document.querySelector(".parallax");
    let _w = window.innerWidth/2;
    let _h = window.innerHeight/2;
    let _mouseX = e.clientX;
    let _mouseY = e.clientY;
    let _depth1 = `${50 - (_mouseX - _w) * 0.02}% ${50 - (_mouseY - _h) * 0.02}%`;
    let _depth2 = `${50 - (_mouseX - _w) * 0.01}% ${50 - (_mouseY - _h) * 0.01}%`;
    let _depth3 = `50% 50%`;
    let x = `${_depth3}, ${_depth2}, ${_depth1}`;
    elem.style.backgroundPosition = x;
  }

  return (
    <div className="App">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        limit={5}
        />
      {connected ? (
        inGame ? (
          <div className="PartiePage">
            <div className="GamePage">
              <h2 id="codeGame">Code de la partie : {gameId}</h2>
              {gameType === "1" ? (<Bataille gameEnd={backFromGame}/>) :(<Boeuf gameEnd={backFromGame}/>)}
            </div>
            <Chat/>
          </div>
        ) : (
          <Home gameType={setTypeJeu}/>
        )
      ) : (
        <div className="ConnectionPage">
          <div className="parallax" onMouseMove={parallax}>
            <div className="ConnectionCard">
                <input className="connectionField" id="name" type="text" placeholder="Nom"/>
                <input className="connectionField" id="password" type="password" placeholder="mot de passe"/>
                <div className="connectionButtons">
                  <button className="connectionbutton" id="loginbtn" onClick={connect}>Connexion</button>
                  <button className="connectionbutton" id="signinbtn" onClick={createAccount}>Inscription</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;