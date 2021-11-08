use serde::{Serialize, Deserialize};

use std::fmt;

use serde::de::{self, Deserializer, Visitor, SeqAccess, MapAccess};
use serde::ser::{Serializer, SerializeStruct};
use serde_json::Value;

use crate::{
    player::PlayerColor,
    r#mod::{move_checker, NUM_CHECKERS, piece_u8_to_val, piece_val_to_u8, try_bop, count_occur},
    r#move::Move,
};

const DEFAULT_BOARD: Board = Board {
    black: [6,6,6,6,6,8,8,8,13,13,13,13,13,24,24],
    white: [1,1,12,12,12,12,12,17,17,17,19,19,19,19,19],
};

#[derive(Clone)]
#[cfg_attr(debug_assertions, derive(Debug))]
pub struct Board {
    //TODO: Make fields private?
    pub black: [u8; NUM_CHECKERS],
    pub white: [u8; NUM_CHECKERS],
}

impl Board {
    pub fn new() -> Board {
        DEFAULT_BOARD
    }

    pub fn make_move(&mut self, player: &PlayerColor, mve: &Move) {
        //! moves checker and bops enemy if possible
        let (pieces, enemy_pieces) = match player {
            PlayerColor::Black => (&mut self.black, &mut self.white),
            PlayerColor::White => (&mut self.white, &mut self.black),
        };

        move_checker(pieces, &mve.start, &mve.end);
        try_bop(enemy_pieces, &mve.end);
    }

    pub fn move_no_bop(&mut self, player: &PlayerColor, mve: &Move) {
        //! moves checker without regard for other pieces
        let pieces = match player {
            PlayerColor::Black => &mut self.black,
            PlayerColor::White => &mut self.white,
        };
        move_checker(pieces, &mve.start, &mve.end);
    }

    pub fn count_occurrences(&self, player: &PlayerColor, pos: &u8) -> u8 {
        //! returns the number of times checkers at position pos
        let pieces = match player {
            PlayerColor::Black => &self.black,
            PlayerColor::White => &self.white,
        };
        count_occur(pieces, pos)
    }
}

impl Serialize for Board {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
        where
            S: Serializer,
    {
        let mut state = serializer.serialize_struct("Board", 2)?;
        state.serialize_field("black", &pos_to_val(&self.black))?;
        state.serialize_field("white", &pos_to_val(&self.white))?;
        return state.end();

        fn pos_to_val(pieces: &[u8; NUM_CHECKERS]) -> Vec<Value> {
            //converts u8 positions to Value
            let mut output: Vec<Value> = Vec::with_capacity(NUM_CHECKERS);
            for i in 0..NUM_CHECKERS {
                output.push(piece_u8_to_val(pieces[i]));
            }
            output
        }
    }
}

impl<'de> Deserialize<'de> for Board {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
        where
            D: Deserializer<'de>,
    {
        enum Field { Black, White }

        impl<'de> Deserialize<'de> for Field {
            fn deserialize<D>(deserializer: D) -> Result<Field, D::Error>
                where
                    D: Deserializer<'de>,
            {
                struct FieldVisitor;

                impl<'de> Visitor<'de> for FieldVisitor {
                    type Value = Field;

                    fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                        formatter.write_str("`black` or `white`")
                    }

                    fn visit_str<E>(self, value: &str) -> Result<Field, E>
                        where
                            E: de::Error,
                    {
                        match value {
                            "black" => Ok(Field::Black),
                            "white" => Ok(Field::White),
                            _ => Err(de::Error::unknown_field(value, FIELDS)),
                        }
                    }
                }

                deserializer.deserialize_identifier(FieldVisitor)
            }
        }

        struct BoardVisitor;

        impl<'de> Visitor<'de> for BoardVisitor {
            type Value = Board;

            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("struct Board")
            }

            fn visit_seq<V>(self, mut seq: V) -> Result<Board, V::Error>
                where
                    V: SeqAccess<'de>,
            {
                let black_val = seq.next_element()?
                    .ok_or_else(|| de::Error::invalid_length(0, &self))?;
                let white_val = seq.next_element()?
                    .ok_or_else(|| de::Error::invalid_length(1, &self))?;
                return Ok(Board {black: pos_to_u8(&black_val), white: pos_to_u8(&white_val)});
            }

            fn visit_map<V>(self, mut map: V) -> Result<Board, V::Error>
                where
                    V: MapAccess<'de>,
            {
                let mut black_val = None;
                let mut white_val = None;
                while let Some(key) = map.next_key()? {
                    match key {
                        Field::Black => {
                            if black_val.is_some() {
                                return Err(de::Error::duplicate_field("black"));
                            }
                            black_val = Some(map.next_value()?);
                        }
                        Field::White => {
                            if white_val.is_some() {
                                return Err(de::Error::duplicate_field("white"));
                            }
                            white_val = Some(map.next_value()?);
                        }
                    }
                }
                let black_val = black_val.ok_or_else(|| de::Error::missing_field("black"))?;
                let white_val = white_val.ok_or_else(|| de::Error::missing_field("white"))?;
                return Ok(Board {black: pos_to_u8(&black_val), white: pos_to_u8(&white_val)});
            }
        }

        const FIELDS: &'static [&'static str] = &["black", "white"];
        deserializer.deserialize_struct("Board", FIELDS, BoardVisitor)
    }
}

fn pos_to_u8(pieces: &Vec<Value>) -> [u8; NUM_CHECKERS] {
    //converts string positions to u8
    debug_assert_eq!(
        pieces.len(),
        NUM_CHECKERS,
        "pieces.len() == {} instead of NUM_CHECKERS",
        pieces.len()
    );
    let mut arr: [u8; NUM_CHECKERS] = [0; NUM_CHECKERS];
    for i in 0..NUM_CHECKERS {
        arr[i] = piece_val_to_u8(&pieces[i]);
    }
    arr
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        player::PlayerColor,
        r#mod::{BAR, move_checker},
        r#move::Move,
    };

    #[test]
    fn black_moves() {
        let mut board = DEFAULT_BOARD;
        let moves: Vec<Move> = vec!(
            Move { start: 24, end: 22},
            Move { start: 24, end: 22},
            Move { start: 22, end: 20},
            Move { start: 13, end: 11},
        );

        let mut comparison_black = DEFAULT_BOARD.black.clone();
        for mve in moves.iter() {
            board.make_move(&PlayerColor::Black, mve);
            move_checker(&mut comparison_black, &mve.start, &mve.end);
        }
        assert_eq!(board.black, comparison_black);
        assert_eq!(board.white, DEFAULT_BOARD.white);
    }

    #[test]
    fn white_moves() {
        let mut board = DEFAULT_BOARD;
        let moves: Vec<Move> = vec!(
            Move { start: 12, end: 15},
            Move { start: 12, end: 15},
            Move { start: 12, end: 15},
            Move { start: 17, end: 20},
        );

        let mut comparison_white = DEFAULT_BOARD.white.clone();
        for mve in moves.iter() {
            board.make_move(&PlayerColor::White, mve);
            move_checker(&mut comparison_white, &mve.start, &mve.end);
        }
        assert_eq!(board.white, comparison_white);
        assert_eq!(board.black, DEFAULT_BOARD.black);
    }

    #[test]
    fn black_bops() {
        let mut board = DEFAULT_BOARD;

        board.make_move(&PlayerColor::White, &Move{start:12, end:16});
        board.make_move(&PlayerColor::White, &Move{start:12, end:15});
        board.make_move(&PlayerColor::White, &Move{start:1, end:7});

        let moves: Vec<Move> = vec!(
            Move { start: 24, end: 16},
            Move { start: 24, end: 15},
            Move { start: 8, end: 7},
            Move { start: 15, end: 13},
        );

        let mut comparison_white = DEFAULT_BOARD.white.clone();
        move_checker(&mut comparison_white, &12, &BAR);
        move_checker(&mut comparison_white, &12, &BAR);
        move_checker(&mut comparison_white, &1, &BAR);

        let mut comparison_black = DEFAULT_BOARD.black.clone();
        for mve in moves.iter() {
            board.make_move(&PlayerColor::Black, mve);
            move_checker(&mut comparison_black, &mve.start, &mve.end);
        }
        assert_eq!(board.black, comparison_black);
        assert_eq!(board.white, comparison_white);
    }

    #[test]
    fn white_bops() {
        let mut board = DEFAULT_BOARD;

        board.make_move(&PlayerColor::Black, &Move{start:6, end:5});
        board.make_move(&PlayerColor::Black, &Move{start:6, end:4});

        let moves: Vec<Move> = vec!(
            Move { start: 1, end: 5},
            Move { start: 1, end: 4},
        );

        let mut comparison_black = DEFAULT_BOARD.black.clone();
        move_checker(&mut comparison_black, &6, &BAR);
        move_checker(&mut comparison_black, &6, &BAR);

        let mut comparison_white = DEFAULT_BOARD.white.clone();
        for mve in moves.iter() {
            board.make_move(&PlayerColor::White, mve);
            move_checker(&mut comparison_white, &mve.start, &mve.end);
        }
        assert_eq!(board.black, comparison_black);
        assert_eq!(board.white, comparison_white);
    }

    #[test]
    fn special_bops() {
        let mut board = Board {
            black: [0,1,2,2,2,2,6,6,6,6,8,15,15,20,22],
            white: [3,4,4,4,9,12,14,16,17,19,21,23,23,23,23],
        };

        let fin_board = Board {
            black: [0,0,1,2,2,2,2,6,6,6,6,8,15,15,20],
            white: [3,4,4,4,9,12,14,16,17,19,22,23,23,23,23],
        };

        let moves: Vec<Move> = vec!(
            Move { start: 21, end: 22},
        );

        for mve in moves.iter() {
            board.make_move(&PlayerColor::White, mve);
        }

        assert_eq!(board.black, fin_board.black);
        assert_eq!(board.white, fin_board.white);
    }

    #[test]
    fn no_bop() {
        let mut board = DEFAULT_BOARD;
        board.move_no_bop(&PlayerColor::Black, &Move {start: 6, end: 1} );
        assert_eq!(board.black, [1,6,6,6,6,8,8,8,13,13,13,13,13,24,24]);
        assert_eq!(board.white, [1,1,12,12,12,12,12,17,17,17,19,19,19,19,19]);
    }

    #[test]
    fn count() {
        let board = DEFAULT_BOARD;
        assert_eq!(board.count_occurrences(&PlayerColor::Black, &6), 5);
        assert_eq!(board.count_occurrences(&PlayerColor::Black, &8), 3);
        assert_eq!(board.count_occurrences(&PlayerColor::Black,  &13), 5);
        assert_eq!(board.count_occurrences(&PlayerColor::Black,  &24), 2);
        assert_eq!(board.count_occurrences(&PlayerColor::Black, &23), 0);
        assert_eq!(board.count_occurrences(&PlayerColor::Black,  &19), 0);
        assert_eq!(board.count_occurrences(&PlayerColor::White, &1), 2);
        assert_eq!(board.count_occurrences(&PlayerColor::White, &12), 5);
        assert_eq!(board.count_occurrences(&PlayerColor::White,  &17), 3);
        assert_eq!(board.count_occurrences(&PlayerColor::White,  &19), 5);
        assert_eq!(board.count_occurrences(&PlayerColor::White, &23), 0);
        assert_eq!(board.count_occurrences(&PlayerColor::White,  &6), 0);
    }
}