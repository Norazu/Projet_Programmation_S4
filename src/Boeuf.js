import { Abandon, Sauvegarde, PlayerList, Timer, Plateau, Main } from "./Game.js";


function Boeuf(){
    return (
        <div className="Game">
            <Abandon/>
            <Sauvegarde/>
            <PlayerList/>
            <Timer/>
            <Plateau/>
            <Main gameType={2}/>
        </div>
    )
}

export default Boeuf;