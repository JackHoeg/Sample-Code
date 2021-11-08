use rand::Rng;

use crate::{
    player_board::PlayerStrat,
    r#mod::{HOME, NUM_CHECKERS},
    r#move::Move,
    turn_tree::TurnNode,
};

/// Bop-happy Player
#[derive(Clone)]
pub struct Bopsy;

impl PlayerStrat for Bopsy {
    fn choose_turn(&self, _player_pos: &[u8; NUM_CHECKERS], _opp_frq: &Vec<u8>, _turns: &mut Vec<Box<TurnNode>>) -> Vec<Move> {
        if _turns.is_empty() { return vec!(); }
        let mut max_score = 0;
        for node in _turns.iter_mut() {
            let score = self.score_tree(&_opp_frq, node, &0);
            if score > max_score {
                max_score = score;
            }
        }
        let mut moves: Vec<Move> = Vec::with_capacity(_turns[0].get_max_depth() as usize);
        self.select_moves(&_turns, &mut moves);
        moves
    }
}

impl Bopsy {
    fn score_tree(&self, _opp_frq: &Vec<u8>, _node: &mut TurnNode, bopped: &u32) -> usize {
        let mut score: usize = 0;
        let mut max_child: usize = 0;
        let new_bopped: u32;
        let mve = _node.get_move();
        score += (mve.end - mve.start) as usize;
        if mve.end == HOME {
            score += 10;
            new_bopped = *bopped;
        } else if _opp_frq[mve.end as usize] == 1 {
            let been_bopped = 0x1 << mve.end;
            if *bopped & been_bopped == 0 {
                new_bopped = *bopped | been_bopped;
                score += (HOME - mve.end) as usize;
            } else {
                new_bopped = *bopped;
            }
        } else {
            new_bopped = *bopped;
        }
        for child in _node.get_mut_branches().iter_mut() {
            let child_score = self.score_tree(_opp_frq, child, &new_bopped);
            if child_score > max_child { max_child = child_score; }
        }
        score += max_child;
        _node.set_score(score);
        score
    }

    fn select_moves(&self, turns: &Vec<Box<TurnNode>>, moves: &mut Vec<Move>) {
        let mut max_score: usize = 0;
        let mut num_max: u8 = 0;
        for node in turns.iter() {
            let scr = *node.get_score();
            if scr > max_score {
                max_score = scr;
                num_max = 1;
            } else if scr == max_score {
                num_max += 1;
            }
        }
        num_max = if num_max > 1 {
            let mut rng = rand::thread_rng();
            rng.gen_range(0..num_max)
        } else {
            0
        };

        for node in turns.iter() {
            if node.get_score() == &max_score {
                if num_max == 0 {
                    moves.push(node.get_move().clone());
                    if node.get_max_depth() > 1 {
                        self.select_moves(node.get_branches(), moves);
                    }
                    break;
                } else { num_max -= 1; }
            }
        }
    }
}