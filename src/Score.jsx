import { useEffect, useState } from "react";
import { socket } from "./Socket.jsx";

function Row({ row }) {
    return (
        <li className="table-row">
            <div className="col col-1" data-label="Pseudo">{row[0]}</div>
            <div className="col col-2" data-label="Score moyen">{row[2] !== 0 ? row[1]/row[2] : 0}</div>
            <div className="col col-3" data-label="Winrate">{row[2] !== 0 ? row[3]/row[2] : 0}</div>
        </li>
    );
}

function Score({ hide, retour}) {
    const [leaderboard, setLeaderboard] = useState();
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    function getLeaderboard() {
        socket.emit("getLeaderboard");
    }

    function cacherLeaderboard() {
        setShowLeaderboard(false);
        retour();
    }

    useEffect(() => {
        socket.on("returnLeaderboard", liste => {
            setLeaderboard(liste);
            console.log(leaderboard);
            setShowLeaderboard(true);
            hide();
        });
        return () => {
            socket.off("returnLeaderboard");
        };
    });
    return (
        <>
        {showLeaderboard ? (
            <>
            <div className="retour" onClick={cacherLeaderboard}>
                <span className="back"></span>
                <a href="/#">Retour</a>
                <span></span>
            </div>
            <div className="container">
                <h2 id="boardTitle">Leaderboard</h2>
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
            </>
        ) : (
            <div className="leaderboard" onClick={getLeaderboard}>
                <span className="crown"></span>
                <a href="/#">Leaderboard</a>
                <span></span>
            </div>
        )}
        </>
    );
}

export default Score;