use serde::Deserialize;
use serde_json::{Value};

use crate::{
    strategy::{
        bopsy::Bopsy,
        rando::Rando,
    },
    player::PlayerColor,
    board::Board,
    local_remote::{LocalPlayer, RemotePlayer, IPlayer},
    r#move::Move,
    r#mod::HOME,
    net_config::NetConfig
};
use rand::Rng;
use std::net::{TcpStream, TcpListener};

pub struct Administrator {
    white_player: Box<dyn IPlayer>,
    black_player: Box<dyn IPlayer>,
    current_board: Board,
    player_one_color: PlayerColor,
}

unsafe impl Send for Administrator {}

impl Administrator {
    pub fn new(player_one: Box<dyn IPlayer>, player_two: Box<dyn IPlayer>) -> Administrator {
        let mut rng = rand::thread_rng();
        let r1: u8 = rng.gen_range(0..2);

        let admin = if r1 == 0 {
            Administrator {
                white_player: player_one,
                black_player: player_two,
                current_board: Board::new(),
                player_one_color: PlayerColor::White,
            }
        } else {
            Administrator {
                white_player: player_two,
                black_player: player_one,
                current_board: Board::new(),
                player_one_color: PlayerColor::Black,
            }
        };
        admin
    }

    pub fn get_winning_player(&self) -> Option<Box<dyn IPlayer>> {
        match self.get_winner() {
            Winner::None => None,
            Winner::PlayerOne => {
                return match self.player_one_color {
                    PlayerColor::White => Some(self.white_player.duplicate()),
                    PlayerColor::Black => Some(self.black_player.duplicate()),
                }
            },
            Winner::PlayerTwo => {
                return match self.player_one_color {
                    PlayerColor::White => Some(self.black_player.duplicate()),
                    PlayerColor::Black => Some(self.white_player.duplicate()),
                }
            }
        }
    }

    pub fn get_players(&self) -> (Box<dyn IPlayer>, Box<dyn IPlayer>) {
        match self.player_one_color {
            PlayerColor::White => (self.white_player.duplicate(), self.black_player.duplicate()),
            PlayerColor::Black => (self.black_player.duplicate(), self.white_player.duplicate()),
        }
    }

    pub fn get_winner(&self) -> Winner {
        //first checks if anyone cheated
        return if self.black_player.has_cheated() {
            if self.white_player.has_cheated() {
                return Winner::None;
            }
            match self.player_one_color {
                PlayerColor::Black => Winner::PlayerTwo,
                PlayerColor::White => Winner::PlayerOne,
            }
        } else if self.white_player.has_cheated() {
            match self.player_one_color {
                PlayerColor::Black => Winner::PlayerOne,
                PlayerColor::White => Winner::PlayerTwo,
            }
        } else if is_over(&self.current_board) {
            debug_assert!(self.current_board.black[0] == HOME || self.current_board.white[0] == HOME,
                          "neither player won, but neither player cheated");
            debug_assert!(!(self.current_board.black[0] == HOME && self.current_board.white[0] == HOME),
                          "both players have all their pieces in home, this shouldn't be possible");
            //if no cheating occurred, a player must have all their pieces in HOME
            if self.current_board.black[0] == HOME {
                match self.player_one_color {
                    PlayerColor::Black => Winner::PlayerOne,
                    PlayerColor::White => Winner::PlayerTwo,
                }
            } else {
                match self.player_one_color {
                    PlayerColor::Black => Winner::PlayerTwo,
                    PlayerColor::White => Winner::PlayerOne,
                }
            }
        } else {
            panic!("no player cheated, no player won");
        }
    }

    pub fn moderate_game(&mut self, hc: HandleCheater) {
        match hc {
            HandleCheater::Replace => AdminReplace::moderate_game(&mut self.black_player, &mut self.white_player, &mut self.current_board),
            HandleCheater::EndGame => AdminEndGame::moderate_game(&mut self.black_player, &mut self.white_player, &mut self.current_board),
        }
    }
}

pub trait Admin {
    fn moderate_game(black_player: &mut Box<dyn IPlayer>, white_player: &mut Box<dyn IPlayer>, board: &mut Board);
    fn start_game(black_player: &mut Box<dyn IPlayer>, white_player: &mut Box<dyn IPlayer>);
    fn handle_turn(current_player: &mut Box<dyn IPlayer>, board: &Board) -> Vec<Move>;
}

pub struct AdminEndGame;

impl Admin for AdminEndGame {
    fn moderate_game(black_player: &mut Box<dyn IPlayer>, white_player: &mut Box<dyn IPlayer>, board: &mut Board) {
        let mut current_turn = decide_first();
        AdminEndGame::start_game(black_player, white_player);
        if black_player.has_cheated() {
            if white_player.has_cheated() {
                return;
            }
            white_player.end_game(&board, true);
            return;
        } else if white_player.has_cheated() {
            black_player.end_game(&board, true);
            return;
        }
        loop {
            let moves = match current_turn {
                PlayerColor::Black => AdminEndGame::handle_turn(black_player, board),
                PlayerColor::White => AdminEndGame::handle_turn(white_player, board),
            };
            if black_player.has_cheated() {
                white_player.end_game(&board, true);
                return;
            } else if white_player.has_cheated() {
                black_player.end_game(&board, true);
                return;
            }
            process_moves(board, &current_turn, moves);
            if is_over(board) {
                break;
            }
            current_turn = swap_turn(current_turn);
        }

        let white_win = matches!(current_turn, PlayerColor::White);
        white_player.end_game(&board, white_win);
        black_player.end_game(&board, !white_win);
    }

    fn start_game(black_player: &mut Box<dyn IPlayer>, white_player: &mut Box<dyn IPlayer>) {
        let black_name = black_player.get_name();
        let white_name = white_player.get_name();

        if black_player.has_cheated() || white_player.has_cheated() {
            return;
        }

        black_player.start_game(PlayerColor::Black, white_name.to_string());
        white_player.start_game(PlayerColor::White, black_name.to_string());
    }

    fn handle_turn(current_player: &mut Box<dyn IPlayer>, board: &Board) -> Vec<Move> {
        if current_player.has_cheated() {
            return vec!();
        }

        let dice = roll_dice();
        let moves = current_player.get_turn(board, &dice);

        if !current_player.has_cheated() {
            if current_player.validate_turn(&board, &dice, &moves) {
                return moves;
            }
        }

        vec!()
    }
}

pub struct AdminReplace;

impl Admin for AdminReplace {
    fn moderate_game(black_player: &mut Box<dyn IPlayer>, white_player: &mut Box<dyn IPlayer>, board: &mut Board) {
        let mut current_turn = decide_first();
        AdminReplace::start_game(black_player, white_player);
        AdminReplace::handle_cheater(black_player, white_player);
        loop {
            let moves = match current_turn {
                PlayerColor::Black => AdminReplace::handle_turn(black_player, board),
                PlayerColor::White => AdminReplace::handle_turn(white_player, board),
            };
            process_moves(board, &current_turn, moves);
            if is_over(board) {
                break;
            }
            current_turn = swap_turn(current_turn);
        }
        match current_turn {
            PlayerColor::White => {
                white_player.end_game(&board, true);
                black_player.end_game(&board, false);
            },
            PlayerColor::Black => {
                white_player.end_game(&board, false);
                black_player.end_game(&board, true);
            }
        };
        AdminReplace::handle_cheater(black_player, white_player);
    }

    fn start_game(black_player: &mut Box<dyn IPlayer>, white_player: &mut Box<dyn IPlayer>) {
        let mut black_name = black_player.get_name();
        let mut white_name = white_player.get_name();

        if black_player.has_cheated() {
            *black_player = replacement_player();
            black_name = black_player.get_name();
        }
        if white_player.has_cheated() {
            *white_player = replacement_player();
            white_name = white_player.get_name();
        }

        black_player.start_game(PlayerColor::Black, white_name.to_string());
        white_player.start_game(PlayerColor::White, black_name.to_string());
    }

    fn handle_turn(current_player: &mut Box<dyn IPlayer>, board: &Board) -> Vec<Move> {
        if current_player.has_cheated() {
            let col = current_player.get_color();
            *current_player = replacement_player();
            current_player.start_game(col, "opp".to_string());
        }

        let dice = roll_dice();
        let moves = current_player.get_turn(board, &dice);

        if !current_player.has_cheated() {
            if current_player.validate_turn(&board, &dice, &moves) {
                return moves;
            }
        }

        let col = current_player.get_color();
        *current_player = replacement_player();
        current_player.start_game(col, "opp".to_string());
        current_player.get_turn(board, &dice)
    }
}

impl AdminReplace {
    fn handle_cheater(black_player: &mut Box<dyn IPlayer>, white_player: &mut Box<dyn IPlayer>) {
        if black_player.has_cheated() {
            *black_player = replacement_player();
            black_player.start_game(PlayerColor::Black, white_player.get_name().to_string());
        }
        if white_player.has_cheated() {
            *white_player = replacement_player();
            white_player.start_game(PlayerColor::White, black_player.get_name().to_string());
        }
    }
}

fn roll_dice() -> Vec<u8> {
    let mut rng = rand::thread_rng();
    let r1: u8 = rng.gen_range(1..7);
    let r2: u8 = rng.gen_range(1..7);
    if r1 == r2 {
        vec!(r1, r1, r1, r1)
    } else {
        vec!(r1, r2)
    }
}

fn decide_first() -> PlayerColor {
    let mut dice = roll_dice();
    while dice.len() == 4 {
        dice = roll_dice();
    }
    if dice[0] < dice[1] {
        PlayerColor::Black
    } else {
        PlayerColor::White
    }
}

fn replacement_player() -> Box<dyn IPlayer> {
    Box::new(LocalPlayer::new("Malnati".to_string(), Rando))
}

fn swap_turn(turn: PlayerColor) -> PlayerColor {
    return match turn {
        PlayerColor::White => PlayerColor::Black,
        PlayerColor::Black => PlayerColor::White,
    }
}

fn process_moves(board: &mut Board, current_turn: &PlayerColor, moves: Vec<Move>) {
    for mve in moves.iter() {
        board.make_move(current_turn, mve)
    }
}

#[inline]
fn is_over(board: &Board) -> bool {
    board.black[0] == HOME || board.white[0] == HOME
}

#[derive(Deserialize)]
pub struct AdminConfig{
    local: Value,
    port: Value,
}

impl AdminConfig {
    pub fn to_administrator(&self, stream: TcpStream) -> Administrator {
        let player_two = Box::new(RemotePlayer::new(stream));
        let rand_ad = Administrator::new(
            Box::new(LocalPlayer::new("Lou".to_string(), Rando)),
            player_two.duplicate()
        );
        let bops_ad = Administrator::new(
            Box::new(LocalPlayer::new("Lou".to_string(), Bopsy)),
            player_two
        );
        match self.local.as_str().unwrap() {
            "Bopsy" => bops_ad,
            "Rando" => rand_ad,
            _ => panic!("failed to configure admin!"),
        }
    }

    pub fn get_listener(&self) -> TcpListener {
        NetConfig::connect_listener(self.port.clone()).unwrap()
    }
}

#[derive(PartialEq, Debug)]
pub enum Winner {
    PlayerOne,
    PlayerTwo,
    None,
}

pub enum HandleCheater {
    Replace,
    EndGame,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dice_rolls() {
        //! tests that dice are valid
        for _ in 0..1_000 {
            let dice = roll_dice();
            assert!(dice.len() == 2 || dice.len() == 4);
            for die in dice.iter() {
                assert!(die <= &6u8 && die != &0);
            }
            if dice.len() == 4 {
                assert_eq!(dice[0], dice[1]);
                assert_eq!(dice[0], dice[2]);
                assert_eq!(dice[0], dice[3]);
            } else {
                assert_ne!(dice[0], dice[1]);
            }
        }
    }

    #[test]
    fn decide() {
        //! tests that decide_first varies in output
        let first = decide_first();
        for _ in 0..1_000 {
            let second = decide_first();
            match first {
                PlayerColor::Black => {
                    if matches!(second, PlayerColor::White) { return; }
                },
                PlayerColor::White => {
                    if matches!(second, PlayerColor::Black) { return; }
                },
            }
        }
        panic!("always made same decision");
    }
}