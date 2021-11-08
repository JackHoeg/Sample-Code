use std::net::TcpListener;

use crossbeam::channel::bounded;
use serde_json::{json, Value};

use crate::{
    administrator::{Administrator, Winner, HandleCheater},
    local_remote::IPlayer,
    tournament::tournament::{Tournament, accept_players},
};

pub struct RoundRobin {
    tcp_listener: TcpListener,
    player_count: usize,
    players: Vec<Box<dyn IPlayer>>,
    matches: Vec<Vec<Match>>,
}

impl RoundRobin {
    pub fn new(player_count: usize, listener: TcpListener) -> RoundRobin {
        RoundRobin {
            tcp_listener: listener,
            player_count,
            players: Vec::with_capacity(player_count),
            matches: Vec::new(),
        }
    }

    /*
    pub fn add_local_players(&mut self, num_players: usize) {
        for i in 0..num_players {
            self.players.push(Box::new(LocalPlayer::new(String::from("Filler_") + &*i.to_string(), Some(Rc::new(Rando {})))))
        }
        self.generate_matches();
    }
     */

    #[inline]
    fn run_one_round(&mut self, row_ind: usize) {
        let (s1, r1) = bounded(self.matches.len());

        for i in 0..self.matches[row_ind].len() {
            let player_one;
            let player_two;
            let indices = self.matches[row_ind][i].get_indices();
            unsafe {
                player_one = self.players.get_unchecked(indices.0);
                player_two = self.players.get_unchecked(indices.1);
            }

            if player_one.has_cheated() {
                if player_two.has_cheated() {
                    self.matches[row_ind][i].set_winner(Winner::None);
                } else {
                    self.matches[row_ind][i].set_winner(Winner::PlayerTwo);
                }
                s1.send((i, None)).unwrap();
                continue;
            } else if player_two.has_cheated() {
                self.matches[row_ind][i].set_winner(Winner::PlayerOne);
                s1.send((i, None)).unwrap();
                continue;
            }

            s1.send(
                (i, Some(Administrator::new(
                    player_one.duplicate(), player_two.duplicate())))
            ).unwrap();
        }

        crossbeam::scope(|s| {
            let mut threads = Vec::with_capacity(self.matches[row_ind].len());
            for _ in 0..self.matches[row_ind].len() {
                threads.push(s.spawn(|_| {
                    let (ind, admin) = r1.recv().unwrap();
                    if let Some(mut game) = admin {
                        game.moderate_game(HandleCheater::EndGame);
                        s1.send((ind, Some(game))).unwrap();
                    } else {
                        s1.send((ind, None)).unwrap();
                    }

                }));
            }
            for child in threads {
                child.join().unwrap();
            }
        }).unwrap();

        for _ in 0..self.matches[row_ind].len() {
            let (ind, opt_admin) = r1.recv().unwrap();
            if let Some(game) = opt_admin {
                let indices = self.matches[row_ind][ind].get_indices();
                let players = game.get_players();
                self.players[indices.0] = players.0;
                self.players[indices.1] = players.1;
                self.matches[row_ind][ind].set_winner(game.get_winner());
            }
        }
    }

    fn generate_matches(&mut self) {
        let mut matching_tool: Vec<usize> = Vec::with_capacity(self.player_count + 1);
        for i in 0..self.player_count {
            matching_tool.push(i);
        }

        let half_count: usize;
        let num_rounds = if self.player_count & 0x1 == 0 {
            half_count = self.player_count / 2;
            self.player_count - 1
        } else {
            half_count = (self.player_count + 1) / 2;
            matching_tool.push(self.player_count);
            self.player_count
        };

        for _ in 0..num_rounds {
            let mut round: Vec<Match> = Vec::with_capacity(half_count);
            for i in 0..half_count {
                if matching_tool[i] >= self.player_count || matching_tool[matching_tool.len() - 1 - i] >= self.player_count {
                    continue;
                }
                round.push(Match::new(matching_tool[i], matching_tool[matching_tool.len() - 1 - i]));
            }
            self.matches.push(round);
            matching_tool[1..].rotate_right(1);
        }
    }
}

impl Tournament for RoundRobin {
    fn moderate_tournament(&mut self) {
        accept_players(&mut self.players, &self.player_count, &self.tcp_listener);
        self.generate_matches();

        for i in 0..self.matches.len() {
            self.run_one_round(i);
        }

        for row in 0..self.matches.len() {
            for col in 0..self.matches[row].len() {
                let pl = self.matches[row][col].get_indices();
                if self.players[pl.0].has_cheated() && self.players[pl.1].has_cheated() {
                    self.matches[row][col].set_winner(Winner::None);
                } else if self.players[pl.0].has_cheated() {
                    self.matches[row][col].set_winner(Winner::PlayerTwo);
                } else if self.players[pl.1].has_cheated() {
                    self.matches[row][col].set_winner(Winner::PlayerOne);
                }
            }
        }
    }

    fn report_winner(&mut self) -> Value {
        let mut player_results: Vec<(String, usize, usize)> = Vec::with_capacity(self.player_count);
        for (i, p) in self.players.iter().enumerate() {
            let mut tup: (String, usize, usize) = (p.duplicate().get_name().to_string(), 0, 0);
            for row in self.matches.iter() {
                for m in row.iter() {
                    let win_lose = m.won_lost(i);
                    tup.1 += win_lose.0;
                    tup.2 += win_lose.1;
                }
            }
            player_results.push(tup);
        }

        // sort by most wins
        player_results.sort_by(|a, b| a.1.cmp(&b.1));

        json!(player_results)
    }
}

#[derive(Debug)]
struct Match {
    player_one_index: usize,
    player_two_index: usize,
    winner: Winner,
}

impl Match {
    pub fn new(index_one: usize, index_two: usize) -> Match {
        Match {
            player_one_index: index_one,
            player_two_index: index_two,
            winner: Winner::None,
        }
    }

    #[inline]
    pub fn get_indices(&self) -> (usize, usize) {
        (self.player_one_index, self.player_two_index)
    }

    pub fn set_winner(&mut self, win: Winner) {
        self.winner = win;
    }

    pub fn won_lost(&self, ind: usize) -> (usize, usize) {
        if ind != self.player_one_index && ind != self.player_two_index {
            return (0, 0);
        }

        match self.winner {
            Winner::PlayerOne => {
                if ind == self.player_one_index {
                    return (1, 0);
                }
            }
            Winner::PlayerTwo => {
                if ind == self.player_two_index {
                    return (1, 0);
                }
            }
            _ => ()
        }

        return (0, 1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cmp::Ordering;
    use crate::board::Board;
    use crate::player::{PlayerName, PlayerColor};
    use crate::net_config::NetConfig;
    use crate::local_remote::LocalPlayer;
    use crate::strategy::rando::Rando;
    use crate::r#move::Move;

    fn naive_matching(player_count: usize) -> Vec<(usize, usize)> {
        let mut output = Vec::new();
        for i in 0..player_count {
            for j in i+1..player_count {
                output.push((i, j));
            }
        }
        output
    }

    fn matching_compare(a: &(usize, usize), b: &(usize, usize)) -> Ordering {
        match a.0.cmp(&b.0) {
            Ordering::Less => Ordering::Less,
            Ordering::Equal => a.1.cmp(&b.1),
            Ordering::Greater => Ordering::Greater,
        }
    }

    fn match_to_tuple(mat: &Match) -> (usize, usize) {
        let indices = mat.get_indices();
        if indices.0 > indices.1 {
            (indices.1, indices.0)
        } else {
            indices
        }
    }

    fn new_local(player_count: usize) -> RoundRobin {
        RoundRobin {
            tcp_listener: TcpListener::bind("localhost:8888").unwrap(),
            player_count,
            players: Vec::with_capacity(player_count),
            matches: Vec::new(),
        }
    }

    fn flatten_matches(matches: &Vec<Vec<Match>>) -> Vec<&Match> {
        let mut new_matches = Vec::with_capacity(matches.len() * matches[0].len());
        for row in matches.iter() {
            for mt in row.iter() {
                new_matches.push(mt);
            }
        }
        new_matches
    }

    fn validate_matches(player_count: usize) -> bool {
        let mut rr = new_local(player_count);
        rr.generate_matches();
        let flat_matches = flatten_matches(&rr.matches);
        let mut real_tuples = Vec::with_capacity(flat_matches.len());
        for mt in flat_matches.iter() {
            real_tuples.push(match_to_tuple(mt));
        }
        real_tuples.sort_by(|a, b| matching_compare(a, b));

        let naive_matches = naive_matching(player_count);
        assert_eq!(real_tuples.len(), naive_matches.len());
        for i in 0..real_tuples.len() {
            assert!(
                match matching_compare(&real_tuples[i], &naive_matches[i]) {
                    Ordering::Equal => true,
                    _ => false,
                }
            )
        }
        true
    }

    #[test]
    fn matching() {
        for i in 2..11 {
            assert!(validate_matches(i));
        }
    }

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
    fn one_cheater() {
        let mut test_rr = RoundRobin {
            tcp_listener: NetConfig::connect_listener(json!(9203)).unwrap(),
            players: Vec::with_capacity(2),
            matches: Vec::new(),
            player_count: 2
        };
        //push cheating local player
        test_rr.players.push(
            Box::new(CheatingLocal { player: Box::new(LocalPlayer::new(String::from("Filler_") + &*0.to_string(), Rando)) })
        );
        test_rr.players.push(Box::new(LocalPlayer::new(String::from("Filler_") + &*1.to_string(), Rando)));

        test_rr.generate_matches();
        test_rr.run_one_round(0);
        assert_eq!(test_rr.report_winner(), json!([[json!("Filler_0"), json!(0), json!(1)],[json!("Filler_1"), json!(1), json!(0)]]));
    }

    #[test]
    fn two_cheaters() {
        let mut test_rr = RoundRobin {
            tcp_listener: NetConfig::connect_listener(json!(9203)).unwrap(),
            players: Vec::with_capacity(2),
            matches: Vec::new(),
            player_count: 2
        };
        //push cheating local player
        test_rr.players.push(
            Box::new(CheatingLocal { player: Box::new(LocalPlayer::new(String::from("Filler_") + &*0.to_string(), Rando)) })
        );
        test_rr.players.push(
            Box::new(CheatingLocal { player: Box::new(LocalPlayer::new(String::from("Filler_") + &*1.to_string(), Rando)) })
        );

        test_rr.generate_matches();
        test_rr.run_one_round(0);
        assert_eq!(test_rr.report_winner(), json!([[json!("Filler_0"), json!(0), json!(1)],[json!("Filler_1"), json!(0), json!(1)]]));
    }
}