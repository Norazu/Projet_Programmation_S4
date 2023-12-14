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
});

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

  socket.on("connexion", (nom,mdp) => {
    const shaObj = new jsSHA("SHA-256", "TEXT", { encoding : "UTF8" });
    shaObj.update(mdp.mdp);
    const hashMDP = shaObj.getHash("HEX");
    connexiondb.query("SELECT idJoueur,pseudo FROM joueurs WHERE pseudo='" + nom.nom + "' AND hashMDP='" + hashMDP + "'", function(err, result) {
      if (err) {
        console.error('error on query: ' + err.stack);
        return;
      }
      if (result.length == 0) {
        socket.emit("userNotRegistered");
      } else {
        console.log(`user connected ${nom.nom}, ${hashMDP}`);
      }
    });
  });

  socket.on("newAccount", (nom,mdp) =>{
    var exists = false;
    connexiondb.query("SELECT idJoueur,pseudo FROM joueurs WHERE pseudo='" + nom.nom + "'", function(err, result) {
      if (err) {
        console.error('error on query: ' + err.stack);
        return;
      }
      if (result == []) {
        socket.emit("userAlreadyRegistered");
      } else {
        connexiondb.query("SELECT pseudo FROM joueurs", function(err, result) {
          if (err) {
            console.error('error on query: ' + err.stack);
            return;
          } else {
            for (var row of result) {
              if (nom.nom === row.pseudo) {
                exists = true;
                socket.emit("userAlreadyRegistered");
              }
            }
          }
        });
        if (!exists){
          const shaObj = new jsSHA("SHA-256", "TEXT", { encoding : "UTF8" });
          shaObj.update(mdp.mdp);
          const hashMDP = shaObj.getHash("HEX");
          connexiondb.query("INSERT INTO joueurs (pseudo, hashMDP) VALUES ('"+ nom.nom + "','" + hashMDP + "')", function(err, result) {
            if (err) {
              console.error('error on insertion: ' + err.stack);
              return;
            } else {
              console.log(`account created : ${nom.nom}, ${hashMDP}`)
            }
          });
        }
      }
    });
  });
});

server.listen(3001, () => {
  console.log("SERVER IS RUNNING");
});