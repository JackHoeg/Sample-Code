use backgammon_lib::{
    parser,
    // tournament::single_elim::SingleElim,
    // tournament::tournament::Tournament,
};
use serde_json::json;

// extern crate elapsed;
// use elapsed::measure_time;

fn main() -> Result<(), std::io::Error> {
    // get networking details from stdin
    let json_arr = parser::read_in_json()?;
    let tourn_config = parser::get_tournament_config(&json_arr);
    let mut tournament = tourn_config.to_tournament();
    println!("{}", json!("started"));

    tournament.moderate_tournament();
    println!("{}", tournament.report_winner());

    // Code for benchmarking:
    // let (elapsed, turn) = measure_time(|| {
    //     let mut tournament = SingleElim::new_local(32768);
    //     tournament.add_local_players(32768);
    //     tournament.moderate_tournament();
    //     println!("{}", tournament.report_winner());
    // });
    // println!("elapsed = {}", elapsed);

    Ok(())
}
