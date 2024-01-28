import "./Style/app.css";
import { useEffect } from "react";
import { socket } from "./socket.js";

function Chat({ gameId }){

    function sendMessage(){
        socket.emit('mess', document.getElementById('messages').value, sessionStorage.getItem("sessId"), gameId);
        document.getElementById("messages").value = "";
    }

    useEffect(()=> {
        socket.on('messagerie', data => {
            let messagerie = document.getElementById('messageAffiche');
            let message = document.createElement('p');
            message.innerText = data;
            console.log(message);
            messagerie.appendChild(message);
            
        });
        return() => {
            socket.off("messagerie");
        }
    });
    return(
        <div className="Chat">
            <div id='messageAffiche'></div>
            <div className="messageSender">
                <p><label>Entrez votre message : </label></p>
                <textarea id="messages" name="messages" placeholder="Entrez un message à envoyer"></textarea>
                <button onClick={sendMessage}>Envoyer message</button>
            </div>
        </div>
    )
}

export default Chat;