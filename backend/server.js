const express = require("express")
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mysql = require("mysql");
const jsSHA = require("jssha");

//variables globales du serveur
var timerIsRunning = false;
//var turnDuration = 10;
var bataille = {};
var gameOrderBoeuf = {}
var joueursConnectes = [];
var listeParties = {};

//mise en place et connection à la base de données mysql
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

//mise en place et création du serveur
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: 'true'
  },
});

//objet représentant une partie avec toutes ses infos sur le serveur
class partie {
  constructor(typeJeu, idCreateur, nbMinJoueurs, nbMaxJoueurs, nbJoueurs, listeJoueurs, timer, secondTimer, cartes, dureeTour) {
    this.typeJeu = typeJeu;
    this.idCreateur = idCreateur;
    this.nbMinJoueurs = nbMinJoueurs;
    this.nbMaxJoueurs = nbMaxJoueurs;
    this.nbJoueurs = nbJoueurs;
    this.listeJoueurs = listeJoueurs;
    this.socketsJoueurs = {};
    this.timer = timer;
    this.secondTimer = secondTimer;
    this.cartes = cartes;
    this.status=0; //1 si la partie est démarré
    this.gameIsPaused=false;
    this.playerScoreBoeuf = {};
    this.compteToursBoeuf = 0;
    this.dureeTour = dureeTour;
  }
}

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("hello", (sessId) => {
    // => reçu automatiquement en cas de connexion de socket et assure la reconnexion automatique
    //regarde si le joueur était connecté via son cookie et si il était dans une partie
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
    // => lorsque le joueur clique sur le bouton "se déconnecter"
    //supprime le joueur des joueurs connectés
    //renvoie un signal de confirmation au client
    var index = joueursConnectes.indexOf(sessId)
    if (index != -1) {
      joueursConnectes.splice(index, 1);
      console.log(`${sessId} disconnected`);
      socket.emit("disconnected");
    }
  });

  socket.on("connexion", (nom, mdp) => {
    // => connexion d'un joueur via les champs de texte de la page d'accueil
    //regarde si le joueur est dans la base de données
    //renvoie le signal conséquent au client
    if (joueursConnectes.includes(nom)) {
      socket.emit("userAlreadyConnected");
    } else {
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
    }
  });

  socket.on("newAccount", async (nom, mdp) => {
    // => joueur clique sur le bouton "créer un compte"
    //regarde si le joueur existe déjà
    //renvoie le signal conséquent au client
    var exists = false;
    let queryResult;
    try {
      queryResult = await doQuery("SELECT pseudo FROM joueurs",[]);
    } catch (err) {
      console.log(err);
    }
    for (var row of queryResult) {
      if (nom === row.pseudo) {
        exists = true;
        socket.emit("userAlreadyRegistered");
      }
    }
    if (!exists) {
      const shaObj = new jsSHA("SHA-256", "TEXT", { encoding: "UTF8" });
      shaObj.update(mdp);
      const hashMDP = shaObj.getHash("HEX");
      try {
        await doQuery("INSERT INTO joueurs (pseudo, hashMDP) VALUES (?, ?);",[nom, hashMDP]);
        await doQuery("INSERT INTO scoresBoeuf (joueur) VALUES (?);",[nom]);
      } catch (err) {
        console.log(err);
      }
      socket.emit("accountCreated");
      console.log(`account created : ${nom}, ${hashMDP}`);
    }
  });

  socket.on('disconnecting', () => {
    // => reçu automatiquement en cas de déconnexion d'un socket
    //s'assure que si le socket était connecté à une partie, il en soit supprimé
    console.log("deconnexion");
    for (const cle in listeParties) {
      console.log(listeParties[cle].socketsJoueurs);
      let partie = listeParties[cle];
      for (current in partie) {
        if (partie[current] == socket.id) {
          delete partie[current];
          break;
        }
      }
    }
  });

  socket.on("giveUp", (gameId, playerId) => {
    // => joueur clique sur le bouton "abandonner" dans une partie
    //s'assure de la réassignation du meneur si le créateur abandonne
    //supprime la partie des parties lancées si plus aucun joueur n'est présent dedans
    let index = listeParties[gameId].listeJoueurs.indexOf(playerId);
    listeParties[gameId].listeJoueurs.splice(index,1);
    listeParties[gameId].nbJoueurs-=1;

    console.log("nombre de joueurs dans la partie " + gameId + " : " + listeParties[gameId].nbJoueurs);

    if (listeParties[gameId].idCreateur == playerId) {
      if (listeParties[gameId].nbJoueurs == 0) {
        delete listeParties[gameId];
        console.log("partie " + gameId + " supprimée : " + (!listeParties[gameId]));
      } else {
        listeParties[gameId].idCreateur = listeParties[gameId].listeJoueurs[0];
        console.log("créateur de la partie " + gameId + " apres réassignation " + listeParties[gameId].idCreateur);
      }
    } else {
      if (listeParties[gameId].nbJoueurs == 0) {
        delete listeParties[gameId];
      }
    }
    socket.emit("gaveUp");
    socket.to(gameId).emit("quit", playerId);
  });

  function defCode() {
    //fonction pour définir un code de partie unique
    var code = Math.floor(Math.random() * 9000)+1000;
    while (code in listeParties) {
      if (code>=9999){
        code=1000;;
      }else {
        code++;
      }
    }
    return code;
  }

  async function creerPartie(codepartie, type, nbMinJoueurs, nbMaxJoueurs, idCreateur, cartes,dureeTour) {
    //fonction de création de partie, sous forme de fonction car utilisée plusieurs fois dans le code
    //cette fonction est asynchrone car socket.join est une opération asynchrone
    if (nbMinJoueurs>nbMaxJoueurs || nbMinJoueurs>10 || nbMaxJoueurs>10){
      nbMinJoueurs=2;
      nbMaxJoueurs=10;
    }
    listeParties[codepartie] = new partie(type, idCreateur, nbMinJoueurs, nbMaxJoueurs, 1, [idCreateur],0,0,cartes,dureeTour);
    listeParties[codepartie].playerScoreBoeuf[idCreateur] = 0;
    listeParties[codepartie].socketsJoueurs[idCreateur] = socket.id;
    await socket.join(codepartie.toString());
    console.log("partie " + codepartie + " créée");
    socket.emit("goToGame", codepartie.toString(), listeParties[codepartie].typeJeu, () => {
      socket.emit("setGameId", codepartie.toString());
      socket.emit("playersList", listeParties[codepartie].listeJoueurs);
    });
  }

  socket.on('creationPartie', (type, nbMinJoueurs, nbMaxJoueurs, dureeTour,idCreateur) => {
    // => joueur clique sur le bouton "créer la partie"
    //crée la partie avec les infos données sauf si le nombre de partie max est dépassé
    if (Object.keys(listeParties).length>=8999){
      console.log("nombre de partie maximal atteint");
      socket.emit("maxGames");
    } else {
      codepartie = defCode();
      creerPartie(codepartie, type, nbMinJoueurs, nbMaxJoueurs, idCreateur, {},dureeTour);      
    }
  });

  async function rejoindrePartie(idJoueur, idRoom) {
    //fonction pour que le joueur idJoueur rejoigne la partie idRoom, sous forme de fonction car utilisée plusieurs fois dans le code
    //cette fonction est asynchrone car socket.join est une opération asynchrone
    //renvoie un signal au client si la partie n'existe pas
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
          listeParties[idRoomInt].playerScoreBoeuf[idJoueur] = 0;
          listeParties[idRoomInt].socketsJoueurs[idJoueur] = socket.id;
          await socket.join(idRoom);
          socket.emit('goToGame', idRoom, listeParties[idRoomInt].typeJeu, () => {
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
    // => joueur clique sur le bouton "rejoindre la partie"
    //rejoint la partie idRoom
    rejoindrePartie(idJoueur, idRoom);
  });

  socket.on('mess', (data1,data2) => {
    // => un joueur envoie un message
    //renvoie le message a tous les sockets connectés pour l'afficher
    console.log(data1 + " : data envoyée à " + socket.id)
    var res = data2+" : "+data1
    io.emit('messagerie', res);
  });

  socket.on("getCards", (playerId,gameId) => {
    if (listeParties[gameId] != undefined) {
      if (listeParties[gameId].cartes[playerId] != null) {
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
    listeParties[gameId].timer =listeParties[gameId].dureeTour;
    if(!timerIsRunning){
      timerIsRunning = true;
      countdown();
    }
  }

  socket.on("submitCard", (playerId, card, gameId) => {
    socket.emit("unselectCard");
    if(listeParties[gameId].typeJeu == 1){
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
    }
    else if(listeParties[gameId].typeJeu == 2){
      if(gameOrderBoeuf[gameId] == undefined){
        gameOrderBoeuf[gameId] = [];
      }
      if (gameOrderBoeuf[gameId].length != 0) {
        let cont = true;
        let i = 0;
        while (i < gameOrderBoeuf[gameId].length && cont) {
          //console.log(gameOrderBoeuf[gameId][i]);
          if (gameOrderBoeuf[gameId][i][1] > card) {
            gameOrderBoeuf[gameId].splice(i, 0, [playerId, card]);
            cont = false;
          } else if (i == gameOrderBoeuf[gameId].length - 1) {
            gameOrderBoeuf[gameId].push([playerId, card]);
            cont = false;
          }
          i++;
        }
      } else {
        gameOrderBoeuf[gameId].push([playerId, card]);
      }
      gameOrderBoeuf[gameId].forEach((joueur) => {
        let idJoueur = joueur[0];
        let carte = joueur[1];
        const index =  listeParties[gameId].cartes[idJoueur].indexOf(carte);
        if (index > -1) {
          listeParties[gameId].cartes[idJoueur].splice(index, 1);
        }
      });
      if (listeParties[gameId].listeJoueurs.length === gameOrderBoeuf[gameId].length){
        io.to(gameId).emit("cardsChanged");
        tourBoeuf(gameId);
      }
    }
  });

  function startSecondTimer(gameId, playerList, cardsToWin){
    listeParties[gameId].secondTimer = listeParties[gameId].dureeTour;
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

  socket.on("ligneChoisie",(gameId, idJoueur, indexLigne) => {
    if (listeParties[gameId].gameIsPaused) {
      unpauseGame(gameId, listeParties[gameId].idCreateur);
    }
    let carte = gameOrderBoeuf[gameId][0][1];
    while(listeParties[gameId].cartes["reste"][indexLigne].length >0){
      listeParties[gameId].playerScoreBoeuf[idJoueur] += nbTetes(listeParties[gameId].cartes["reste"][indexLigne].pop());
    }
    listeParties[gameId].cartes["reste"][indexLigne].push(carte);
    gameOrderBoeuf[gameId].splice(0,1);
    io.to(gameId).emit("reste", listeParties[gameId].cartes["reste"]);
    tourBoeuf(gameId);
  });

  function tourBoeuf(gameId) {
    console.log(gameOrderBoeuf);
    let pierre = false;
    gameOrderBoeuf[gameId].every((joueur) => {
      let idJoueur = joueur[0];
      let carte = joueur[1];
      console.log("carte du joueur " + idJoueur + " : " + carte);
      var min = listeParties[gameId].cartes["reste"][0][listeParties[gameId].cartes["reste"][0].length-1];
      var ligneMin = 0;
      listeParties[gameId].cartes["reste"].forEach((list) => {
        if ((carte - min) < 0) {
          min = list[list.length - 1];
          ligneMin = listeParties[gameId].cartes["reste"].indexOf(list);
        }
        if(((carte - list[list.length-1]) < (carte - min)) && ((carte - list[list.length-1]) > 0)){
          min = list[list.length-1];
          ligneMin = listeParties[gameId].cartes["reste"].indexOf(list);
        }
      });
      console.log(min);
      if(min > carte){
        io.to(listeParties[gameId].socketsJoueurs[idJoueur]).emit("choixLigne",gameId);
        pauseGame(gameId, listeParties[gameId].idCreateur);
        pierre = true;
        return false;
      }
      if(listeParties[gameId].cartes["reste"][ligneMin].length == 5 || min > carte){
        while(listeParties[gameId].cartes["reste"][ligneMin].length >0){
          listeParties[gameId].playerScoreBoeuf[idJoueur] += nbTetes(listeParties[gameId].cartes["reste"][ligneMin].pop());
        }
      }
      listeParties[gameId].cartes["reste"][ligneMin].push(carte);
      io.to(gameId).emit("reste", listeParties[gameId].cartes["reste"]);
      return true;
    });
    if (!pierre && !finMancheBoeuf(gameId)) {
      io.to(gameId).emit("scorePlayer",listeParties[gameId].playerScoreBoeuf);
      gameOrderBoeuf[gameId] = [];
      listeParties[gameId].compteToursBoeuf ++;
      if (listeParties[gameId].compteToursBoeuf < 10) {
        startTimer(gameId);
      } else {
        setTimeout(() => {
          listeParties[gameId].cartes = shuffleBoeuf(listeParties[gameId].listeJoueurs);
          listeParties[gameId].compteToursBoeuf = 0;
          io.to(gameId).emit("reste", listeParties[gameId].cartes["reste"]);
          io.to(gameId).emit("cardsChanged");
          startTimer(gameId);
        }, 2000);
      }
    }
  }

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
        io.to(gameId).emit("victory",winner);
      } else {
        startTimer(gameId);
      }
    }
  }

  function doQuery(query, arguments) {
    return new Promise((resolve, reject) => {
      connexiondb.query(query, arguments, function(err, res) {
        if (err) {
          reject(err.stack);
        } else {
          resolve(res);
        }
      });
    });
  }

  socket.on("saveGame", async (gameId, pseudo) => {
    // => joueur clique sur le bouton "sauvegarder la partie"
    //renvoie le signal conséquent à la réussite de la sauvegarde
    let partie = listeParties[gameId];
    if (pseudo==partie.idCreateur){
      if (partie.status==1){
        if (!gameId == "") {
          try {
            await doQuery("INSERT INTO parties VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [gameId, partie.typeJeu, partie.nbMinJoueurs, partie.nbMaxJoueurs, null, partie.idCreateur, partie.dureeTour, null]);
          } catch (err) {
            console.log(err);
          }
          if (partie.typeJeu == 2) {
            try {
              await doQuery("UPDATE parties SET plateau=? WHERE idGame=?", [partie.cartes["reste"].join("|"), gameId]);
              await doQuery("UPDATE parties SET compteToursBoeuf=? WHERE idGame=?", [partie.compteToursBoeuf, gameId])
            } catch (err) {
              console.log(err);
            }
          }
          for (var joueur of partie.listeJoueurs) {
            try {
              await doQuery("INSERT INTO partiejoueur VALUES (?, ?, ?, ?)", [gameId, joueur, partie.cartes[joueur].join("|"), partie.playerScoreBoeuf[joueur]]);
            } catch (err) {
              console.log(err);
            }
          }
          io.to(gameId).emit("partieSauvegardee");
          console.log("partie sauvegardée");
          delete listeParties[gameId];
          console.log(listeParties);
        }
      } else{
        socket.emit("SaveGameNotStarted");
      }
    } else{
      socket.emit("PasPermSauvegarde");
    }
  });

  socket.on("loadGame", async (code) => {
    // => joueur clique sur le bouton "charger la partie"
    //crée une partie avec les données tirées de la base de données
    //rajoute la partie dans les parties en cours du serveur
    //supprime la partie et ses joueurs de la base de données
    let queryResult;
    let cartes = {};
    let playersScores = {};
    try {
      queryResult = await doQuery("SELECT * FROM parties AS pt JOIN partiejoueur AS ptj ON pt.idGame=ptj.idGame WHERE pt.idGame=?", [code]);
    } catch (err) {
      console.log(err);
    }
    for (row of queryResult) {
      console.log(row);
      cartes[row.idJoueur] = row.carte.split("|");
      if (row.typeJeu == 2) {
        playersScores[row.idJoueur] = row.scoreBoeuf;
      }
    }
    creerPartie(row.idGame, row.typeJeu, row.nbMinJoueurs, row.nbMaxJoueurs, row.idCreateur, cartes, row.dureeTour);
    listeParties[code].gameIsPaused = true;
    socket.emit("gameEnPause");
    if (row.typeJeu == 2) {
      cartes["reste"] = row.plateau.split("|");
      listeParties[code].compteToursBoeuf = row.compteToursBoeuf;
      listeParties[code].playerScoreBoeuf = playersScores;
    }
    console.log(listeParties[row.idGame]);
    try {
      await doQuery("DELETE FROM partiejoueur WHERE idGame=?",[code]);
      await doQuery("DELETE FROM parties WHERE idGame=?",[code]);
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("getSavedGames", async () => {
    // => joueur clique sur le bouton "charger une partie sauvegardée"
    //renvoie la liste de toutes les parties sauvegardées dans la base de données
    let queryResult;
    let savedGamesList = [];
    try {
      queryResult = await doQuery("SELECT * FROM parties",[]);
    } catch (err) {
      console.log(err);
    }
    for (row of queryResult) {
      savedGamesList.push([row.idGame, row.typeJeu]);
    }
    socket.emit("returnSavedGames", savedGamesList);
  });

  socket.on('recuperationListeParties', (typeJeu) => {
    // => joueur clique sur le bouton "afficher la liste des parties"
    //renvoie la liste de toutes les parties en cours dans le serveur
    let liste = [];
    //console.log(listeParties);
    if (listeParties) {
      for (var pt in listeParties) {
        var partie = listeParties[pt];
        if (listeParties[pt].status==0 && ((typeJeu==0)||typeJeu==partie.typeJeu)){
          liste.push([
            pt, //code
            partie.typeJeu
            /*partie.nbMinJoueurs, 
            partie.nbMaxJoueurs,
            partie.listeJoueurs.length*/
          ]);
        }
      }
    }
    socket.emit('listeDesParties', liste);
    console.log(liste);
  });

  function shuffle(playerList){
    //mélange les cartes de tous les joueurs de la playerList
    var cardListe = [];
    const couleurs = ["hearts","spades","diamonds","clubs"];
    const valeurs = ["ace","2","3","4","5","6","7","8","9","10","jack","king","queen"];
    couleurs.forEach(couleur => {
      valeurs.forEach(valeur => {
        cardListe.push(valeur+"_of_"+couleur);
      });    
    });
    for (let i = cardListe.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = cardListe[i];
      cardListe[i] = cardListe[j];
      cardListe[j] = temp;
    }
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

  function shuffleBoeuf(playerList){
    var cartes = {}
    var cards = []
    for(i=1;i<=104;i++){
      cards.push(i);
    }
    playerList.forEach((elem) => 
      {cartes[elem] = [];
        while(cartes[elem].length <10){
        var indexMax = cards.length-1;
        var selectedIndex = Math.floor(Math.random()*indexMax);
        cartes[elem].push(cards[selectedIndex]);
        cards.splice(selectedIndex,1);
      }
      cartes["reste"] = []
      for(i=0;i<4;i++){
        var indexMax = cards.length-1;
        var selectedIndex = Math.floor(Math.random()*indexMax);
        cartes["reste"].push([cards[selectedIndex]]);
        cards.splice(selectedIndex,1);
      }
    });
    return cartes;
  }

  function nbTetes(numCarte){
    if (numCarte === 55) {
      return 7;
    } else if(numCarte % 11 === 0){
      return 4;
    } else if (numCarte % 10 === 0) {
      return  3;
    } else if (numCarte % 5 === 0) {
      return 2;
    } else {
      return 1;
    }
  }

  async function finMancheBoeuf(gameId){
    let max=0;
    let min;
    let vainqueurs=[];
    let val;
    for (let cle in listeParties[gameId].playerScoreBoeuf){
      val=listeParties[gameId].playerScoreBoeuf[cle];
      if (val > max){
        max=val;
      }
      min = min ?? val;
      if (val<=min){
        if (val==min){
          vainqueurs.push(cle);
        } else{
          vainqueurs=[];
          vainqueurs.push(cle);
          min=val;
        }
      }
    }
    if (max>=66){
      for (let joueur in listeParties[gameId].listeJoueurs) {
        try {
          await doQuery("UPDATE scoresboeuf SET scoreTotal=scoreTotal+?, nbPartiesJouees=nbPartiesJouees+1 WHERE joueur=?;",[listeParties[gameId].playerScoreBoeuf[joueur], joueur]);
        } catch (err) {
          console.log(err);
        }
        if (vainqueurs.includes(joueur)) {
          try {
            await doQuery("UPDATE scoresboeuf SET nbPartiesGagnees=nbPartiesGagnees+1 WHERE joueur=?;",[joueur]);
          } catch (err) {
            console.log(err);
          }
        }
      }
      io.to(gameId).emit("gameFinished",[]);
      delete listeParties[gameId];
      io.to(gameId).emit("victory",vainqueurs,min);
      return true;
    }
    return false;
  }

  function pauseGame(gameId, pseudo) {
    if (listeParties[gameId].status==1){
      if (listeParties[gameId].idCreateur==pseudo){
        listeParties[gameId].gameIsPaused = true;
        socket.emit("gameEnPause");
      } else{
        socket.emit("pasPermPause");
      }
    } else {
      socket.emit("pauseGameNotStarted");
    }
  }

  function unpauseGame(gameId, pseudo) {
    if (listeParties[gameId].idCreateur==pseudo){
      listeParties[gameId].gameIsPaused = false;
      socket.emit("gameReprise");
    } else{
      socket.emit("pasPermPause");
    }
  }

  socket.on("pauseGame", (gameId, pseudo) => {
    // => joueur clique sur le bouton "pause"
    //regarde si le joueur a les permissions et que la partie n'a pas démarrée
    //met la partie en pause sur le serveur
    //renvoie le signal conséquent
    pauseGame(gameId, pseudo);
  });

  socket.on("unpauseGame",  (gameId, pseudo) => {
    // => joueur clique sur le bouton "retirer la pause"
    //regarde si le joueur a les permissions
    //enleve la pause de la partie sur le serveur
    //renvoie le signal conséquent
    unpauseGame(gameId, pseudo);
  });

  socket.on("launchGame",(gameId, pseudo)=>{
    // => joueur clique sur le bouton "lancer la partie"
    //regarde si le joueur a les permissions et s'il y a assez de joueurs présents
    //renvoie le signal conséquent
    if (pseudo==listeParties[gameId].idCreateur){
      if (listeParties[gameId].nbJoueurs>=listeParties[gameId].nbMinJoueurs){
        if (Object.keys(listeParties[gameId].cartes).length === 0) {

          switch (listeParties[gameId].typeJeu) {
            case "1":
              listeParties[gameId].cartes = shuffle(listeParties[gameId].listeJoueurs);
              break;
            case "2":
              listeParties[gameId].cartes = shuffleBoeuf(listeParties[gameId].listeJoueurs);
              io.to(gameId).emit("reste",listeParties[gameId].cartes["reste"]);
              break;
            default:
              break;
          }
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

//lien entre les clients React et le serveur
server.listen(3001, () => {
  console.log("Server is listening on port 3001");
});