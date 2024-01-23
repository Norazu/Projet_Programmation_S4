import "./Style/app.css";
import { useEffect } from "react";
import { socket } from "./socket.js";

function Chat(){
    function sendMessage(){
        socket.emit('mess',document.getElementById('messages').value,sessionStorage.getItem("sessId"));
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
            <div id='messageAffiche'></div>
            <div className="messageSender">
                <p><label>Entrez votre message : </label></p>
                <textarea id="messages" name="messages" placeholder="Entrez un message à envoyer"></textarea>
                <button type = "button" onClick={sendMessage}> Envoyer message</button>
            </div>
        </div>
        )
    }
export default Chat;
