const express = require("express")
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { time } = require("console");

app.use(cors());

const server = http.createServer(app);

var playersList = [["player1",10],["player2",5]];
var cartes = {"001":["2_of_clubs","5_of_hearts","jack_of_spades"]};

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
    startTimer(10);
  });
});

server.listen(3001, () => {
  console.log("SERVER IS RUNNING");
});