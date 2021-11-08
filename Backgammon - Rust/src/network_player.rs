use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::{
    player::{Player, PlayerColor},
    tcp_handler::TcpHandler,
};
use crate::board::Board;
use crate::player_board::PlayerStrat;

pub struct NetworkPlayer<S: PlayerStrat> {
    player: Player<S>,
    stream: TcpHandler,
}

impl<S: PlayerStrat> NetworkPlayer<S> {
    pub fn new(player: Player<S>, stream: TcpHandler) -> NetworkPlayer<S> {
        NetworkPlayer { player, stream }
    }

    pub fn handle_stream(&mut self) -> Result<(), serde_json::Error> {
        //! handle all input from stream
        loop {
            let new_val = self.stream.read_line();
            if new_val.is_null() { break; }
            let out_val;
            if new_val.is_string() {
                out_val = self.process_json_str(new_val).unwrap();
            } else {
                out_val = self.process_json_obj(new_val).unwrap();
            }
            self.stream.write(&out_val);
        }

        Ok(())
    }

    fn process_json_str(&mut self, json: serde_json::Value) -> Result<Value, serde_json::Error> {
        if json.as_str().unwrap() == "name" {
            Ok(json!(self.player.get_name()))
        } else {
            Ok(json!("error reading json input"))
        }
    }

    fn process_json_obj(&mut self, json: serde_json::Value) -> Result<Value, serde_json::Error> {
        // here we determine what kind of input came from server
        // and which function to process it with
        // start-game, take-turn, or end-game
        let map = json.as_object().unwrap();
        if map.contains_key("start-game") {
            let color = serde_json::from_value::<PlayerColor>(map["start-game"][0].clone())?;
            let opp_name = serde_json::from_value::<String>(map["start-game"][1].clone())?;
            return Ok(self.start_game(color, opp_name));
        } else if map.contains_key("take-turn") {
            let board = serde_json::from_value::<Board>(map["take-turn"][0].clone())?;
            let dice = serde_json::from_value::<Vec<u8>>(map["take-turn"][1].clone())?;
            return Ok(self.take_turn(board, dice));
        } else if map.contains_key("end-game") {
            let board = serde_json::from_value::<Board>(map["end-game"][0].clone())?;
            let won = serde_json::from_value::<bool>(map["end-game"][1].clone())?;
            return Ok(self.end_game(board, won));
        } else {
            return Ok(json!("error reading json input".to_string()));
        }
    }

    fn start_game(&mut self, color: PlayerColor, opponent_name: String) -> Value {
        let result = match self.player.start_game(color, opponent_name) {
            Ok(()) => json!("okay"),
            Err(e) => json!(e.to_string()),
        };
        result
    }

    fn take_turn(&mut self, board: Board, dice: Vec<u8>) -> serde_json::Value {
        let turn = self.player.get_turn(&board, &dice);
        let mut output = Vec::new();
        for mve in turn {
            output.push(mve.to_json());
        }
        serde_json::json!( TcpTurn{turn: output} )
    }

    fn end_game(&mut self, _board: Board, won: bool) -> Value {
        self.player.end_game(won);
        json!("okay")
    }
}

/// mirrors format for sending turn
#[derive(Deserialize, Serialize)]
pub struct TcpTurn {
    pub turn: Vec<Value>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use crate::strategy::rando::Rando;

    #[test]
    fn recv_name() {
        let nam = json!("name");
        let valid = nam.as_str().unwrap() == "name";
        assert!(valid);
    }

    #[test]
    #[should_panic]
    fn recv_bad_name() {
        let pl = Player::new("trial".to_string(), Rando);
        let nam = json!(pl.get_name());
        let valid = nam.as_str().unwrap() == "name";
        assert!(!valid);
    }
}