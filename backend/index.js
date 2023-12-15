const express = require("express")
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mysql = require("mysql");
const jsSHA = require("jssha");

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
})


app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("connexion", (nom, mdp) => {
    
  });

  socket.on("newAccount", (nom,mdp) =>{
    
  })
  socket.on('mess',data => {
    io.emit('messagerie',data); 
  });

  socket.on('creationPartie', (type,nbMinJoueurs,nbMaxJoueurs,idCreateur)=>{
    codepartie=defCode();
    listeParties[codepartie]=new parties(type,idCreateur,nbMinJoueurs,nbMaxJoueurs,1);
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
  })

});

server.listen(3001, () => {
  console.log("SERVER IS RUNNING");
});