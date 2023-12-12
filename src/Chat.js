import "./App.css";
import io from "socket.io-client";
import { useEffect, useState } from "react";

const socket = io.connect("http://localhost:3001");

function Chat(){
    function sendMessage(){
        let message = document.getElementById('messages').value;
        socket.emit('mess',message);
     }
     socket.on('messagerie', data => {
        var messagerie = document.getElementById('messageAffiche');
        var message = document.createElement('p');
        message.innerText = data;
        messagerie.appendChild(message);
     })
    return(
    <div className="Chat">
    <h2>Messagerie</h2>
        <p><label for="messages">Entrez votre message : </label></p>
        <textarea id="messages" name="messages" rows="4" cols="50" placeholder="Entrez un message à envoyer"></textarea>
        <button type = "button" onclick={sendMessage}> Envoyer message</button>
        <div id='messageAffiche'></div>
        </div>
        )
    }
export default Chat;