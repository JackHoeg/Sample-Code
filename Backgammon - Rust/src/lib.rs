pub mod board;
pub mod r#move;
pub mod parser;
pub mod player;
mod player_board;
mod r#mod;
pub mod net_config;
pub mod network_player;
pub mod tcp_handler;
pub mod administrator;
pub mod local_remote;
mod turn_tree;
mod dice_tracker;

pub mod strategy {
    pub mod rando;
    pub mod bopsy;
    pub mod smarty;
}

pub mod tournament {
    pub mod tournament;
    mod round_robin;
    mod single_elim;
}
