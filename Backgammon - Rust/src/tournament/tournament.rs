use serde::{Deserialize, Deserializer, Serialize};
use serde_json::Value;

use crate::{
    net_config::NetConfig,
    tournament::{
        round_robin::RoundRobin,
        single_elim::SingleElim,
    },
    local_remote::{IPlayer, RemotePlayer},
};
use std::net::TcpListener;

#[derive(Debug)]
pub struct TournConfig {
    players: u64,
    port: Value,
    ev_type: TType,
}

impl TournConfig {
    pub fn new(players: u64, port: Value, ev_type: TType) -> TournConfig {
        TournConfig {
            players,
            port,
            ev_type,
        }
    }

    pub fn to_tournament(&self) -> Box<dyn Tournament> {
        let listener = NetConfig::connect_listener(self.port.clone()).unwrap();
        match self.ev_type {
            TType::SingleElim => Box::new(SingleElim::new(self.players as usize, listener)),
            TType::RndRbn => Box::new(RoundRobin::new(self.players as usize, listener))
        }
    }
}

#[derive(Serialize, Debug)]
pub enum TType {
    RndRbn,
    SingleElim,
}

impl<'de> Deserialize<'de> for TType {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
        where
            D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?.to_lowercase();
        let state = match s.as_str() {
            "round robin" => TType::RndRbn,
            "single elimination" => TType::SingleElim,
            other => {
                panic!("Invalid tournament type {}", other);
            }
        };
        Ok(state)
    }
}

pub trait Tournament {
    fn moderate_tournament(&mut self);
    fn report_winner(&mut self) -> Value;
}

pub fn accept_players(players: &mut Vec<Box<dyn IPlayer>>, count: &usize, listener: &TcpListener) {
    for _ in 0..*count {
        match listener.accept() {
            Ok((socket, _)) => players.push(Box::new(RemotePlayer::new(socket))),
            Err(_) => panic!("failed to connect")
        };
    }
}