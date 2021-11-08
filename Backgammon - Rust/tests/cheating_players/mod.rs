use backgammon_lib::local_remote::{IPlayer, LocalPlayer};
use backgammon_lib::board::Board;
use backgammon_lib::player::{PlayerName, PlayerColor};
use backgammon_lib::strategy::rando::Rando;
use backgammon_lib::r#move::Move;

#[derive(Clone)]
pub enum CheatOn {
    Name,
    Start,
    Turn,
    End,
}

/// used to make sure communication ends with cheating players
pub struct PanickyCheater {}

impl IPlayer for PanickyCheater {
    fn get_turn(&mut self, _board: &Board, _dice: &Vec<u8>) -> Vec<Move> {
        panic!("get_turn called on PanickyCheater!");
    }

    fn get_name(&mut self) -> PlayerName {
        panic!("get_name called on PanickyCheater!");
    }

    fn validate_turn(&mut self, _board: &Board, _dice: &Vec<u8>, _moves: &Vec<Move>) -> bool {
        panic!("validate_turn called on PanickyCheater!");
    }

    fn start_game(&mut self, _color: PlayerColor, _opp_name: String) -> bool {
        panic!("start_game called on PanickyCheater!");
    }

    fn end_game(&mut self, _board: &Board, _won: bool) -> bool {
        panic!("end_game called on PanickyCheater!");
    }

    fn has_cheated(&self) -> bool {
        true
    }

    fn get_color(&self) -> PlayerColor {
        todo!()
    }

    fn duplicate(&self) -> Box<dyn IPlayer> {
        Box::new(PanickyCheater {})
    }
}

pub struct CheatStep {
    player: Box<dyn IPlayer>,
    current_step: u8,
    target_step: u8,
    cheat_on: CheatOn,
}

impl IPlayer for CheatStep {
    fn get_turn(&mut self, board: &Board, dice: &Vec<u8>) -> Vec<Move> {
        if matches!(self.cheat_on, CheatOn::Turn) {
            if self.current_step >= self.target_step {
                self.player = Box::new(PanickyCheater {});
                return vec!();
            }
            self.current_step += 1;
        }
        self.player.get_turn(board, dice)
    }

    fn get_name(&mut self) -> PlayerName {
        if matches!(self.cheat_on, CheatOn::Name) {
            if self.current_step >= self.target_step {
                let name = self.player.get_name();
                self.player = Box::new(PanickyCheater {});
                return name;
            }
            self.current_step += 1;
        }
        self.player.get_name()
    }

    fn validate_turn(&mut self, board: &Board, dice: &Vec<u8>, moves: &Vec<Move>) -> bool {
        self.player.validate_turn(board, dice, moves)
    }

    fn start_game(&mut self, color: PlayerColor, opp_name: String) -> bool {
        if matches!(self.cheat_on, CheatOn::Start) {
            if self.current_step >= self.target_step {
                self.player = Box::new(PanickyCheater {});
                return false;
            }
            self.current_step += 1;
        }
        self.player.start_game(color, opp_name)
    }

    fn end_game(&mut self, board: &Board, won: bool) -> bool {
        if matches!(self.cheat_on, CheatOn::End) {
            if self.current_step >= self.target_step {
                self.player = Box::new(PanickyCheater {});
                return false;
            }
            self.current_step += 1;
        }
        self.player.end_game(board, won)
    }

    fn has_cheated(&self) -> bool {
        return self.current_step >= self.target_step || self.player.has_cheated();
    }

    fn get_color(&self) -> PlayerColor {
        self.player.get_color()
    }

    fn duplicate(&self) -> Box<dyn IPlayer> {
        Box::new(CheatStep { player: self.player.duplicate(),
            current_step: self.current_step.clone(),
            target_step: self.target_step.clone(),
            cheat_on: self.cheat_on.clone(), })
    }
}

impl CheatStep {
    pub fn new(p: Box<dyn IPlayer>, target: u8, cheat_when: CheatOn) -> CheatStep {
        CheatStep {
            player: p,
            current_step: 0,
            target_step: target,
            cheat_on: cheat_when,
        }
    }

    pub fn local(target: u8, cheat_when: CheatOn) -> CheatStep {
        CheatStep {
            player: Box::new(LocalPlayer::new("pre-cheat".to_string(), Rando)),
            current_step: 0,
            target_step: target,
            cheat_on: cheat_when,
        }
    }
}