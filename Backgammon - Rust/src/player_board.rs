use std::fmt;

use crate::{
    board::Board,
    dice_tracker::DiceTracker,
    player::PlayerColor,
    r#mod::{BAR, HOME, move_checker, NUM_CHECKERS},
    r#move::Move,
    turn_tree::TurnNode,
};

pub const HOME_EDGE: u8 = 19;

/**
Stores checker positions in a local coordinate system
where the player's checkers always move from 0->25.
Simplifies game logic by making rules identical for both players
*/
pub struct PlayerBoard<'a, S: PlayerStrat> {
    opponent_frq: Vec<u8>,
    strategy: &'a S,
    player_pos: [u8; NUM_CHECKERS],
    is_flipped: bool,
}

impl<S: PlayerStrat> PlayerBoard<'_, S> {
    pub fn new<'a>(color: &PlayerColor, board: &Board, strat: &'a S) -> PlayerBoard<'a, S> {
        let mut stack_pos: [u8; NUM_CHECKERS];
        match &color {
            PlayerColor::Black => {
                stack_pos = board.black.clone();
                invert_pos(&mut stack_pos);
                let opp_frq = pos_to_inv_freqs(&board.white);

                PlayerBoard {
                    player_pos: stack_pos,
                    opponent_frq: opp_frq,
                    is_flipped: true,
                    strategy: strat,
                }
            }
            PlayerColor::White => {
                stack_pos = board.white.clone();
                PlayerBoard {
                    player_pos: stack_pos,
                    opponent_frq: pos_to_freqs(&board.black),
                    is_flipped: false,
                    strategy: strat,
                }
            }
        }
    }

    pub fn generate_valid_turns(&self, dice: &Vec<u8>) -> Vec<Box<TurnNode>> {
        let mut turns = self.generate_potential_turns(&dice);
        if self.is_flipped {
            for node in turns.iter_mut() { node.flip_tree(); }
        }
        turns
    }

    pub fn pick_turn(&self, dice: &Vec<u8>) -> Vec<Move> {
        let mut turns = self.generate_potential_turns(&dice);
        let mut moves = self.strategy.choose_turn(&self.player_pos, &self.opponent_frq, &mut turns);
        if self.is_flipped {
            for mve in moves.iter_mut() {
                *mve = flip_move(mve);
            }
        }
        moves
    }

    pub fn validate_turn(&self, dice: &Vec<u8>, moves: &Vec<Move>) -> bool {
        //!returns true if moves constitute a valid turn
        let turn_options = self.generate_valid_turns(dice);
        if turn_options.is_empty() {
            return moves.is_empty();
        } else if turn_options[0].get_max_depth() != moves.len() as u8 { return false; }
        return validate_move_recur(&turn_options, &moves, 0);
    }

    fn generate_potential_turns(&self, dice: &Vec<u8>) -> Vec<Box<TurnNode>> {
        let mut potential_turn_set: Vec<Box<TurnNode>> = self.get_potential_moves(&self.player_pos, &DiceTracker::new(&dice), &dice);

        if potential_turn_set.is_empty() {
            return vec!();
        }

        let mut max_depth = 0;
        for turn in potential_turn_set.iter_mut() {
            self.gen_turn_tree(&self.player_pos, turn, &dice);
            let depth = turn.compute_depth();
            if depth > max_depth {
                max_depth = depth;
            }
        }

        potential_turn_set.retain(|turn| turn.get_max_depth() == max_depth);

        for node in potential_turn_set.iter_mut() {
            // remove turns that don't make best use of dice
            node.prune(&max_depth);
        }
        potential_turn_set
    }

    fn gen_turn_tree(&self, pos: &[u8; NUM_CHECKERS], node: &mut TurnNode, dice: &Vec<u8>) {
        if node.get_dice_tracker().is_empty() {
            return;
        }
        let mut new_pos = pos.clone();
        let new_mve = node.get_move();
        move_checker(&mut new_pos,
                     &new_mve.start,
                     &new_mve.end);

        let mut next_potential_move = self.get_potential_moves(&new_pos, node.get_dice_tracker(), &dice);
        if next_potential_move.is_empty() {
            return;
        }

        for turn in next_potential_move.iter_mut() {
            self.gen_turn_tree(&new_pos, turn, &dice);
        }

        node.set_branches(next_potential_move);
    }

    fn get_potential_moves(&self, pos: &[u8; NUM_CHECKERS], tracker: &DiceTracker, dice: &Vec<u8>) -> Vec<Box<TurnNode>> {
        //! returns turn trees in local coordinates
        match in_home_phase(&pos) {
            true => self.legal_home_moves(pos, tracker, dice),
            false => match has_pieces_on_bar(&pos) {
                false => self.legal_moves(pos, tracker, dice),
                true => self.legal_bar_moves(tracker, dice),
            }
        }
    }

    fn legal_bar_moves(&self, tracker: &DiceTracker, dice: &Vec<u8>) -> Vec<Box<TurnNode>> {
        // returns local coordinates
        let num_loops = tracker.num_unique();
        let mut moves_at_bar: Vec<Box<TurnNode>> = Vec::with_capacity(num_loops);
        for i in 0..num_loops {
            let die_ind = tracker.get_die_ind(&i);
            if !(self.opponent_frq[dice[die_ind] as usize] > 1) {
                moves_at_bar.push(
                    Box::new(TurnNode::new(Move { start: BAR, end: dice[die_ind] }, tracker.use_die(&die_ind)))
                );
            }
        }
        moves_at_bar
    }

    fn legal_home_moves(&self, pos: &[u8; NUM_CHECKERS], tracker: &DiceTracker, dice: &Vec<u8>) -> Vec<Box<TurnNode>> {
        // returns local coordinates
        if tracker.is_empty() {
            return vec!();
        }
        // list of piece positions, and the potential moves
        // available to a piece at that position
        let mut moves: Vec<Box<TurnNode>> = Vec::with_capacity(pos.len());

        if &pos[0] == &HOME {
            return moves;
        }

        let mut largest_die = dice.iter().max().unwrap();
        let mut largest_i = dice.iter().position(|d| d == largest_die).unwrap();
        if !tracker.is_valid(largest_i) {
            largest_i ^= 0x1;
            largest_die = &dice[largest_i];
        }

        if &(HOME - largest_die) < &pos[0] {
            moves.push(
                Box::new(TurnNode::new(Move { start: pos[0], end: HOME }, tracker.use_die(&largest_i)))
            );
        }

        let num_loops: usize = tracker.num_unique();
        for i in 0..num_loops {
            let die_ind = tracker.get_die_ind(&i);
            //only pieces with an exact match can be sent home
            let mut prev_piece: u8 = HOME;
            for piece in pos {
                if piece == &prev_piece {
                    continue;
                }
                if &(HOME - dice[die_ind]) == piece {
                    moves.push(
                        Box::new(TurnNode::new(Move { start: *piece, end: HOME }, tracker.use_die(&die_ind)))
                    );
                } else if &(HOME - dice[die_ind]) > piece {
                    let end = piece + dice[die_ind];
                    if self.opponent_frq[end as usize] <= 1 {
                        moves.push(
                            Box::new(TurnNode::new(Move { start: *piece, end }, tracker.use_die(&die_ind)))
                        );
                    }
                } else if piece == &HOME {
                    break;
                }
                prev_piece = *piece;
            }
        }

        return moves;
    }

    fn legal_moves(&self, pos: &[u8; NUM_CHECKERS], tracker: &DiceTracker, dice: &Vec<u8>) -> Vec<Box<TurnNode>> {
        // returns local coordinates

        // list of piece positions, and the potential moves
        // avaialable to a piece at that position
        let mut moves: Vec<Box<TurnNode>> = Vec::with_capacity(pos.len());

        let num_loops: usize = tracker.num_unique();
        for i in 0..num_loops {
            let die_ind = tracker.get_die_ind(&i);
            let mut prev_piece = HOME;
            for piece in pos {
                if piece == &HOME {
                    break;
                } else if piece == &prev_piece {
                    continue;
                }
                let end = piece + dice[die_ind];
                if end < HOME && self.opponent_frq[end as usize] <= 1 {
                    moves.push(
                        Box::new(TurnNode::new(Move { start: *piece, end: end }, tracker.use_die(&die_ind)))
                    );
                }
                prev_piece = *piece;
            }
        }

        return moves;
    }
}

impl<S: PlayerStrat> fmt::Debug for PlayerBoard<'_, S> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("PlayerBoard")
            .field("opponent_freq", &self.opponent_frq)
            .field("player_pos", &self.player_pos)
            .field("is_flipped", &self.is_flipped)
            .finish()
    }
}

pub fn flip_move(mve: &Move) -> Move {
    //! converts between local and world coordinates
    let start = if mve.start == HOME || mve.start == BAR {
        mve.start
    } else {
        HOME - mve.start
    };

    let end = if mve.end == HOME || mve.end == BAR {
        mve.end
    } else {
        HOME - mve.end
    };

    Move { start, end }
}

fn invert_pos(pieces: &mut [u8; NUM_CHECKERS]) {
    //! returns local coordinates
    let mut last_bar = 0;
    let mut first_home = NUM_CHECKERS;
    for i in 0..NUM_CHECKERS {
        if pieces[i] == HOME {
            first_home = i;
            break;
        } else if pieces[i] == BAR {
            last_bar = i + 1;
        } else {
            pieces[i] = HOME - pieces[i];
        }
    }
    pieces[last_bar..first_home].reverse();
}

fn validate_move_recur(turn_options: &Vec<Box<TurnNode>>, moves: &Vec<Move>, index: usize) -> bool {
    if moves.len() == index { return true; }
    let mve = &moves[index];
    for node in turn_options.iter() {
        let node_move = node.get_move();
        if node_move.start == mve.start && node_move.end == mve.end {
            return validate_move_recur(&node.get_branches(), moves, index + 1);
        }
    }
    return false;
}

#[inline]
fn pos_to_freqs(pieces: &[u8; NUM_CHECKERS]) -> Vec<u8> {
    //! tallies number of checkers at each position
    let mut frequencies = vec![0; HOME as usize + 1];
    for piece in pieces {
        frequencies[*piece as usize] += 1;
    }
    frequencies
}

#[inline]
fn pos_to_inv_freqs(pieces: &[u8; NUM_CHECKERS]) -> Vec<u8> {
    //! tallies number of checkers at each inverted position
    let mut frequencies = vec![0; HOME as usize + 1];
    for piece in pieces {
        let new_val = if piece == &HOME || piece == &BAR {
            *piece
        } else {
            HOME - *piece
        };
        frequencies[new_val as usize] += 1;
    }
    frequencies
}

#[inline(always)]
fn in_home_phase(pos: &[u8; NUM_CHECKERS]) -> bool {
    unsafe { *pos.get_unchecked(0) >= HOME_EDGE }
}

#[inline(always)]
fn has_pieces_on_bar(pos: &[u8; NUM_CHECKERS]) -> bool {
    unsafe { *pos.get_unchecked(0) == BAR }
}

pub trait PlayerStrat: Clone + 'static {
    // 'static guarantees structs that impl PlayerStrat won't contain references
    /// Scores given trees, and returns vector of chosen moves
    /// NOTE: trees should only be modified through node.set_score()
    fn choose_turn(&self, _player_pos: &[u8; NUM_CHECKERS], _opp_frq: &Vec<u8>, _turns: &mut Vec<Box<TurnNode>>) -> Vec<Move>;
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::r#mod::{BAR, HOME};
    use crate::strategy::rando::Rando;

    const TEST_POSITIONS: [u8; NUM_CHECKERS] = [3, 3, 5, 5, 7, 8, 9, 11, 11, 12, 13, 13, 13, 13, 15];
    const HOME_POSITIONS: [u8; NUM_CHECKERS] = [19, 20, 20, 20, 21, 22, 22, 23, 23, 23, 23, 24, 24, 25, 25];

    #[test]
    fn in_home() {
        assert!(!in_home_phase(&TEST_POSITIONS));
        assert!(in_home_phase(&HOME_POSITIONS));
    }

    #[test]
    fn in_bar() {
        assert!(!has_pieces_on_bar(&TEST_POSITIONS));
        let mut pos = TEST_POSITIONS;
        pos[0] = BAR;
        assert!(has_pieces_on_bar(&pos));
    }

    #[test]
    fn test_freq() {
        let compare_vec: Vec<u8> = vec!(0, 0, 0, 2, 0, 2, 0, 1, 1, 1, 0, 2, 1, 4, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        let flipped_cmp: Vec<u8> = vec!(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 4, 1, 2, 0, 1, 1, 1, 0, 2, 0, 2, 0, 0, 0);
        assert_eq!(pos_to_freqs(&TEST_POSITIONS), compare_vec);
        assert_eq!(pos_to_inv_freqs(&TEST_POSITIONS), flipped_cmp);
    }

    #[test]
    fn flip_mve() {
        let mve1 = Move { start: 10, end: 15 };
        let mve2 = Move { start: 4, end: 24 };
        let mve3 = Move { start: BAR, end: 22 };
        let mve4 = Move { start: 5, end: HOME };
        assert_eq!(flip_move(&mve1), Move{start:15,end:10});
        assert_eq!(flip_move(&mve2), Move{start:21,end:1});
        assert_eq!(flip_move(&mve3), Move{start:BAR,end:3});
        assert_eq!(flip_move(&mve4), Move{start:20,end:HOME});
    }

    #[test]
    fn inv_pos() {
        let mut tst_pos = TEST_POSITIONS;
        let inv_tst: [u8; NUM_CHECKERS] = [10, 12, 12, 12, 12, 13, 14, 14, 16, 17, 18, 20, 20, 22, 22];
        invert_pos(&mut tst_pos);
        assert_eq!(tst_pos, inv_tst);

        let mut hme_pos = HOME_POSITIONS;
        let inv_hm: [u8; NUM_CHECKERS] = [1, 1, 2, 2, 2, 2, 3, 3, 4, 5, 5, 5, 6, 25, 25];
        invert_pos(&mut hme_pos);
        assert_eq!(hme_pos, inv_hm);
    }

    #[test]
    fn val_bar_no_move() {
        let board = Board {
            black: [BAR, BAR, 3, 6, 9, 9, 12, 12, 13, 13, 13, 23, 23, 24, 24],
            white: [5, 10, 11, 14, 14, 16, 16, 17, 18, 19, 20, 20, 21, 21, 22] };
        let dice: Vec<u8> = vec!(4, 5);
        let pl_board = PlayerBoard::new(&PlayerColor::Black, &board, &Rando);

        for t in pl_board.generate_valid_turns(&dice).iter() {
            println!("{:?}", t.get_move());
        }

        let real_moves: Vec<Move> = vec!();
        let fake_moves_1: Vec<Move> = vec!(Move{start: BAR, end: 21});
        let fake_moves_2: Vec<Move> = vec!(Move{start: BAR, end: 20});
        let fake_moves_3: Vec<Move> = vec!(Move{start: BAR, end: 21}, Move{start: BAR, end: 20});
        let fake_moves_4: Vec<Move> = vec!(Move{start: 13, end: 9});
        assert!(pl_board.validate_turn(&dice, &real_moves));
        assert!(!pl_board.validate_turn(&dice, &fake_moves_1));
        assert!(!pl_board.validate_turn(&dice, &fake_moves_2));
        assert!(!pl_board.validate_turn(&dice, &fake_moves_3));
        assert!(!pl_board.validate_turn(&dice, &fake_moves_4));
        assert!(pl_board.validate_turn(&dice, &real_moves));
    }

    #[test]
    fn val_bar_one_move() {
        let board = Board {
            black: [BAR, BAR, 3, 6, 16, 9, 12, 12, 13, 13, 13, 23, 23, 24, 24],
            white: [5, 10, 11, 14, 14, 16, 16, 17, 18, 19, 20, 21, 21, 21, 22] };
        let dice: Vec<u8> = vec!(4, 5);
        let pl_board = PlayerBoard::new(&PlayerColor::Black, &board, &Rando);

        println!("{:?}", pl_board.player_pos);

        let real_moves: Vec<Move> = vec!(Move{start: BAR, end: 20});
        let fake_moves_1: Vec<Move> = vec!(Move{start: BAR, end: 21});
        let fake_moves_2: Vec<Move> = vec!(Move{start: BAR, end: 21}, Move{start: BAR, end: 20});
        let fake_moves_3: Vec<Move> = vec!(Move{start: 13, end: 9});
        let fake_moves_4: Vec<Move> = vec!(Move{start: BAR, end: 20}, Move{start: BAR, end: 21});
        let fake_moves_5: Vec<Move> = vec!(Move{start: BAR, end: 20}, Move{start: 13, end: 9});
        assert!(pl_board.validate_turn(&dice, &real_moves));
        assert!(!pl_board.validate_turn(&dice, &fake_moves_1));
        assert!(!pl_board.validate_turn(&dice, &fake_moves_2));
        assert!(!pl_board.validate_turn(&dice, &fake_moves_3));
        assert!(!pl_board.validate_turn(&dice, &fake_moves_4));
        assert!(!pl_board.validate_turn(&dice, &fake_moves_5));
    }
}