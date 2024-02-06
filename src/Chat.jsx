import "./Style/app.css";
import { useEffect } from "react";
import { socket } from "./Socket.jsx";

function Chat({ gameId }){

    function sendMessage(){
        let message = document.getElementsByClassName('messages')[0].value;
        if (message !== "") {
            socket.emit('mess', message, sessionStorage.getItem("sessId"), gameId);
        }
        document.getElementsByClassName("messages")[0].value = "";
    }

    function handleKeyDown(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
      }

    useEffect(()=> {
        socket.on('messagerie', data => {
            let messagerie = document.getElementsByClassName('messageAffiche')[0];
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
            <div className='messageAffiche'></div>
            <div className="messageSender">
                <p><label>Entrez votre message : </label></p>
                <input className="messages" name="messages" placeholder="Entrez un message à envoyer" onKeyDown={handleKeyDown}></input>
                <button onClick={sendMessage}>Envoyer message</button>
            </div>
        </div>
    )
}

export default Chat;