use std::io::{self, Read};

use serde_json::Value;

use crate::{
    administrator::AdminConfig,
    board::Board,
    net_config::NetConfig,
    r#move::Move,
    tournament::tournament::{TournConfig, TType},
    r#mod::piece_val_to_u8,
};

pub fn read_in_json() -> Result<Value, serde_json::Error> {
    //! gather input from STDIN
    let mut input_str = String::new();
    io::stdin().read_to_string(&mut input_str).ok();
    let json = serde_json::from_str(&input_str);
    json
}

#[inline]
pub fn get_board(json_arr: &Value) -> Board {
    //! deserializes value into board
    serde_json::from_value::<Board>(json_arr.clone()).unwrap()
}

#[inline]
pub fn get_net_config(json_obj: &Value) -> NetConfig {
    serde_json::from_value::<NetConfig>(json_obj.clone()).unwrap()
}

#[inline]
pub fn get_admin_config(json_obj: &Value) -> AdminConfig {
    serde_json::from_value::<AdminConfig>(json_obj.clone()).unwrap()
}

pub fn get_tournament_config(json_obj: &Value) -> TournConfig {
    let map = json_obj.as_object().unwrap();
    let players = map["players"].clone().as_u64().unwrap();
    let port = map["port"].clone();
    let ev_type = serde_json::from_value::<TType>(map["type"].clone()).unwrap();
    TournConfig::new(players, port, ev_type)
}

pub fn get_moves(move_arr: &Vec<Value>) -> Vec<Move> {
    //! Deserializes values into Move
    let mut moves: Vec<Move> = Vec::new();
    for i in 0..move_arr.len() {
        if let Ok(x) = serde_json::from_value::<Move>(move_arr[i].clone()) {
            moves.push(x);
        }
    }
    moves
}

pub fn get_pos(json_val: &Value) -> u8 {
    piece_val_to_u8(json_val)
}
