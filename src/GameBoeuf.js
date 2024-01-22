import { useEffect, useState } from "react";
import { socket } from "./socket.js";

var playerGameId = "";

function Abandon() {
}

function Sauvegarde(){
}


function Player() {
}
  

function PlayerList() {
}


function Carte({CardNumber}) {

    let teteNb;

    if (CardNumber === 55) {
        teteNb = 7;
    } else if (CardNumber % 10 === 0) {
        teteNb = 3;
    } else if (CardNumber % 5 === 0) {
        teteNb = 2;
    } else {
        teteNb = 1;
    }
    if(CardNumber%11==0 && CardNumber!=55){
        teteNb+=4;
    }

    var tetes = [];
    for (var i = 0; i < teteNb; i++) {
        tetes.push(<div className="tete_boeuf" key={i}/>);
    }

    return (
        <button className="carte_boeuf">
            <div className="carte" data-tetes={teteNb}>
                <div className="carteTop">
                    <p className="CardNumber">{CardNumber}</p>
                    <div className="tetes">{tetes}</div>
                    <p className="CardNumber">{CardNumber}</p>
                </div>
                <p className="CardNumber_Center">{CardNumber}</p>
                <div className="carteBot">
                    <p className="CardNumber">{CardNumber}</p>
                    <p className="CardNumber">{CardNumber}</p>
                </div>
            </div>
            <div className="overlay"></div>
        </button>
    );
}

function Main() {
}

function Plateau(){
}

function GameBoeuf(){
    return (
        <>
            <Carte CardNumber={11}></Carte>
            <Carte CardNumber={1}></Carte>
            <Carte CardNumber={10}></Carte>
            <Carte CardNumber={5}></Carte>
            <Carte CardNumber={55}></Carte>
        </>
    )
}

export default GameBoeuf;