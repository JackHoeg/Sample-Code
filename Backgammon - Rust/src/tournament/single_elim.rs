use serde_json::{json, Value};
use std::net::TcpListener;
use crossbeam::channel::bounded;

use crate::{
    administrator::{Administrator, HandleCheater},
    local_remote::{IPlayer, LocalPlayer},
    strategy::rando::Rando,
    tournament::tournament::{Tournament, accept_players},
};

pub struct SingleElim {
    tcp_listener: TcpListener,
    remote_count: usize,
    local_count: usize,
    players: Vec<Box<dyn IPlayer>>,
}

impl SingleElim {
    pub fn new(player_count: usize, listener: TcpListener) -> SingleElim {
        SingleElim {
            tcp_listener: listener,
            remote_count: player_count,
            local_count: 0,
            players: Vec::with_capacity(player_count.next_power_of_two()),
        }
    }

    /*
    pub fn new_local(player_count: usize) -> SingleElim {
        SingleElim {
            tcp_listener: TcpListener::bind("localhost:8888").unwrap(),
            remote_count: 0,
            local_count: 0,
            players: Vec::with_capacity(player_count),
        }
    }

    fn add_local_players(&mut self, num_players: usize) {
        for i in 0..num_players {
            self.players.push(make_local_player(i));
        }
    }
     */

    #[inline]
    fn run_one_round(&mut self) {
        let num_to_add = self.players.len().next_power_of_two() - self.players.len();
        for _ in 0..num_to_add {
            self.players.push(make_local_player(self.local_count));
            self.local_count += 1;
        }

        let num_matches = self.players.len() / 2;

        let (s1, r1) = bounded(num_matches);

        for i in (0..self.players.len()).step_by(2) {
            let player_one;
            let player_two;
            unsafe {
                player_one = self.players.get_unchecked(i);
                player_two = self.players.get_unchecked(i + 1); //players.len must be pow of 2
            }

            s1.send(Administrator::new(player_one.duplicate(), player_two.duplicate())).unwrap();
        }


        crossbeam::scope(|s| {
            let mut threads = Vec::with_capacity(num_matches);
            for _ in 0..num_matches {
                threads.push(s.spawn(|_| {
                    let mut admin = r1.recv().unwrap();
                    admin.moderate_game(HandleCheater::EndGame);
                    s1.send(admin).unwrap();
                }));
            }
            for child in threads {
                child.join().unwrap();
            }
        }).unwrap();

        let mut valid_index = 0;
        for _ in 0..num_matches {
            if let Some(winner) = r1.recv().unwrap().get_winning_player() {
                self.players[valid_index] = winner;
                valid_index += 1;
            }
        }

        self.players.truncate(valid_index);
    }
}

impl Tournament for SingleElim {
    fn moderate_tournament(&mut self) {
        accept_players(&mut self.players, &self.remote_count, &self.tcp_listener);
        while self.players.len() > 1 {
            self.run_one_round();
        }
    }

    fn report_winner(&mut self) -> Value {
        match self.players.len() {
            0 => json!(false),
            1 => json!(self.players[0].get_name().to_string()),
            _ => panic!("more than 1 player won single elimination"),
        }
    }
}

fn make_local_player(id: usize) -> Box<LocalPlayer<Rando>> {
    //! creates LocalPlayer with name Filler_{id}
    Box::new(LocalPlayer::new(String::from("Filler_") + &*id.to_string(), Rando))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::net_config::NetConfig;
    use crate::board::Board;
    use crate::player::{PlayerColor, PlayerName};
    use crate::r#move::Move;

    struct CheatingLocal {
        player: Box<dyn IPlayer>,
    }

    impl IPlayer for CheatingLocal {
        fn get_turn(&mut self, board: &Board, dice: &Vec<u8>) -> Vec<Move> {
            self.player.get_turn(board, dice)
        }

        fn get_name(&mut self) -> PlayerName {
            self.player.get_name()
        }

        fn validate_turn(&mut self, board: &Board, dice: &Vec<u8>, moves: &Vec<Move>) -> bool {
            self.player.validate_turn(board, dice, moves)
        }

        fn start_game(&mut self, color: PlayerColor, opp_name: String) -> bool {
            self.player.start_game(color, opp_name)
        }

        fn end_game(&mut self, board: &Board, won: bool) -> bool {
            self.player.end_game(board, won)
        }

        fn has_cheated(&self) -> bool {
            true
        }

        fn get_color(&self) -> PlayerColor {
            self.player.get_color()
        }

        fn duplicate(&self) -> Box<dyn IPlayer> {
            Box::new(CheatingLocal { player: self.player.duplicate() })
        }
    }

    #[test]
    fn pow_2() {
        assert_eq!(0usize.next_power_of_two(), 1);
        assert_eq!(1usize.next_power_of_two(), 1);
        assert_eq!(2usize.next_power_of_two(), 2);
        assert_eq!(3usize.next_power_of_two(), 4);
        assert_eq!(4usize.next_power_of_two(), 4);
        assert_eq!(5usize.next_power_of_two(), 8);
        assert_eq!(6usize.next_power_of_two(), 8);
        assert_eq!(7usize.next_power_of_two(), 8);
        assert_eq!(8usize.next_power_of_two(), 8);
    }

    #[test]
    fn one_cheaters() {
        let mut test_se = SingleElim {
            tcp_listener: NetConfig::connect_listener(json!(9203)).unwrap(),
            remote_count: 0,
            local_count: 2,
            players: Vec::new(),
        };
        //push cheating local player
        test_se.players.push(
            Box::new(CheatingLocal { player: make_local_player(0) })
        );
        test_se.players.push(make_local_player(1));

        test_se.run_one_round();
        assert_eq!(test_se.report_winner(), json!("Filler_1"));

        test_se.players.clear();
        test_se.players.push(make_local_player(0));
        test_se.players.push(Box::new(CheatingLocal { player: make_local_player(1) }));
        test_se.moderate_tournament();
        assert_eq!(test_se.report_winner(), json!("Filler_0"));
    }

    #[test]
    fn two_cheaters() {
        let mut test_se = SingleElim {
            tcp_listener: NetConfig::connect_listener(json!(9203)).unwrap(),
            remote_count: 0,
            local_count: 2,
            players: Vec::new(),
        };
        //push cheating local player
        test_se.players.push(
            Box::new(CheatingLocal { player: make_local_player(0) })
        );
        test_se.players.push(
            Box::new(CheatingLocal { player: make_local_player(1) })
        );

        test_se.moderate_tournament();
        assert_eq!(test_se.report_winner(), json!(false));
    }

    #[test]
    fn three_cheaters() {
        let mut test_se = SingleElim {
            tcp_listener: NetConfig::connect_listener(json!(9203)).unwrap(),
            remote_count: 0,
            local_count: 3,
            players: Vec::new(),
        };
        //push cheating local player
        test_se.players.push(
            Box::new(CheatingLocal { player: make_local_player(0) })
        );
        test_se.players.push(
            Box::new(CheatingLocal { player: make_local_player(1) })
        );
        test_se.players.push(
            Box::new(CheatingLocal { player: make_local_player(2) })
        );
        test_se.moderate_tournament();
        assert_eq!(test_se.report_winner(), json!("Filler_3"));
    }
}