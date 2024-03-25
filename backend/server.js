const express = require("express")
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mysql = require("mysql");
const jsSHA = require("jssha");

//variables globales du serveur
let timerIsRunning = false;
//let turnDuration = 10;
let bataille = {};
let gameOrderBoeuf = {}
let joueursConnectes = {};
let listeParties = {};
let jeuDeSet = [];

const couleurs = ["rouge", "vert", "violet"];
const formes = ["vague", "losange", "ovale"];
const nombres = [1, 2, 3];
const remplissages = ["vide", "raye", "plein"];

//mise en place et connection à la base de données mysql
let connexiondb;

function handleDbDisconnect() {
  connexiondb = mysql.createConnection({
    host: 'mysql.etu.umontpellier.fr',
    user: 'e20220003375',
    password: 'augustin',
    database: 'e20220003375'
  });

  connexiondb.connect(function (err) {
    if (err) {
      console.error('error on connection : ' + err.stack);
      setTimeout(handleDbDisconnect, 2000);
    }
    console.log('connected to database as id ' + connexiondb.threadId);
  });

  connexiondb.on('error', function (err) {
    console.log('db error', err.stack);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDbDisconnect();
    } else {
      throw err;
    }
  });
}

handleDbDisconnect();

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
    this.timer = timer;
    this.secondTimer = secondTimer;
    this.cartes = cartes;
    this.status=0; //1 si la partie est démarré
    this.gameIsPaused=false;
    this.playersScores = {}; // scores des joueurs dans des parties de 6 qui prend et Set, de la forme {joueur: score}
    this.compteToursBoeuf = 0;
    this.dureeTour = dureeTour;
    this.partieACharger = false;
  }
}

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("hello", (sessId) => {
    // => reçu automatiquement en cas de connexion de socket et assure la reconnexion automatique
    //regarde si le joueur était connecté via son cookie et si il était dans une partie
    if (joueursConnectes[sessId] === "") {
      joueursConnectes[sessId] = socket.id;
      socket.emit("connected");
      for (let pt in listeParties) {
        if (listeParties[pt].listeJoueurs.includes(sessId)) {
          rejoindrePartie(sessId, pt);
        }
      }
    } else {
      joueursConnectes[sessId] = socket.id;
    }
  });

  socket.on("goodbye", (sessId) => {
    // => lorsque le joueur clique sur le bouton "se déconnecter"
    //supprime le joueur des joueurs connectés
    //renvoie un signal de confirmation au client
    delete joueursConnectes[sessId];
    console.log(`${sessId} disconnected`);
    socket.emit("disconnected");
  });

  socket.on("connexion", (nom, mdp) => {
    // => connexion d'un joueur via les champs de texte de la page d'accueil
    //regarde si le joueur est dans la base de données
    //renvoie le signal conséquent au client
    if (joueursConnectes[nom] !== undefined) {
      if (joueursConnectes[nom] !== "") {
        socket.emit("userAlreadyConnected");
      } else {
        socket.emit("connected");
      }
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
    let exists = false;
    let queryResult;
    if (nom == "" || mdp == "") {
      socket.emit("userNotRegistered");
    } else {
      try {
        queryResult = await doQuery("SELECT pseudo FROM joueurs",[]);
      } catch (err) {
        console.log(err);
      }
      for (let row of queryResult) {
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
    }
  });

  socket.on('disconnecting', () => {
    // => reçu automatiquement en cas de déconnexion d'un socket
    //s'assure que si le socket était connecté à une partie, il en soit supprimé
    console.log("deconnexion : ", joueursConnectes);
    for (let joueur in joueursConnectes) {
      if (joueursConnectes[joueur] == socket.id) {
        joueursConnectes[joueur] = "";
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

    if (listeParties[gameId].nbJoueurs == 0) {
      delete listeParties[gameId];
      console.log("partie " + gameId + " supprimée : " + (!listeParties[gameId]));
    } else {
      if (listeParties[gameId].idCreateur == playerId) {
        listeParties[gameId].idCreateur = listeParties[gameId].listeJoueurs[0];
        console.log("créateur de la partie " + gameId + " apres réassignation " + listeParties[gameId].idCreateur);
      }
      socket.to(gameId).emit("quit", playerId);
      io.to(joueursConnectes[listeParties[gameId].idCreateur]).emit("newCreator");
      io.to(gameId).emit("playersList", listeParties[gameId].listeJoueurs);
      switch (listeParties[gameId].status) {
        case 0:
          io.to(joueursConnectes[listeParties[gameId].idCreateur]).emit("showLaunch");
          break;
        case 1:
          io.to(joueursConnectes[listeParties[gameId].idCreateur]).emit("gameLaunched");
          break;
        default:
          break;
      }
    }
    socket.emit("gaveUp");
  });

  socket.on('creationPartie', (type, nbMinJoueurs, nbMaxJoueurs, dureeTour,idCreateur) => {
    // => joueur clique sur le bouton "créer la partie"
    //crée la partie avec les infos données sauf si le nombre de partie max est dépassé
    if (Object.keys(listeParties).length>=8999){
      console.log("nombre de partie maximal atteint");
      socket.emit("maxGames");
    } else {
      let codepartie = defCode();
      creerPartie(codepartie, type, nbMinJoueurs, nbMaxJoueurs, idCreateur, {}, dureeTour);
    }
  });

  socket.on("joinGame", (idJoueur, idRoom) => {
    // => joueur clique sur le bouton "rejoindre la partie"
    //rejoint la partie idRoom
    rejoindrePartie(idJoueur, idRoom);
  });

  socket.on('mess', (message, joueur, gameId) => {
    // => un joueur envoie un message
    //renvoie le message a tous les sockets connectés pour l'afficher
    console.log(message + " : envoyée à " + socket.id);
    io.to(gameId).emit('messagerie', joueur + " : " + message);
  });

  socket.on("getCards", (playerId,gameId) => {
    if (listeParties[gameId] != undefined) {
      if (listeParties[gameId].cartes[playerId] != null) {
        socket.emit("cardsList", listeParties[gameId].cartes[playerId]);
      }
    }
  });

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
    let carte = gameOrderBoeuf[gameId][0][1];
    while(listeParties[gameId].cartes["reste"][indexLigne].length >0){
      listeParties[gameId].playersScores[idJoueur] += nbTetes(listeParties[gameId].cartes["reste"][indexLigne].pop());
    }
    listeParties[gameId].cartes["reste"][indexLigne].push(carte);
    gameOrderBoeuf[gameId].splice(0,1);
    io.to(gameId).emit("reste", listeParties[gameId].cartes["reste"]);
    tourBoeuf(gameId);
  });

  socket.on("saveGame", async (gameId) => {
    // => joueur clique sur le bouton "sauvegarder la partie"
    //renvoie le signal conséquent à la réussite de la sauvegarde
    let partie = listeParties[gameId];

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
      for (let joueur of partie.listeJoueurs) {
        try {
          await doQuery("INSERT INTO partiejoueur VALUES (?, ?, ?, ?)", [gameId, joueur, partie.cartes[joueur].join("|"), partie.playersScores[joueur]]);
        } catch (err) {
          console.log(err);
        }
      }
      io.to(gameId).emit("partieSauvegardee");
      console.log("partie sauvegardée");
      delete listeParties[gameId];
      console.log(listeParties);
    }
  });

  socket.on("loadGame", async (code) => {
    // => joueur clique sur le bouton "charger la partie"
    //crée une partie avec les données tirées de la base de données
    //rajoute la partie dans les parties en cours du serveur
    //supprime la partie et ses joueurs de la base de données
    let queryResult;
    try {
      queryResult = await doQuery("SELECT * FROM parties AS pt JOIN partiejoueur AS ptj ON pt.idGame=ptj.idGame WHERE pt.idGame=?", [code]);
    } catch (err) {
      console.log(err);
    }
    if (code !== "" && String(code).length <= 4 && queryResult.length > 0) {
      let cartes = {};
      let scores = {};
      for (row of queryResult) {
        console.log(row);
        cartes[row.idJoueur] = row.carte.split("|");
        if (row.typeJeu == 2) {
          scores[row.idJoueur] = row.scoreBoeuf;
        }
      }
      creerPartie(row.idGame, row.typeJeu, row.nbMinJoueurs, row.nbMaxJoueurs, row.idCreateur, cartes, row.dureeTour);
      if (row.typeJeu == 2) {
        listeParties[code].compteToursBoeuf = row.compteToursBoeuf;
        listeParties[code].playersScores = scores;
        console.log(listeParties[code].playersScores);
        reste = row.plateau.split("|");
        let listeCartes=[];
        for (let i=0 ; i<4 ; i++){
          let liste=reste[i].split(",");
          console.log(liste);
          listeCartes.push(liste);
        }
        listeParties[code].cartes["reste"]=listeCartes;
        console.log("la liste est" + listeParties[code].cartes["reste"]);
        listeParties[code].partieACharger = true;
      }
      try {
        await doQuery("DELETE FROM partiejoueur WHERE idGame=?",[code]);
        await doQuery("DELETE FROM parties WHERE idGame=?",[code]);
      } catch (err) {
        console.log(err);
      }
    } else {
      socket.emit("roomDontExist");
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
      for (let pt in listeParties) {
        let partie = listeParties[pt];
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

  socket.on("getLeaderboard", async () => {
    let queryResult;
    let listeScores = [];
    try {
      queryResult = await doQuery("SELECT * FROM scoresboeuf;",[]);
    } catch (err) {
      console.log(err);
    }
    for (let row of queryResult) {
      listeScores.push([row.joueur,row.scoreTotal,row.nbPartiesJouees,row.nbPartiesGagnees]);
    }
    socket.emit("returnLeaderboard", listeScores);
  });

  socket.on("pauseGame", (gameId) => {
    // => joueur clique sur le bouton "pause"
    //regarde si le joueur a les permissions et que la partie n'a pas démarrée
    //met la partie en pause sur le serveur
    //renvoie le signal conséquent
    pauseGame(gameId);
  });

  socket.on("unpauseGame",  (gameId) => {
    // => joueur clique sur le bouton "retirer la pause"
    //regarde si le joueur a les permissions
    //enleve la pause de la partie sur le serveur
    //renvoie le signal conséquent
    unpauseGame(gameId);
  });

  socket.on("launchGame",(gameId, pseudo)=>{
    // => joueur clique sur le bouton "lancer la partie"
    //regarde si le joueur a les permissions et s'il y a assez de joueurs présents
    //renvoie le signal conséquent
    if (listeParties[gameId].nbJoueurs>=listeParties[gameId].nbMinJoueurs){
      io.to(joueursConnectes[pseudo]).emit("gameLaunched");
      io.to(joueursConnectes[pseudo]).emit("showLaunch");
      if (Object.keys(listeParties[gameId].cartes).length === 0) {
        switch (listeParties[gameId].typeJeu) {
          case "1":
            listeParties[gameId].cartes = shuffle(listeParties[gameId].listeJoueurs);
            break;
          case "2":
            listeParties[gameId].cartes = shuffleBoeuf(listeParties[gameId].listeJoueurs);
            io.to(gameId).emit("reste",listeParties[gameId].cartes["reste"]);
            break;
          case "3":
            listeParties[gameId].cartes["plateau"] = shuffleSet();
            io.to(gameId).emit("plateau", listeParties[gameId].cartes["plateau"]);
            break;
          default:
            break;
        }
      } else {
        if (listeParties[gameId].typeJeu == 2) {
          console.log("la liste" + listeParties[gameId].cartes);
          io.to(gameId).emit("reste",listeParties[gameId].cartes["reste"]);
          io.to(gameId).emit("scorePlayer",listeParties[gameId].playersScores);
        }
      }
      io.to(gameId).emit("cardsChanged");
      let nbCartes = {};
      for (const [key, value] of Object.entries(listeParties[gameId].cartes)) {
        nbCartes[key] = value.length;
      }
      io.to(gameId).emit("nbCartes",nbCartes);
      if (listeParties[gameId].typeJeu != 3) {
        startTimer(gameId);
      }
      listeParties[gameId].status=1;
    } else {
      socket.emit("notEnoughPlayers");
    }
  });

  socket.on("set", (cartesJouees, idJoueur, gameId) => {
    let continuer = true;
    if (isSet(cartesJouees)) {
      // ajouter les points
      listeParties[gameId].playersScores[idJoueur] += 3;
      socket.emit("foundSet");
      // Supprimer les cartes du plateau
      cartesJouees.forEach(carte => {
        const index = listeParties[gameId].cartes["plateau"].findIndex(c => isEqual(c, carte));
        if (index !== -1) {
          listeParties[gameId].cartes["plateau"].splice(index, 1);
        }
      });
      continuer = completerPlateau(gameId);
    } else {
      // retirer les points si points > 0
      if (listeParties[gameId].playersScores[idJoueur] > 0) {
        listeParties[gameId].playersScores[idJoueur] -= 3;
      }
      socket.emit("notFoundSet");
    }
    if (continuer) {
      socket.emit("unselectAll");
      io.to(gameId).emit("scorePlayer",listeParties[gameId].playersScores);
    }
  });

  //---------------------------------------------------------------------
  // Fonctions génériques
  
  function pauseGame(gameId) {
    if (listeParties[gameId].status==1){
      listeParties[gameId].gameIsPaused = true;
      socket.emit("gameEnPause");
    } else {
      socket.emit("pauseGameNotStarted");
    }
  }
  
  function unpauseGame(gameId) {
    listeParties[gameId].gameIsPaused = false;
    socket.emit("gameReprise");
  }
  
  function defCode() {
    //fonction pour définir un code de partie unique
    let code = Math.floor(Math.random() * 9000)+1000;
    while (code in listeParties) {
      if (code>=9999){
        code=1000;;
      }else {
        code++;
      }
    }
    return code;
  }
  
  async function rejoindrePartie(idJoueur, idRoom) {
    //fonction pour que le joueur idJoueur rejoigne la partie idRoom, sous forme de fonction car utilisée plusieurs fois dans le code
    //cette fonction est asynchrone car socket.join est une opération asynchrone
    //renvoie un signal au client si la partie n'existe pas
    let idRoomInt = parseInt(idRoom);
    if (idRoomInt in listeParties) {
      if (listeParties[idRoomInt].status==0){
        if (listeParties[idRoomInt].nbJoueurs == listeParties[idRoomInt].nbMaxJoueurs) {
          socket.emit("roomComplete");
        } else {
          if (!listeParties[idRoomInt].listeJoueurs.includes(idJoueur)) {
            listeParties[idRoomInt].nbJoueurs += 1;
            listeParties[idRoomInt].listeJoueurs.push(idJoueur);
          }
          if (!listeParties[idRoomInt].partieACharger) {
            listeParties[idRoomInt].playersScores[idJoueur] = 0;
          }
          //listeParties[idRoomInt].socketsJoueurs[idJoueur] = socket.id;
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
  
  async function creerPartie(codepartie, type, nbMinJoueurs, nbMaxJoueurs, idCreateur, cartes,dureeTour) {
    //fonction de création de partie, sous forme de fonction car utilisée plusieurs fois dans le code
    //cette fonction est asynchrone car socket.join est une opération asynchrone
    if (nbMinJoueurs>nbMaxJoueurs || nbMinJoueurs>10 || nbMaxJoueurs>10){
      nbMinJoueurs=2;
      nbMaxJoueurs=10;
    }
    listeParties[codepartie] = new partie(type, idCreateur, nbMinJoueurs, nbMaxJoueurs, 1, [idCreateur],0,0,cartes,dureeTour);
    listeParties[codepartie].playersScores[idCreateur] = 0;
    //listeParties[codepartie].socketsJoueurs[idCreateur] = socket.id;
    await socket.join(codepartie.toString());
    console.log("partie " + codepartie + " créée");
    socket.emit("goToGame", codepartie.toString(), listeParties[codepartie].typeJeu, () => {
      socket.emit("setGameId", codepartie.toString());
      socket.emit("playersList", listeParties[codepartie].listeJoueurs);
      io.to(joueursConnectes[idCreateur]).emit("showLaunch");
    });
  }
  
  function doQuery(query, args) {
    return new Promise((resolve, reject) => {
      connexiondb.query(query, args, function(err, res) {
        if (err) {
          reject(err.stack);
        } else {
          resolve(res);
        }
      });
    });
  }
  
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
  
  function startSecondTimer(gameId, playerList, cardsToWin){
    listeParties[gameId].secondTimer = listeParties[gameId].dureeTour;
     let secondTimer = setInterval(()=>{
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
  
  //---------------------------------------------------------------------
  // Fonctions pour la bataille
  
  function shuffle(playerList){
    //mélange les cartes de tous les joueurs de la playerList
    let cardListe = [];
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
    let max = playerList.length;
    let i = 0;
    let cartes = {};
    playerList.forEach(player => {
      cartes[player] = [];
    });
  
    cardListe.forEach(card => {
      cartes[playerList[i]].push(card);
      i = (i+1)%max;
    });
    return cartes;
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
      let allCards = bataille[gameId].concat(cardsToWin);
      console.log(cardsToWin);
      console.log(allCards);
      allCards.forEach(player => {
        listeParties[gameId].cartes[winner].push(player[1]);
        console.log(winner + " a obtenu la carte " + player[1] + " du joueur "+ player[0]);
      })
      io.to(gameId).emit("fight",winner, allCards);
      bataille[gameId] = [];
      io.to(gameId).emit("cardsChanged");
      let nbCartes = {};
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
        score(winner);
        delete listeParties[gameId];
        io.to(gameId).emit("victory",winner);
      } else {
        startTimer(gameId);
      }
    }
  }
  
  //---------------------------------------------------------------------
  // Fonctions pour le 6 qui prend
  
  function shuffleBoeuf(playerList){
    let cartes = {}
    let cards = []
    for(let i=1;i<=104;i++){
      cards.push(i);
    }
    playerList.forEach((elem) => 
      {cartes[elem] = [];
        while(cartes[elem].length <10){
        let indexMax = cards.length-1;
        let selectedIndex = Math.floor(Math.random()*indexMax);
        cartes[elem].push(cards[selectedIndex]);
        cards.splice(selectedIndex,1);
      }
      cartes["reste"] = []
      for(let i=0;i<4;i++){
        let indexMax = cards.length-1;
        let selectedIndex = Math.floor(Math.random()*indexMax);
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
  
  async function finPartieBoeuf(gameId, vainqueurs, min) {
    for (let joueur of listeParties[gameId].listeJoueurs) {
      try {
        await doQuery("UPDATE scoresboeuf SET scoreTotal=scoreTotal+?, nbPartiesJouees=nbPartiesJouees+1 WHERE joueur=?;",[listeParties[gameId].playersScores[joueur], joueur]);
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
    delete listeParties[gameId];
    io.to(gameId).emit("victory",vainqueurs,min);
  }
  
  function finMancheBoeuf(gameId){
    let max=0;
    let min;
    let vainqueurs=[];
    let val;
    for (let cle in listeParties[gameId].playersScores){
      val=listeParties[gameId].playersScores[cle];
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
      finPartieBoeuf(gameId, vainqueurs, min);
      return true;
    }
    return false;
  }
  
  function tourBoeuf(gameId) {
    console.log(gameOrderBoeuf);
    let pierre = false;
    gameOrderBoeuf[gameId].every((joueur) => {
      let idJoueur = joueur[0];
      let carte = joueur[1];
      console.log("carte du joueur " + idJoueur + " : " + carte);
      let min = listeParties[gameId].cartes["reste"][0][listeParties[gameId].cartes["reste"][0].length-1];
      let ligneMin = 0;
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
        if (joueursConnectes[idJoueur] !== "") {
          io.to(joueursConnectes[idJoueur]).emit("choixLigne");
          io.to(gameId).emit("playerIsChoosing", idJoueur);
        }
        pierre = true;
        return false;
      }
      if(listeParties[gameId].cartes["reste"][ligneMin].length == 5 || min > carte){
        while(listeParties[gameId].cartes["reste"][ligneMin].length >0){
          listeParties[gameId].playersScores[idJoueur] += nbTetes(listeParties[gameId].cartes["reste"][ligneMin].pop());
      }
      }
      io.to(gameId).emit("cardsChanged");
      var nbCartes = {};
      for (const [key, value] of Object.entries(listeParties[gameId].cartes)) {
        nbCartes[key] = value.length;
      }
      listeParties[gameId].cartes["reste"][ligneMin].push(carte);
      io.to(gameId).emit("reste", listeParties[gameId].cartes["reste"]);
      return true;
    });
    if (!pierre && !finMancheBoeuf(gameId)) {
      io.to(gameId).emit("scorePlayer",listeParties[gameId].playersScores);
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

  //---------------------------------------------------------------------
  // Fonctions pour le SET

  function isEqual(carte1, carte2) {
    for (const key in carte1) {
      if (carte1[key] !== carte2[key]) {
        return false;
      }
    }
    return true;
  }

  function allSame(arr) {
    return arr.every(v => v === arr[0]);
  }

  function allDifferent(arr) {
    return new Set(arr).size === arr.length;
  }

  function isSet(cartes) {
    // cartes : liste de dict, avec chacun couleur, forme, nombre et remplissage
    for (let prop in cartes[0]) {
      let values = cartes.map(card => card[prop]);
      if (!(allSame(values) || allDifferent(values))) {
        return false;
      }
    }
    return true;
  }

  function isThereSet(plateau) {
    const n = plateau.length;
    // Parcourir chaque combinaison possible de trois cartes dans le plateau
    for (let i = 0; i < n - 2; i++) {
      for (let j = i + 1; j < n - 1; j++) {
        for (let k = j + 1; k < n; k++) {
          // Vérifier si les trois cartes forment un set
          if (isSet([plateau[i], plateau[j], plateau[k]])) {
            // Si un set est trouvé, retourner true
            return true;
          }
        }
      }
    }
    // Si aucun set n'est trouvé, retourner false
    return false;
  }

  function shuffleSet(){
    // remplissage de la variable globale du jeu avec les 81 cartes uniques
    for (const couleur of couleurs) {
      for (const forme of formes) {
        for (const nombre of nombres) {
          for (const remplissage of remplissages) {
            jeuDeSet.push({ couleur, forme, nombre, remplissage });
          }
        }
      }
    }
    const listeDeCartes = [];
    // construction du plateau de base, 3 lignes de 4 cartes
    for (let i = 0; i < 12; i++) {
      const index = Math.floor(Math.random() * jeuDeSet.length);
      listeDeCartes.push(jeuDeSet[index]);
      jeuDeSet.splice(index, 1);
    }
    // si il n'y a pas de set dans le plateau, rajouter une ligne
    if (!isThereSet(listeDeCartes)) {
      for (let j = 0; j < 3; j++) {
        const index = Math.floor(Math.random() * jeuDeSet.length);
        listeDeCartes.push(jeuDeSet[index]);
        jeuDeSet.splice(index, 1);
      }
    }
    return listeDeCartes;
  }

  function completerPlateau(gameId) {
    console.log(jeuDeSet.length);
    if (jeuDeSet.length > 0) {
      // rajouter des cartes seulement s'il y en a moins de 12 (pour ne pas en rajouter lorsqu'il y avait une ligne en plus)
      if (listeParties[gameId].cartes["plateau"].length < 12) {
        for (let i = 0; i < 3; i++) {
          const index = Math.floor(Math.random() * jeuDeSet.length);
          listeParties[gameId].cartes["plateau"].push(jeuDeSet[index]);
          jeuDeSet.splice(index, 1);
        }
      }
      // si il n'y a pas de set dans le plateau, rajouter une ligne
      if (!isThereSet(listeParties[gameId].cartes["plateau"])) {
        for (let j = 0; j < 3; j++) {
          const index = Math.floor(Math.random() * jeuDeSet.length);
          listeParties[gameId].cartes["plateau"].push(jeuDeSet[index]);
          jeuDeSet.splice(index, 1);
        }
      }
      io.to(gameId).emit("plateau", listeParties[gameId].cartes["plateau"]);
    } else {
      // si les 81 cartes ont été épuisées, regardez s'il existe un set, si non alors fin
      if (!isThereSet(listeParties[gameId].cartes["plateau"])) {
        let vainqueur;
        let maxPoints = 0;
        for (const joueur in listeParties[gameId].playersScores) {
          if (listeParties[gameId].playersScores[joueur] > maxPoints) {
            maxPoints = listeParties[gameId].playersScores[joueur];
            vainqueur = joueur; // a réparer
          }
        }
        console.log("suppression de la partie");
        delete listeParties[gameId];
        io.to(gameId).emit("victory", vainqueur, maxPoints);
        return false;
      } else {
        io.to(gameId).emit("plateau", listeParties[gameId].cartes["plateau"]);
      }
    }
    return true;
  }

  function getIndice(gameId) {
    let plateau = listeParties[gameId].cartes["plateau"];
    let set;
    const n = plateau.length;
    // Parcourir chaque combinaison possible de trois cartes dans le plateau
    for (let i = 0; i < n - 2; i++) {
      for (let j = i + 1; j < n - 1; j++) {
        for (let k = j + 1; k < n; k++) {
          // Vérifier si les trois cartes forment un set
          if (isSet([plateau[i], plateau[j], plateau[k]])) {
            set = [plateau[i], plateau[j], plateau[k]];
            return set;
          }
        }
      }
    }
    return null;
  }

  socket.on("getIndice", (gameId) => {
    socket.emit("indice", getIndice(gameId));
  });

});


//lien entre les clients React et le serveur
server.listen(3001, () => {
  console.log("Server is listening on port 3001");
});