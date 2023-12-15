const express = require("express")
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { time } = require("console");
const mysql = require("mysql");
const jsSHA = require("jssha"); 

var connexiondb = mysql.createConnection({
  host : 'mysql.etu.umontpellier.fr',
  user : 'e20220003375',
  password : 'augustin',
  database : 'e20220003375'
});

connexiondb.connect(function(err) {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
  console.log('connected as id ' + connexiondb.threadId);
});

app.use(cors());

const server = http.createServer(app);

var playersList = [["player1",10]];
var cartes = {"001":["2_of_clubs","5_of_hearts","jack_of_spades"]};
var bataille = [];

function defCode(){
  code = Math.floor(Math.random() * 9999);
  while(code in listeParties)
    code=Math.floor(Math.random() * 9999);
  return code
}

class partie{
  constructor(typeJeu, idCreateur, nbMinJoueurs, nbMaxJoueurs, nbJoueurs) {
    this.typeJeu=typeJeu;
    this.idCreateur=idCreateur;
    this.nbMinJoueurs=nbMinJoueurs;
    this.nbMaxJoueurs=nbMaxJoueurs;
    this.nbJoueurs=nbJoueurs;
  }
} 

let listeParties={};

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials : 'true'
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);
  
  socket.on("connexion", (nom,mdp) => {
    const shaObj = new jsSHA("SHA-256", "TEXT", { encoding : "UTF8" });
    shaObj.update(mdp);
    const hashMDP = shaObj.getHash("HEX");
    connexiondb.query("SELECT idJoueur,pseudo FROM joueurs WHERE pseudo='" + nom + "' AND hashMDP='" + hashMDP + "'", function(err, result) {
      if (err) {
        console.error('error on query: ' + err.stack);
        return;
      }
      if (result.length == 0) {
        socket.emit("userNotRegistered");
      } else {
        console.log(`user connected ${nom}, ${hashMDP}`);
        socket.emit("connected");
      }
    });
  });

  socket.on("newAccount", (nom,mdp) =>{
    var exists = false;
    connexiondb.query("SELECT pseudo FROM joueurs", function(err, result) {
      if (err) {
        console.error('error on query: ' + err.stack);
        return;
      } else {
        for (var row of result) {
          if (nom === row.pseudo) {
            exists = true;
            socket.emit("userAlreadyRegistered");
          }
        }
      }
    });
    if (!exists){
      const shaObj = new jsSHA("SHA-256", "TEXT", { encoding : "UTF8" });
      shaObj.update(mdp);
      const hashMDP = shaObj.getHash("HEX");
      connexiondb.query("INSERT INTO joueurs (pseudo, hashMDP) VALUES ('"+ nom + "','" + hashMDP + "')", function(err, result) {
        if (err) {
          console.error('error on insertion: ' + err.stack);
          return;
        } else {
          console.log(`account created : ${nom}, ${hashMDP}`)
        }
      });
    }
  });
  
  socket.on('creationPartie', (type,nbMinJoueurs,nbMaxJoueurs,idCreateur)=>{
    codepartie=defCode();
    listeParties[codepartie]=new partie(type,idCreateur,nbMinJoueurs,nbMaxJoueurs,1);
    console.log("partie " + codepartie + " créée");
    socket.emit('goToGame', codepartie);
    socket.join(codepartie.toString());
  });

  socket.on("joinGame", (idJoueur, idRoom)=>{
    var idRoomInt = parseInt(idRoom);
    if (idRoomInt in listeParties){
      if(listeParties[idRoomInt].nbJoueurs == listeParties[idRoomInt].nbMaxJoueurs){
        socket.emit("roomComplete");
      } else {
        listeParties[idRoomInt].nbJoueurs += 1;
        socket.join(idRoom);
      }
      socket.emit('goToGame', idRoomInt);
    } else {
      socket.emit("roomDontExist");
    }
  });

  socket.on('mess',data => {
    console.log(data + " : data envoyée à "+socket.id)
    io.emit('messagerie',data); 
  });

  socket.on("getPlayers", () => {
    socket.emit("playersList",playersList);
  });

  socket.on("getCards",playerId => {
    socket.emit("cardsList",cartes[playerId]);
  });

  function timer(timeLeft) {
    io.emit("timeLeft", timeLeft - 1);
    return timeLeft - 1;
  }

  function startTimer(duration) {
    const timerId = setInterval(() => {
      duration = timer(duration);

      if (duration <= 0) {
        clearInterval(timerId);
        io.emit("choosingEnd");
      }
    }, 1000);
  }

  socket.on("startTimer", () => {
    startTimer(2);
  });

  socket.on("submitCard", (playerId, card) => {
    bataille.push([playerId,card]);
    if(playersList.length == bataille.length){
      pickWinner();
    }
  });

  function pickWinner(){
    winner = bataille[0][0];
    winnerCardValue = 1;
    bataille.forEach(player => {
      card = player[1].split("_")[0];
      cardValue = 1;
      switch (card) {
        case 'jack':
          cardValue = 11;
          break;
        case 'queen':
          cardValue = 12;
        case 'king':
          cardValue = 13;
          break;
        case 'ace':
          cardValue = 14;
        default:
          cardValue = parseInt(card);
      }
      if(winnerCardValue<cardValue){
        winnerCardValue = cardValue;
        winner = player[0];
      }
    });
    console.log(winner);
    bataille = [];
  }
});

server.listen(3001, () => {
  console.log("SERVER IS RUNNING");
});