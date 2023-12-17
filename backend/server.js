const express = require("express")
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mysql = require("mysql");
const jsSHA = require("jssha");

var timerIsRunning = false;
var turnDuration = 10;

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
  console.log('connected to database as id ' + connexiondb.threadId);
});

app.use(cors());

const server = http.createServer(app);

var bataille = {};
var joueursConnectes = [];

function defCode() {
  var code = Math.floor(Math.random() * 9999);
  while (code in listeParties)
    code = Math.floor(Math.random() * 9999);
  return code
}

class partie {
  constructor(typeJeu, idCreateur, nbMinJoueurs, nbMaxJoueurs, nbJoueurs, listeJoueurs, timer, secondTimer, cartes) {
    this.typeJeu = typeJeu;
    this.idCreateur = idCreateur;
    this.nbMinJoueurs = nbMinJoueurs;
    this.nbMaxJoueurs = nbMaxJoueurs;
    this.nbJoueurs = nbJoueurs;
    this.listeJoueurs = listeJoueurs;
    this.listeIdentifiants = [];
    this.timer = timer;
    this.secondTimer = secondTimer;
    this.cartes = cartes;
    this.status=0; //1 si la partie est démarré
    this.gameIsPaused=false;

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
  console.log(`Socket connected: ${socket.id}`);

  socket.on("hello", (sessId) => {
    if (joueursConnectes.includes(sessId)) {
      socket.emit("connected");
      for (var pt in listeParties) {
        if (listeParties[pt].listeJoueurs.includes(sessId)) {
          rejoindrePartie(sessId, pt);
        }
      }
    } else {
      joueursConnectes.push(sessId);
    }
  });

  socket.on("goodbye", (sessId) => {
    var index = joueursConnectes.indexOf(sessId)
    if (index != -1) {
      joueursConnectes.splice(index, 1);
      console.log(`${sessId} disconnected`);
      socket.emit("disconnected");
    }
  });

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
          socket.emit("accountCreated");
          console.log(`account created : ${nom}, ${hashMDP}`)
        }
      });
    }
  });

  async function creerPartie(codepartie, type, nbMinJoueurs, nbMaxJoueurs, idCreateur, cartes) {
    listeParties[codepartie] = new partie(type, idCreateur, nbMinJoueurs, nbMaxJoueurs, 1, [idCreateur],0,0,cartes);
    listeParties[codepartie].listeIdentifiants=[socket.id];
    await socket.join(codepartie.toString());
    console.log("partie " + codepartie + " créée");
    socket.emit("goToGame", codepartie.toString(), () => {
      socket.emit("setGameId", codepartie.toString());
      socket.emit("playersList", listeParties[codepartie].listeJoueurs);
    });
  }

  socket.on('creationPartie', (type, nbMinJoueurs, nbMaxJoueurs, idCreateur) => {
    codepartie = defCode();
    creerPartie(codepartie, type, nbMinJoueurs, nbMaxJoueurs, idCreateur, {});
  });

  async function rejoindrePartie(idJoueur, idRoom) {
    var idRoomInt = parseInt(idRoom);
    if (idRoomInt in listeParties) {
      if (listeParties[idRoomInt].status==0){
        if (listeParties[idRoomInt].nbJoueurs == listeParties[idRoomInt].nbMaxJoueurs) {
          socket.emit("roomComplete");
        } else {
          if (!listeParties[idRoomInt].listeJoueurs.includes(idJoueur)) {
            listeParties[idRoomInt].nbJoueurs += 1;
            listeParties[idRoomInt].listeJoueurs.push(idJoueur);
          }
          listeParties[idRoomInt].listeIdentifiants.push(socket.id);
          await socket.join(idRoom);
          socket.emit('goToGame', idRoom, () => {
            io.to(idRoom).emit("setGameId", idRoom);
            io.to(idRoom).emit("playersList", listeParties[idRoomInt].listeJoueurs);
            console.log("Le joueur " + idJoueur + " a rejoint la room " + idRoom);
          });
        }
      } else{
        socket.emit("gameRunning");
      }
    } else {
      socket.emit("roomDontExist");
    }
  }

  socket.on("joinGame", (idJoueur, idRoom) => {
    rejoindrePartie(idJoueur, idRoom);
  });

  socket.on('disconnecting', () => {
    console.log("deconnexion");
    for (const cle in listeParties) {
      console.log(listeParties[cle].listeIdentifiants);
        if ((listeParties[cle].listeIdentifiants).includes(socket.id)){
          let indice=(listeParties[cle].listeIdentifiants.indexOf(socket.id));
          (listeParties[cle].listeIdentifiants).splice(indice,1);
          (listeParties[cle].listeJoueurs).splice(indice,1);
          console.log(listeParties[cle].nbJoueurs);
          listeParties[cle].nbJoueurs=(listeParties[cle].nbJoueurs)-1;
          console.log(listeParties[cle].nbJoueurs);

        }
      }
    

  });

  socket.on('mess', (data1,data2) => {
    console.log(data1 + " : data envoyée à " + socket.id)
    var res = data2+" : "+data1
    io.emit('messagerie', res);
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
        if(value.timer!=0 && !value.gameIsPaused){
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

  function startTimer(gameId){
    listeParties[gameId].timer = turnDuration;
    if(!timerIsRunning){
      timerIsRunning = true;
      countdown();
    }
  }

  socket.on("submitCard", (playerId, card, gameId) => {
    socket.emit("unselectCard");
    if(bataille[gameId]==undefined){
      bataille[gameId] = [];
    }
    bataille[gameId].push([playerId, card]);
    const index =  listeParties[gameId].cartes[playerId].indexOf(card);
    if (index > -1) {
      listeParties[gameId].cartes[playerId].splice(index, 1);
    }
    if (listeParties[gameId].listeJoueurs.length === bataille[gameId].length) {
      io.to(gameId).emit("cardsChanged");
      pickWinner(gameId, []);
    }
  });

  function startSecondTimer(gameId, playerList, cardsToWin){
    listeParties[gameId].secondTimer = turnDuration;
     var secondTimer = setInterval(()=>{
      if(listeParties[gameId].secondTimer!=0){
        listeParties[gameId].secondTimer -= 1;
        if(listeParties[gameId].secondTimer==0){
          io.to(gameId).emit("secondChoosingEnd",playerList, cardsToWin);
          console.log("fin du tour !")
          clearInterval(secondTimer);
        }
      }
      io.to(gameId).emit("timeLeft",listeParties[gameId].secondTimer);
    },1000);
  }

  socket.on("submitCardSecondTime", (playerId, card, gameId, cardsToWin) => {
    socket.emit("unselectCard");
    if(bataille[gameId]==undefined){
      bataille[gameId] = [];
    }
    bataille[gameId].push([playerId, card]);
    const index =  listeParties[gameId].cartes[playerId].indexOf(card);
    if (index > -1) {
      listeParties[gameId].cartes[playerId].splice(index, 1);
    }
    if (listeParties[gameId].listeJoueurs.length === bataille[gameId].length) {
      io.to(gameId).emit("cardsChanged");
      pickWinner(gameId, cardsToWin);
    }
  });

  function pickWinner(gameId, cardsToWin) {
    function score(playerId){
      connexiondb.query("UPDATE joueurs SET score=score+1 WHERE pseudo='"+playerId+"'",function (err,result){
        if(err){
          console.error('error on insertion: ' + err.stack);
        } else {
          console.log("score of " + playerId + " updated");
        }
      })
    }
    let winner = bataille[gameId][0][0];
    let otherWinners = [];
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
        otherWinners = [];
      } else if (winnerCardValue == cardValue) {
        otherWinners.push(player[0]);
      }
    });
    if(otherWinners.length!=0){
      otherWinners.push(winner);
      startSecondTimer(gameId, otherWinners, bataille[gameId].concat(cardsToWin));
      bataille[gameId] = [];
    } else {
      console.log(winner + " a gagné le tour de jeu !");
      var allCards = bataille[gameId].concat(cardsToWin);
      console.log(cardsToWin);
      console.log(allCards);
      allCards.forEach(player => {
        listeParties[gameId].cartes[winner].push(player[1]);
        console.log(winner + " a obtenu la carte " + player[1] + " du joueur "+ player[0]);
      })
      io.to(gameId).emit("fight",winner, allCards);
      bataille[gameId] = [];
      io.to(gameId).emit("cardsChanged");
      var nbCartes = {};
      for (const [key, value] of Object.entries(listeParties[gameId].cartes)) {
        nbCartes[key] = value.length;
      }
      io.to(gameId).emit("nbCartes",nbCartes);
      for (const [key, value] of Object.entries(listeParties[gameId].cartes)) {
        if(value.length == 0){
          delete listeParties[gameId].cartes[key];
        }
      }
      if(Object.keys(listeParties[gameId].cartes).length == 1){
        io.to(gameId).emit("gameFinished",Object.keys(listeParties[gameId].cartes)[0]);
        score(winner);
        delete listeParties[gameId];
      } else {
        startTimer(gameId);
      }
    }
  }

  socket.on("saveGame", (gameId, pseudo) => {
    if (pseudo==listeParties[gameId].idCreateur){
      if (listeParties[gameId].status==1){
        if (!gameId == "") {
          connexiondb.query("INSERT INTO parties VALUES ('" + gameId + "', '" + 1 + "', '" + 2 + "', '" + 10 + "', '" + listeParties[gameId].idCreateur + "')", function(err, result) {
            if (err) {
              console.error('error on insertion: ' + err.stack);
              return;
            } else {
              console.log("partie sauvegardée");
              for (const [key, value] of Object.entries(listeParties)){
                console.log("Les id des games sont "+key+" avant la suppression");
              }
              delete listeParties[gameId]
              console.log(listeParties);
            }
          });

          function queryResult(joueur,gameId) {
            connexiondb.query("INSERT INTO partiejoueur VALUES ('" + gameId + "', '" + joueur + "', '" + listeParties[gameId].cartes[joueur].join("|") + "')", function(err, result) {
              if (err) {
                console.error('error on insertion: ' + err.stack);
                return;
              } else {
                console.log(`joueur : ${joueur} et ses cartes ajoutés`);
              }
            });
          }

          for (var joueur of listeParties[gameId].listeJoueurs) {
            console.log(joueur,listeParties[gameId].cartes[joueur].join("|"));
            queryResult(joueur,gameId);
          }
        }
      } else{
        socket.emit("SaveGameNotStarted");
      }
    } else{
      socket.emit("PasPermSauvegarde");
    }
  });

  socket.on("loadGame", (code) => {
    var cartes = {};
    connexiondb.query("SELECT * FROM parties AS pt JOIN partiejoueur AS ptj ON pt.idGame=ptj.idGame WHERE pt.idGame='" + code + "'", (err, result) => {
      if (err) {
        console.error('error on query: ' + err.stack);
        return;
      } else {
        for (row of result) {
          cartes[row.idJoueur] = row.carte.split("|");
        }
        creerPartie(row.idGame, result[0].typeJeu, result[0].nbMinJoueurs, result[0].nbMaxJoueurs, result[0].idCreateur, cartes);
        connexiondb.query("DELETE FROM partiejoueur WHERE idGame='" + code + "'", (err, result) => {
          if (err) {
            console.error('error on delete: ' + err.stack);
            return;
          } else {
            connexiondb.query("DELETE FROM parties WHERE idGame='" + code + "'", (err, result) => {
              if (err) {
                console.error('error on delete: ' + err.stack);
                return;
              }
            });
          }
        });
      }
    });
  });

  socket.on("getSavedGames", () => {
    var queryResult = []
    connexiondb.query("SELECT * FROM parties", (err, result) => {
      if (err) {
        console.error('error on query: ' + err.stack);
        return;
      } else {
        for (row of result) {
          queryResult.push([row.idGame]);
        }
        socket.emit("returnSavedGames", queryResult);
      }
    });
  });

  socket.on('recuperationListeParties', (typeJeu) => {
    let liste = [];
    //console.log(listeParties);
    if (listeParties) {
      for (var pt in listeParties) {
        if (listeParties[pt].status==0){
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
  //console.log("la liste des cartes est :"+cardListe+"          La longueur de la liste est"+cardListe.length);
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
  socket.on("pauseGame",(data)=>{
    listeParties[data].gameIsPaused = true;
  });
  socket.on("unpauseGame",(data)=>{
    listeParties[data].gameIsPaused = false;
  });
  socket.on("launchGame",(gameId, pseudo)=>{
    if (pseudo==listeParties[gameId].idCreateur){
      if (listeParties[gameId].nbJoueurs>=listeParties[gameId].nbMinJoueurs){
        if (Object.keys(listeParties[gameId].cartes).length === 0) {
          listeParties[gameId].cartes = shuffle(listeParties[gameId].listeJoueurs);
        }
        io.to(gameId).emit("cardsChanged");
        var nbCartes = {};
        for (const [key, value] of Object.entries(listeParties[gameId].cartes)) {
          nbCartes[key] = value.length;
        }
        io.to(gameId).emit("nbCartes",nbCartes);
        startTimer(gameId);
        listeParties[gameId].status=1;
      }else {
        socket.emit("notEnoughPlayers");
      }
    } else{
      console.log("vous");
      socket.emit("PasDePerms");
    }
  });
});

server.listen(3001, () => {
  console.log("Server is listening on port 3001");
});