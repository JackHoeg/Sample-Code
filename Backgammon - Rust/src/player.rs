use serde::{
    de::{Deserializer, Error},
    Deserialize,
    Serialize,
};

use crate::{
    board::Board,
    player_board::{PlayerBoard, PlayerStrat},
    r#move::Move,
};

#[derive(Debug)]
pub struct PlayerError {
    details: String,
}

impl PlayerError {
    fn new(msg: &str) -> PlayerError {
        PlayerError { details: msg.to_string() }
    }

    pub fn to_string(&self) -> String {
        self.details.clone()
    }
}

#[derive(Clone)]
pub struct Player<S: PlayerStrat> {
    p_name: PlayerName,
    color: PlayerColor,
    is_playing: bool,
    strategy: S,
}

impl<S: PlayerStrat> Player<S> {
    pub fn new(name: String, strategy: S) -> Player<S> {
        Player {
            p_name: PlayerName { name },
            color: PlayerColor::Black,
            is_playing: false,
            strategy,
        }
    }

    #[inline]
    pub fn name(&self) -> &String { &self.p_name.name }

    #[inline]
    pub fn color(&self) -> PlayerColor {
        self.color.clone()
    }

    pub fn start_game(&mut self, color: PlayerColor, _opponent_name: String) -> Result<(), PlayerError> {
        if self.is_playing {
            // panic!("player is already in a game");
            Err(PlayerError::new("Player is already in a game."))
        } else {
            self.is_playing = true;
            self.color = color;
            Ok(())
        }
    }

    pub fn get_turn(&self, board: &Board, dice: &Vec<u8>) -> Vec<Move> {
        let pl_board = PlayerBoard::new(&self.color, board, &self.strategy);
        pl_board.pick_turn(&dice)
    }

    pub fn validate_turn(&self, board: &Board, dice: &Vec<u8>, moves: &Vec<Move>) -> bool {
        debug_assert!(self.is_playing, "must start game to know what color to validate");
        let pl_board = PlayerBoard::new(&self.color, board, &self.strategy);
        pl_board.validate_turn(&dice, &moves)
    }

    pub fn end_game(&mut self, _won: bool) {
        if !self.is_playing {
            // panic? return error through result?
        } else {
            self.is_playing = false;
        }
    }

    #[inline]
    pub fn get_name(&self) -> &PlayerName {
        &self.p_name
    }

    pub fn assign_name(&mut self, name: PlayerName) {
        self.p_name = name;
    }
}

#[derive(Serialize, Clone, Debug)]
pub enum PlayerColor {
    Black,
    White,
}

impl<'de> Deserialize<'de> for PlayerColor {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
        where
            D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?.to_lowercase();
        let state = match s.as_str() {
            "black" => PlayerColor::Black,
            "white" => PlayerColor::White,
            other => {
                return Err(Error::custom(format!("Invalid player name '{}'", other)));
            }
        };
        Ok(state)
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PlayerName {
    name: String,
}

impl PlayerName {
    pub fn to_string(&self) -> String {
        self.name.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::strategy::rando::Rando;

    #[test]
    fn assgn_name() {
        let mut pl = Player::new("before".to_string(), Rando);
        assert_eq!(pl.p_name.to_string(), "before".to_string());
        pl.assign_name(PlayerName { name: "after".to_string() });
        assert_eq!(pl.p_name.to_string(), "after".to_string());
    }

    #[test]
    fn start_end() {
        let mut pl = Player::new("before".to_string(), Rando);
        pl.start_game(PlayerColor::Black, "opp".to_string()).ok();
        assert!(matches!(pl.color(), PlayerColor::Black));
        assert!(pl.is_playing);
        pl.end_game(false);
        assert!(matches!(pl.color(), PlayerColor::Black));
        assert!(!pl.is_playing);
        pl.start_game(PlayerColor::White, "opp".to_string()).ok();
        assert!(matches!(pl.color(), PlayerColor::White));
        assert!(pl.is_playing);
        pl.end_game(false);
        assert!(matches!(pl.color(), PlayerColor::White));
        assert!(!pl.is_playing);
    }

    #[test]
    fn double_start() {
        let mut pl = Player::new("before".to_string(), Rando);
        pl.start_game(PlayerColor::Black, "opp".to_string()).ok();
        assert!(pl.start_game(PlayerColor::White, "enmy".to_string()).is_err());
        assert!(matches!(pl.color(), PlayerColor::Black));
        assert!(pl.is_playing);
        pl.end_game(true);
        assert!(!pl.is_playing);
        assert!(pl.start_game(PlayerColor::White, "opp".to_string()).is_ok());
        assert!(matches!(pl.color(), PlayerColor::White));
        assert!(pl.is_playing);
    }

    #[test]
    #[should_panic]
    fn validate_outside_of_match() {
        let mut pl = Player::new("before".to_string(), Rando);
        pl.start_game(PlayerColor::Black, "opp".to_string()).ok();
        let board = Board::new();
        let turn = pl.get_turn(&board, &vec![3, 4]);
        pl.end_game(true);
        pl.validate_turn(&board, &vec![3, 4], &turn);
    }

    #[test]
    fn validate_cheater() {
        let mut pl = Player::new("before".to_string(), Rando);
        pl.start_game(PlayerColor::Black, "opp".to_string()).ok();
        let board = Board::new();
        let turn = pl.get_turn(&board, &vec![3, 4]);
        assert!(pl.validate_turn(&board, &vec![3, 4], &turn));
        pl.end_game(true);
        pl.start_game(PlayerColor::White, "opp".to_string()).ok();
        assert!(!pl.validate_turn(&board, &vec![3, 4], &turn));
    }
}