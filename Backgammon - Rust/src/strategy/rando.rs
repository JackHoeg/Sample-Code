use rand::Rng;

use crate::{
    player_board::PlayerStrat,
    r#mod::NUM_CHECKERS,
    r#move::Move,
    turn_tree::TurnNode,
};

/// Random Player
#[derive(Clone)]
pub struct Rando;

impl PlayerStrat for Rando {
    fn choose_turn(&self, _player_pos: &[u8; NUM_CHECKERS], _opp_frq: &Vec<u8>, _turns: &mut Vec<Box<TurnNode>>) -> Vec<Move> {
        if _turns.is_empty() { return vec!(); }
        let mut moves: Vec<Move> = Vec::with_capacity(_turns[0].get_max_depth() as usize);
        self.push_random_recur(_turns, &mut moves);
        moves
    }
}

impl Rando {
    fn push_random_recur(&self, _nodes: &mut Vec<Box<TurnNode>>, moves: &mut Vec<Move>) {
        let mut rng = rand::thread_rng();
        let rand_ind = rng.gen_range(0.._nodes.len());
        _nodes[rand_ind].set_score(1);
        moves.push(_nodes[rand_ind].get_move().clone());
        if _nodes[rand_ind].get_max_depth() > 1 {
            self.push_random_recur(_nodes[rand_ind].get_mut_branches(), moves);
        }
    }
}