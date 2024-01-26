import { useEffect, useState } from "react";
import { socket } from "./socket.js";

function Row({ row }) {
    return (
        <li className="table-row">
            <div className="col col-1" data-label="Pseudo">{row[0]}</div>
            <div className="col col-2" data-label="Score moyen">{row[2] !== 0 ? row[1]/row[2] : 0}</div>
            <div className="col col-3" data-label="Winrate">{row[2] !== 0 ? row[3]/row[2] : 0}</div>
        </li>
    );
}

function Score() {
    const [leaderboard, setLeaderboard] = useState();

    useEffect(() => {
        socket.on("returnLeaderboard", liste => {
            setLeaderboard(liste);
            console.log(liste);
        });
        return () => {
            socket.off("returnLeaderboard");
        };
    });
    return (
        <div className="container">
            <h2>Leaderboard</h2>
            <ul className="responsive-table">
                <li className="table-header">
                    <div className="col col-1">Pseudo</div>
                    <div className="col col-2">Score moyen</div>
                    <div className="col col-3">Winrate</div>
                </li>
                {leaderboard.map((joueur) => (
                    <Row key={joueur[0]} row={joueur}/>
                ))}
            </ul>
        </div>
    );
}

export default Score;