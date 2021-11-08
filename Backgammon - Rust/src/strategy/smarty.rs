use rand::Rng;

use crate::{
    player_board::PlayerStrat,
    r#mod::{HOME, NUM_CHECKERS, move_checker},
    r#move::Move,
    turn_tree::TurnNode,
};

/// Smart Player
#[derive(Clone)]
pub struct Smarty;

impl PlayerStrat for Smarty {
    fn choose_turn(&self, _player_pos: &[u8; NUM_CHECKERS], _opp_frq: &Vec<u8>, _turns: &mut Vec<Box<TurnNode>>) -> Vec<Move> {
        if _turns.is_empty() { return vec!(); }
        let mut max_score = 0;
        for node in _turns.iter_mut() {
            let score = self.score_tree_root(&_player_pos, &_opp_frq, node);
            if score > max_score {
                max_score = score;
            }
        }
        let mut moves: Vec<Move> = Vec::with_capacity(_turns[0].get_max_depth() as usize);
        self.select_moves(&_turns, &mut moves);
        moves
    }
}

impl Smarty {
    fn score_tree_root(&self, player_pos: &[u8; NUM_CHECKERS], opp_frq: &Vec<u8>, node: &mut TurnNode) -> usize {
        //! scores tree knowing that the player is in their initial position
        if !self.enemy_overlap(player_pos, opp_frq) {
            self.score_no_overlap(player_pos, player_pos, opp_frq, node)
        } else {
            self.score_tree(player_pos, player_pos, opp_frq, node, &0)
        }
    }

    fn score_tree(&self, orig_pos: &[u8; NUM_CHECKERS], cur_player_pos: &[u8; NUM_CHECKERS], opp_frq: &Vec<u8>, node: &mut TurnNode, bopped: &u32) -> usize {
        let mut score: usize = 0;

        let mve = node.get_move();
        let mut new_pos = cur_player_pos.clone();
        move_checker(&mut new_pos, &mve.start, &mve.end);

        let mut new_bopped = bopped.clone();
        score += self.score_bop(opp_frq, &mve.end, &mut new_bopped);
        score += self.score_risky_home(&new_pos, &mve);

        if node.num_node_branches() == 0 {
            score += self.score_leaf(&orig_pos, &new_pos, opp_frq, node);
        } else {
            let mut max_child: usize = 0;
            let is_safe: bool = self.enemy_overlap(&new_pos, opp_frq);
            for child in node.get_mut_branches().iter_mut() {
                let child_score = if is_safe {
                    self.score_no_overlap(&orig_pos, &new_pos, opp_frq, child)
                } else {
                    self.score_tree(&orig_pos, &new_pos, opp_frq, child, &new_bopped)
                };
                if child_score > max_child { max_child = child_score; }
            }
            score += max_child
        }
        node.set_score(score);
        score
    }

    fn score_leaf(&self, orig_pos: &[u8; NUM_CHECKERS], cur_player_pos: &[u8; NUM_CHECKERS], opp_frq: &Vec<u8>, _node: &mut TurnNode) -> usize {
        let mut score: usize = 10_000; //allows subtraction without fear of overflow

        let original_freqs: [u8; HOME as usize + 1] = pos_to_freqs(orig_pos);
        let new_freqs: [u8; HOME as usize + 1] = pos_to_freqs(cur_player_pos);

        for i in 0..HOME as usize +1 {
            if original_freqs[i] == 1 {
                if new_freqs[i] > 1 {
                    score += (new_freqs[i] - original_freqs[i]) as usize * 100;
                } else {
                    score += 20;
                }
            } else if original_freqs[i] > 3 && new_freqs[i] < original_freqs[i] {
                score += (original_freqs[i] - new_freqs[i]) as usize * 90;
            }

            if new_freqs[i] == 1 {
                let mut can_be_bopped_soon = false;
                for j in i+1..HOME as usize + 1 {
                    if opp_frq[j] != 0 {
                        can_be_bopped_soon = true;
                        break;
                    }
                }
                if can_be_bopped_soon {
                    score -= 100;
                } else {
                    score -= 25;
                }
            }

            if new_freqs[i] > 3 && original_freqs[i] <= 3 {
                score -= 75;
            }
        }

        return score;

        fn pos_to_freqs(pieces: &[u8; NUM_CHECKERS]) -> [u8; HOME as usize + 1] {
            //! tallies number of checkers at each position
            let mut frequencies: [u8; HOME as usize + 1] =  [0; HOME as usize + 1];
            for piece in pieces {
                frequencies[*piece as usize] += 1;
            }
            frequencies
        }
    }

    #[inline]
    fn score_bop(&self, opp_frq: &Vec<u8>, end: &u8, bopped: &mut u32) -> usize {
        if end != &HOME && opp_frq[*end as usize] == 1 {
            let been_bopped = 0x1 << *end;
            if *bopped & been_bopped == 0 {
                *bopped |= been_bopped;
                return (&HOME - end) as usize * 10;
            }
        }
        0
    }

    #[inline]
    fn score_risky_home(&self, pos: &[u8; NUM_CHECKERS], mve: &Move) -> usize {
        let mut score = 0;
        if mve.end == HOME {
            let mut num_start_ind = 0;
            for p in pos.iter() {
                if p == &mve.start {
                    num_start_ind += 1;
                }
            }
            if num_start_ind == 2 {
                score += 75;
            } else {
                score += 200;
            }
        }
        score
    }

    fn score_no_overlap(&self, orig_pos: &[u8; NUM_CHECKERS], player_pos: &[u8; NUM_CHECKERS], opp_frq: &Vec<u8>, node: &mut TurnNode) -> usize {
        //! since there will never be an opportunity to bop or be bopped,
        //! the furthest piece from HOME will always be moved unless a piece can moved to HOME
        let mut score: usize = 0;

        let mve = node.get_move();
        if mve.end == HOME {
            score += 200;
        }
        if mve.start == player_pos[0] {
            score += 100;
        }

        let mut new_pos = player_pos.clone();
        move_checker(&mut new_pos, &mve.start, &mve.end);
        if node.num_node_branches() == 0 {
            score += self.score_leaf(&orig_pos,&new_pos, opp_frq, node);
        } else {
            let mut max_child: usize = 0;
            for child in node.get_mut_branches().iter_mut() {
                let child_score = self.score_no_overlap(orig_pos, &new_pos,  opp_frq, child);
                if child_score > max_child { max_child = child_score; }
            }
            score += max_child;
        }
        node.set_score(score);
        score
    }

    fn enemy_overlap(&self, player_pos: &[u8; NUM_CHECKERS], opp_frq: &Vec<u8>) -> bool {
        //! returns true if it is possible for a blot to be bopped in current or future turn
        for i in (player_pos[0] + 1) as usize..HOME as usize {
            if opp_frq[i] > 0 { return true; }
        }
        return opp_frq[0] != 0;
    }

    fn select_moves(&self, turns: &Vec<Box<TurnNode>>, moves: &mut Vec<Move>) {
        //! selects the turn with the highest score
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