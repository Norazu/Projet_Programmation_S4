const express = require("express")
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mysql = require("mysql");
const jsSHA = require("jssha");

var timerIsRunning = false;

var connexiondb = mysql.createConnection({
  host: 'mysql.etu.umontpellier.fr',
  user: 'e20220003375',
  password: 'augustin',
  database: 'e20220003375'
});

connexiondb.connect(function (err) {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
  console.log('connected as id ' + connexiondb.threadId);
});

app.use(cors());

const server = http.createServer(app);

var bataille = {};

function defCode() {
  var code = Math.floor(Math.random() * 9999);
  while (code in listeParties)
    code = Math.floor(Math.random() * 9999);
  return code
}

class partie {
  constructor(typeJeu, idCreateur, nbMinJoueurs, nbMaxJoueurs, nbJoueurs, listeJoueurs, timer, cartes) {
    this.typeJeu = typeJeu;
    this.idCreateur = idCreateur;
    this.nbMinJoueurs = nbMinJoueurs;
    this.nbMaxJoueurs = nbMaxJoueurs;
    this.nbJoueurs = nbJoueurs;
    this.listeJoueurs = listeJoueurs;
    this.timer = timer;
    this.cartes = cartes;

  }
}

let listeParties = {};

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: 'true'
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("connexion", (nom, mdp) => {
    const shaObj = new jsSHA("SHA-256", "TEXT", { encoding: "UTF8" });
    shaObj.update(mdp);
    const hashMDP = shaObj.getHash("HEX");
    connexiondb.query("SELECT pseudo FROM joueurs WHERE pseudo='" + nom + "' AND hashMDP='" + hashMDP + "'", function (err, result) {
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

  socket.on("newAccount", (nom, mdp) => {
    var exists = false;
    connexiondb.query("SELECT pseudo FROM joueurs", function (err, result) {
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
    if (!exists) {
      const shaObj = new jsSHA("SHA-256", "TEXT", { encoding: "UTF8" });
      shaObj.update(mdp);
      const hashMDP = shaObj.getHash("HEX");
      connexiondb.query("INSERT INTO joueurs (pseudo, hashMDP) VALUES ('" + nom + "','" + hashMDP + "')", function (err, result) {
        if (err) {
          console.error('error on insertion: ' + err.stack);
          return;
        } else {
          console.log(`account created : ${nom}, ${hashMDP}`)
        }
      });
    }
  });

  socket.on('creationPartie', (type, nbMinJoueurs, nbMaxJoueurs, idCreateur) => {
    codepartie = defCode();
    listeParties[codepartie] = new partie(type, idCreateur, nbMinJoueurs, nbMaxJoueurs, 1, [idCreateur],0,{});
    console.log("partie " + codepartie + " créée");
    socket.emit('goToGame', codepartie.toString());
    socket.emit("setGameId", codepartie.toString());
    socket.join(codepartie.toString());
  });

  socket.on("joinGame", (idJoueur, idRoom) => {
    var idRoomInt = parseInt(idRoom);
    if (idRoomInt in listeParties) {
      if (listeParties[idRoomInt].nbJoueurs == listeParties[idRoomInt].nbMaxJoueurs) {
        socket.emit("roomComplete");
      } else {
        listeParties[idRoomInt].nbJoueurs += 1;

        listeParties[idRoomInt].listeJoueurs.push(idJoueur);
        socket.join(idRoom);
        socket.emit('goToGame', idRoom);
        io.to(idRoom).emit("setGameId", idRoom);
        io.to(idRoom).emit("playersList", listeParties[idRoomInt].listeJoueurs);
        console.log("Le joueur " + idJoueur + " a rejoint la room " + idRoom);
      }
    } else {
      socket.emit("roomDontExist");
    }
  });

  socket.on('mess', data => {
    console.log(data + " : data envoyée à " + socket.id)
    io.emit('messagerie', data);
  });

  socket.on("getCards", (playerId,gameId) => {
    if(listeParties[gameId]!=undefined){
      if(listeParties[gameId].cartes[playerId]!=null){
        socket.emit("cardsList", listeParties[gameId].cartes[playerId]);
      }
    }
  });

  function countdown(){
    setInterval(()=>{
      for (const [key, value] of Object.entries(listeParties)) {
        if(value.timer!=0){
          value.timer -= 1;
          if(value.timer==0){
            io.to(key).emit("choosingEnd");
            console.log("fin du tour !")
          }
        }
        io.to(key).emit("timeLeft",value.timer);
      }
    },1000);
  }

  socket.on("startTimer", (gameId) => {
    listeParties[gameId].timer = 5;
    if(!timerIsRunning){
      timerIsRunning = true;
      countdown();
    }
  });

  socket.on("submitCard", (playerId, card, gameId) => {
    if(bataille[gameId]==undefined){
      bataille[gameId] = [];
    }
    bataille[gameId].push([playerId, card]);
    console.log("Le joueur " + playerId + " a le code de partie :"+gameId);
    if (listeParties[gameId].listeJoueurs.length === bataille[gameId].length) {
      pickWinner(gameId);
    }
  });

  function pickWinner(gameId) {
    let winner = bataille[gameId][0][0];
    let winnerCardValue = 1;
    console.log(bataille);
    bataille[gameId].forEach(player => {
      let card = player[1].split("_")[0];
      let cardValue = 1;
      switch (card) {
        case 'jack':
          cardValue = 11;
          break;
        case 'queen':
          cardValue = 12;
          break;
        case 'king':
          cardValue = 13;
          break;
        case 'ace':
          cardValue = 14;
          break;
        default:
          cardValue = parseInt(card);
          break;
      }
      if (winnerCardValue < cardValue) {
        winnerCardValue = cardValue;
        winner = player[0];
      }
    });

    console.log(winner);
    bataille[gameId] = [];
  }

  socket.on("saveGame", (gameId) => {
    if (!gameId == "") {
      connexiondb.query("INSERT INTO parties VALUES ('" + gameId + "', '" + 1 + "', '" + 2 + "', '" + 10 + "', '" + listeParties[gameId].idCreateur + "')", function(err, result) {
        if (err) {
          console.error('error on insertion: ' + err.stack);
          return;
        } else {
          console.log("partie sauvegardée");
        }
      });
      for (var joueur in listeParties[gameId].listeJoueurs) {
        connexiondb.query("INSERT INTO partiejoueur VALUES ('" + gameId + "', '" + joueur + "', '" + listeParties[gameId].cartes[joueur].join("|") + "')", function(err, result) {
          if (err) {
            console.error('error on insertion: ' + err.stack);
            return;
          } else {
            console.log(`joueur : ${joueur} et ses cartes ajoutés`);
          }
        });
      }
    }
  });

  socket.on('recuperationListeParties', (typeJeu) => {
    let liste = [];
    //console.log(listeParties);
    if (listeParties) {
      for (var pt in listeParties) {
        var partie = listeParties[pt];
        liste.push([
          pt, //code
          partie.typeJeu,
          partie.nbMinJoueurs, 
          partie.nbMaxJoueurs,
          partie.listeJoueurs.length
        ]);
      }
    }
    socket.emit('listeDesParties', liste);
    console.log(liste);
  });

  function shuffle(playerList){
    var cardListe = [];
    const couleurs = ["hearts","spades","diamonds","clubs"];
    const valeurs = ["ace","2","3","4","5","6","7","8","9","10","jack","king","queen"];
    couleurs.forEach(couleur => {
      valeurs.forEach(valeur => {
        cardListe.push(valeur+"_of_"+couleur);
        //console.log(valeur+"_of_"+couleur)
      });    
    });
    for (let i = cardListe.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = cardListe[i];
      cardListe[i] = cardListe[j];
      cardListe[j] = temp;
    }
  console.log("la liste des cartes est :"+cardListe+"          La longueur de la liste est"+cardListe.length);
    var max = playerList.length;
    var i = 0;
    var cartes = {};
    playerList.forEach(player => {
      cartes[player] = [];
    });
  
    cardListe.forEach(card => {
      cartes[playerList[i]].push(card);
      i = (i+1)%max;
    });
    return cartes;
  }

  socket.on("launchGame",(gameId)=>{
    listeParties[gameId].cartes = shuffle(listeParties[gameId].listeJoueurs);
    io.to(gameId).emit("shuffleDone");
  });
});

server.listen(3001, () => {
  console.log("SERVER IS RUNNING");
});