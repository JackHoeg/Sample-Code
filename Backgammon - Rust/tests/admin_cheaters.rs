use crate::cheating_players::{CheatStep, CheatOn};
use backgammon_lib::local_remote::LocalPlayer;
use backgammon_lib::strategy::rando::Rando;
use backgammon_lib::administrator::{Administrator, HandleCheater, Winner};

mod cheating_players;

#[test]
fn one_cheater_end_game() {
    //always cheats on 3rd turn
    let cheater = Box::new(
        CheatStep::new(
            Box::new(
                LocalPlayer::new(
                    String::from("pre-cheat"), Rando)), 3, CheatOn::Turn));
    let normie = Box::new(LocalPlayer::new(String::from("normie"), Rando));

    let mut admin = Administrator::new(cheater, normie);
    admin.moderate_game(HandleCheater::EndGame);
    assert!(matches!(admin.get_winner(), Winner::PlayerTwo));

    //always cheats on 3rd turn
    let cheater = Box::new(
        CheatStep::new(
            Box::new(
                LocalPlayer::new(
                    String::from("pre-cheat"), Rando)), 3, CheatOn::Turn));
    let normie = Box::new(LocalPlayer::new(String::from("normie"), Rando));

    let mut admin = Administrator::new( normie, cheater);
    admin.moderate_game(HandleCheater::EndGame);
    assert!(matches!(admin.get_winner(), Winner::PlayerOne));
}

#[test]
fn two_cheater_replace() {
    //! checks that Malnati always wins
    for _ in 0..5 {
        // makes sure results are consistent
        let cheater1 = Box::new(
            CheatStep::new(
                Box::new(
                    LocalPlayer::new(
                        String::from("pre-cheat"), Rando)), 3, CheatOn::Turn));
        let cheater2 = Box::new(
            CheatStep::new(
                Box::new(
                    LocalPlayer::new(
                        String::from("pre-cheat"), Rando)), 6, CheatOn::Turn));
        let mut admin = Administrator::new(cheater1, cheater2);
        admin.moderate_game(HandleCheater::Replace);
        assert_eq!(admin.get_winning_player().unwrap().get_name().to_string(), "Malnati".to_string());
        assert_eq!(admin.get_players().0.get_name().to_string(), admin.get_players().1.get_name().to_string());
    }
}

#[test]
fn two_cheater_replace_end() {
    for _ in 0..5 {
        // makes sure results are consistent
        let cheater1 = Box::new(
            CheatStep::new(
                Box::new(
                    LocalPlayer::new(
                        String::from("pre-cheat"), Rando)), 0, CheatOn::End));
        let cheater2 = Box::new(
            CheatStep::new(
                Box::new(
                    LocalPlayer::new(
                        String::from("pre-cheat"), Rando)), 0, CheatOn::End));
        let mut admin = Administrator::new(cheater1, cheater2);
        admin.moderate_game(HandleCheater::Replace);
        assert_eq!(admin.get_winning_player().unwrap().get_name().to_string(), "Malnati".to_string());
        assert_eq!(admin.get_players().0.get_name().to_string(), admin.get_players().1.get_name().to_string());
    }
}

#[test]
fn two_cheater_end_end() {
    let inner_pl1 = Box::new(LocalPlayer::new(String::from("cheater_1"), Rando));
    let inner_pl2 = Box::new(LocalPlayer::new(String::from("cheater_2"), Rando));
    let mut admin = Administrator::new(
        Box::new(CheatStep::new(inner_pl1, 0, CheatOn::End)),
        Box::new(CheatStep::new(inner_pl2, 0, CheatOn::End)),
    );
    admin.moderate_game(HandleCheater::EndGame);
    assert_eq!(admin.get_winner(), Winner::None);
    assert!(admin.get_winning_player().is_none());
}

#[test]
fn two_cheater_name() {
    let mut admin = Administrator::new(
        Box::new(CheatStep::local(0, CheatOn::Name)),
        Box::new(CheatStep::local( 0, CheatOn::Name)),
    );
    admin.moderate_game(HandleCheater::EndGame);
    assert_eq!(admin.get_winner(), Winner::None);
    assert!(admin.get_winning_player().is_none());

    let mut admin = Administrator::new(
        Box::new(CheatStep::local(0, CheatOn::Name)),
        Box::new(CheatStep::local( 0, CheatOn::Name)),
    );
    admin.moderate_game(HandleCheater::Replace);
    assert_eq!(admin.get_winning_player().unwrap().get_name().to_string(), "Malnati".to_string());
    assert_eq!(admin.get_players().0.get_name().to_string(), admin.get_players().1.get_name().to_string());
}

#[test]
fn two_cheater_start() {
    let mut admin = Administrator::new(
        Box::new(CheatStep::local(0, CheatOn::Start)),
        Box::new(CheatStep::local( 0, CheatOn::Start)),
    );
    admin.moderate_game(HandleCheater::EndGame);
    assert_eq!(admin.get_winner(), Winner::None);
    assert!(admin.get_winning_player().is_none());

    let mut admin = Administrator::new(
        Box::new(CheatStep::local(0, CheatOn::Start)),
        Box::new(CheatStep::local( 0, CheatOn::Start)),
    );
    admin.moderate_game(HandleCheater::Replace);
    assert_eq!(admin.get_winning_player().unwrap().get_name().to_string(), "Malnati".to_string());
    assert_eq!(admin.get_players().0.get_name().to_string(), admin.get_players().1.get_name().to_string());

    let mut admin = Administrator::new(
        Box::new(CheatStep::local(0, CheatOn::Start)),
        Box::new(CheatStep::local( 1, CheatOn::Start)),
    );
    admin.moderate_game(HandleCheater::EndGame);
    assert_ne!(admin.get_winner(), Winner::None);

    let mut admin = Administrator::new(
        Box::new(CheatStep::local(0, CheatOn::Start)),
        Box::new(CheatStep::local( 2, CheatOn::Start)),
    );
    admin.moderate_game(HandleCheater::Replace);
    assert_ne!(admin.get_winner(), Winner::None);
    assert_ne!(admin.get_players().0.get_name().to_string(), admin.get_players().1.get_name().to_string());

    let (p1, p2) = admin.get_players();
    let mut admin = Administrator::new(p1, p2);
    admin.moderate_game(HandleCheater::Replace);
    assert_ne!(admin.get_winner(), Winner::None);
    assert_eq!(admin.get_players().0.get_name().to_string(), admin.get_players().1.get_name().to_string());
}