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

class parties{
  constructor(typeJeu, idCreateur, nbMinJoueurs, nbMaxJoueurs,code) {
    this.typeJeu=typeJeu;
    this.idCreateur=idCreateur;
    this.nbMinJoueurs=nbMinJoueurs;
    this.nbMaxJoueurs=nbMaxJoueurs;
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

/* connexiondb.query("INSERT INTO jeux (nomJeu) VALUES ('bataille ouverte')", function(err, result){
  if (err) {
    console.error('error on query: ' + err.stack);
    return;
  }
}); */

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
    listeParties[codepartie]=new parties(type,idCreateur,nbMinJoueurs,nbMaxJoueurs);
    console.log("partie créée "+ Object.keys(listeParties).length + " ; " + (listeParties[codepartie]).nbMaxJoueurs);

    socket.emit('codePartieCree', codepartie);
    socket.join(codepartie.toString());
    
    /*connexiondb.query("INSERT INTO parties (typeJeu, nbMinJoueurs, nbMaxJoueurs, idCreateur) VALUES ('" + type + "','" + nbMinJoueurs + "','" + nbMaxJoueurs +"','" +idCreateur + "')", function(err, result) {
      if (err) {
        console.error('error on query: ' + err.stack);
        return;
      } else {
        console.log("partie crée avec succès");
      }
  })
  connexiondb.query("SELECT MAX(idGame) AS maxId FROM parties WHERE idCreateur='" + idCreateur + "'", function(err, result) {
    if (err) {
      console.error('error on query: ' + err.stack);
      return;
    } else{
      console.log(result[0].maxId);
    }
  
  socket.emit('codePartieCree', result[0].maxId)
}) */


});

});
server.listen(3001, () => {
  console.log("SERVER IS RUNNING");
});