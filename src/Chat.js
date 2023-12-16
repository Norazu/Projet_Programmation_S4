import "./App.css";
import { useEffect, useState } from "react";
import { socket } from "./socket.js";

function Chat(){
    function sendMessage(){
        socket.emit('mess',document.getElementById('messages').value,localStorage.getItem("sessId"));
     }
    useEffect(()=> {
        socket.on('messagerie', data => {
            var messagerie = document.getElementById('messageAffiche');
            var message = document.createElement('p');
            message.innerText =data;
            console.log(message);
            messagerie.appendChild(message);
            
        });
        return() => {
            socket.off("messagerie").off();
        }
    });

     
    return(
    <div className="Chat">
    <h2>Messagerie</h2>
        <p><label>Entrez votre message : </label></p>
        <textarea id="messages" name="messages" rows="4" cols="50" placeholder="Entrez un message à envoyer"></textarea>
        <button type = "button" onClick={sendMessage}> Envoyer message</button>
        <div id='messageAffiche'></div>
        </div>
        )
    }
export default Chat;
