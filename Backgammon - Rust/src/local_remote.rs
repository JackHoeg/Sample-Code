use std::net::TcpStream;

use serde::{Serialize, Serializer};
use serde::ser::SerializeStruct;
use serde_json::{json, Value};

use crate::{
    board::Board,
    network_player::TcpTurn,
    parser::get_moves,
    player::{Player, PlayerColor, PlayerName},
    player_board::PlayerStrat,
    r#move::Move,
    strategy::rando::Rando,
    tcp_handler::TcpHandler,
};

pub trait IPlayer {
    fn get_turn(&mut self, board: &Board, dice: &Vec<u8>) -> Vec<Move>;
    fn get_name(&mut self) -> PlayerName;
    fn validate_turn(&mut self, board: &Board, dice: &Vec<u8>, moves: &Vec<Move>) -> bool;
    fn start_game(&mut self, color: PlayerColor, opp_name: String) -> bool;
    fn end_game(&mut self, board: &Board, won: bool) -> bool;
    fn has_cheated(&self) -> bool;
    fn get_color(&self) -> PlayerColor;
    fn duplicate(&self) -> Box<dyn IPlayer>;
}

pub struct LocalPlayer<S: PlayerStrat> {
    player: Player<S>,
}

impl<S: PlayerStrat> IPlayer for LocalPlayer<S> {
    fn get_turn(&mut self, board: &Board, dice: &Vec<u8>) -> Vec<Move> {
        self.player.get_turn(&board, &dice)
    }

    fn get_name(&mut self) -> PlayerName { self.player.get_name().clone() }

    fn validate_turn(&mut self, _board: &Board, _dice: &Vec<u8>, _moves: &Vec<Move>) -> bool {
        true
    }

    fn start_game(&mut self, color: PlayerColor, opp_name: String) -> bool {
        if let Ok(_) = self.player.start_game(color, opp_name) {
            true
        } else { false }
    }

    fn end_game(&mut self, _board: &Board, won: bool) -> bool {
        self.player.end_game(won);
        true
    }

    fn has_cheated(&self) -> bool { false }

    fn get_color(&self) -> PlayerColor {
        self.player.color()
    }

    fn duplicate(&self) -> Box<dyn IPlayer> {
        Box::new(LocalPlayer { player: self.player.clone() })
    }
}

impl<S: PlayerStrat> LocalPlayer<S> {
    pub fn new(name: String, strategy: S) -> LocalPlayer<S> {
        LocalPlayer {
            player: Player::new(name, strategy)
        }
    }
}

pub struct RemotePlayer {
    player: Player<Rando>,
    stream: TcpHandler,
    cheated: bool,
    given_name: bool,
}

impl IPlayer for RemotePlayer {
    fn get_turn(&mut self, board: &Board, dice: &Vec<u8>) -> Vec<Move> {
        self.stream.write(&TakeTurn::get_message(&board, &dice));
        let response = self.stream.read_line();
        if let Ok(x) = serde_json::from_value::<TcpTurn>(response) {
            return get_moves(&x.turn);
        }
        self.cheated = true;
        vec!()
    }

    fn get_name(&mut self) -> PlayerName {
        if self.given_name {
            return self.player.get_name().clone();
        }
        self.stream.write(&json!("name"));
        let response = self.stream.read_line();
        if let Ok(x) = serde_json::from_value::<PlayerName>(response) {
            self.player.assign_name(x.clone());
            return x;
        }
        self.cheated = true;
        return self.player.get_name().clone();
    }

    fn validate_turn(&mut self, board: &Board, dice: &Vec<u8>, moves: &Vec<Move>) -> bool {
        if self.cheated == false {
            self.cheated = !self.player.validate_turn(&board, &dice, &moves);
        }
        !self.cheated
    }

    fn start_game(&mut self, color: PlayerColor, opp_name: String) -> bool {
        self.player.start_game(color.clone(), opp_name.clone()).ok();
        self.stream.write(&StartGame::get_message(color, opp_name));
        self.get_okay()
    }

    fn end_game(&mut self, board: &Board, won: bool) -> bool {
        self.player.end_game(won);
        self.stream.write(&EndGame::get_message(board, won));
        self.get_okay()
    }

    fn has_cheated(&self) -> bool { self.cheated }

    fn get_color(&self) -> PlayerColor {
        self.player.color()
    }

    fn duplicate(&self) -> Box<dyn IPlayer> {
        Box::new(RemotePlayer {
            player: self.player.clone(),
            stream: self.stream.clone(),
            cheated: self.cheated.clone(),
            given_name: self.given_name.clone(),
        })
    }
}

impl RemotePlayer {
    pub fn new(socket: TcpStream) -> RemotePlayer {
        RemotePlayer {
            player: Player::new("remote".to_string(), Rando),
            stream: TcpHandler::new(socket),
            cheated: false,
            given_name: false,
        }
    }

    fn get_okay(&mut self) -> bool {
        let response = self.stream.read_line();
        if response.is_string() {
            self.cheated = response.as_str().unwrap() != "okay" || self.cheated;
            return !self.cheated;
        }
        self.cheated = true;
        false
    }
}

struct StartGame {
    start_game: Vec<Value>,
}

impl StartGame {
    pub fn get_message(color: PlayerColor, opp_name: String) -> Value {
        let color_string = match color {
            PlayerColor::Black => "black".to_string(),
            PlayerColor::White => "white".to_string(),
        };
        let mut vec_string: Vec<Value> = Vec::with_capacity(2);
        vec_string.push(json!(color_string));
        vec_string.push(json!(opp_name));
        let sg = StartGame { start_game: vec_string };
        json!(sg)
    }
}

impl Serialize for StartGame {
    fn serialize<S>(&self, serializer: S) -> Result<<S as Serializer>::Ok, <S as Serializer>::Error> where
        S: Serializer {
        let mut state = serializer.serialize_struct("StartGame", 1)?;
        state.serialize_field("start-game", &self.start_game)?;
        state.end()
    }
}

struct TakeTurn {
    take_turn: Vec<Value>,
}

impl TakeTurn {
    pub fn get_message(board: &Board, dice: &Vec<u8>) -> Value {
        let mut vec_val: Vec<Value> = Vec::with_capacity(2);
        vec_val.push(json!(board));
        vec_val.push(json!(dice));
        let tt = TakeTurn { take_turn: vec_val };
        json!(tt)
    }
}

impl Serialize for TakeTurn {
    fn serialize<S>(&self, serializer: S) -> Result<<S as Serializer>::Ok, <S as Serializer>::Error> where
        S: Serializer {
        let mut state = serializer.serialize_struct("TakeTurn", 1)?;
        state.serialize_field("take-turn", &self.take_turn)?;
        state.end()
    }
}

struct EndGame {
    end_game: Value,
}

impl EndGame {
    fn get_message(board: &Board, won: bool) -> Value {
        json!(EndGame {end_game: json!([json!(board), json!(won)])})
    }
}

impl Serialize for EndGame {
    fn serialize<S>(&self, serializer: S) -> Result<<S as Serializer>::Ok, <S as Serializer>::Error> where
        S: Serializer {
        let mut state = serializer.serialize_struct("EndGame", 1)?;
        state.serialize_field("end-game", &self.end_game)?;
        state.end()
    }
}