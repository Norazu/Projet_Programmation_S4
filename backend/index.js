const express = require("express")
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
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
    connexiondb.query("INSERT INTO parties (typeJeu, nbMinJoueurs, nbMaxJoueurs, idCreateur) VALUES ('" + type + "','" + nbMinJoueurs + "','" + nbMaxJoueurs +"','" +idCreateur + "')", function(err, result) {
      if (err) {
        console.error('error on query: ' + err.stack);
        return;
      }
  })
  connexiondb.query("SELECT MAX(idGame) FROM parties WHERE idCreateur='" + idCreateur+"'", function(err, result) {
    if (err) {
      console.error('error on query: ' + err.stack);
      return;
    }
  
  socket.emit('codePartieCree', result)
})

});

});
server.listen(3001, () => {
  console.log("SERVER IS RUNNING");
});