use serde_json::Value;
use serde::{Serialize, Deserialize};

use std::fmt;

use serde::de::{self, Deserializer, Visitor, SeqAccess, MapAccess};
use serde::ser::{Serializer, SerializeStruct};

use crate::r#mod::{piece_u8_to_val, piece_val_to_u8};

#[derive(PartialEq, Clone, Debug)]
pub struct Move {
    pub start: u8,
    pub end: u8,
}

impl Move {
    fn new(start: u8, end: u8) -> Move {
        Move {
            start,
            end
        }
    }

    pub fn to_json(&self) -> Value {
        //! converts to json array with Value names for positions (i.e. "bar" & "home")
        serde_json::json!([piece_u8_to_val(self.start), piece_u8_to_val(self.end)])
    }

    pub fn from_arr(arr: &Vec<Value>) -> Move {
        Move {
            start: piece_val_to_u8(&arr[0]),
            end: piece_val_to_u8(&arr[1]),
        }
    }
}

impl Serialize for Move {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
        where
            S: Serializer,
    {
        let mut state = serializer.serialize_struct("Move", 2)?;
        state.serialize_field("start", &piece_u8_to_val(self.start))?;
        state.serialize_field("end", &piece_u8_to_val(self.end))?;
        state.end()
    }
}

impl<'de> Deserialize<'de> for Move {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
        where
            D: Deserializer<'de>,
    {
        enum Field { Start, End }

        impl<'de> Deserialize<'de> for Field {
            fn deserialize<D>(deserializer: D) -> Result<Field, D::Error>
                where
                    D: Deserializer<'de>,
            {
                struct FieldVisitor;

                impl<'de> Visitor<'de> for FieldVisitor {
                    type Value = Field;

                    fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                        formatter.write_str("`start` or `end`")
                    }

                    fn visit_str<E>(self, value: &str) -> Result<Field, E>
                        where
                            E: de::Error,
                    {
                        match value {
                            "start" => Ok(Field::Start),
                            "end" => Ok(Field::End),
                            _ => Err(de::Error::unknown_field(value, FIELDS)),
                        }
                    }
                }

                deserializer.deserialize_identifier(FieldVisitor)
            }
        }

        struct MoveVisitor;

        impl<'de> Visitor<'de> for MoveVisitor {
            type Value = Move;

            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("struct Move")
            }

            fn visit_seq<V>(self, mut seq: V) -> Result<Move, V::Error>
                where
                    V: SeqAccess<'de>,
            {
                let start_val = seq.next_element()?
                    .ok_or_else(|| de::Error::invalid_length(0, &self))?;
                let end_val = seq.next_element()?
                    .ok_or_else(|| de::Error::invalid_length(1, &self))?;
                Ok(Move::new(piece_val_to_u8(&start_val), piece_val_to_u8(&end_val)))
            }

            fn visit_map<V>(self, mut map: V) -> Result<Move, V::Error>
                where
                    V: MapAccess<'de>,
            {
                let mut start_val = None;
                let mut end_val = None;
                while let Some(key) = map.next_key()? {
                    match key {
                        Field::Start => {
                            if start_val.is_some() {
                                return Err(de::Error::duplicate_field("start"));
                            }
                            start_val = Some(map.next_value()?);
                        }
                        Field::End => {
                            if end_val.is_some() {
                                return Err(de::Error::duplicate_field("end"));
                            }
                            end_val = Some(map.next_value()?);
                        }
                    }
                }
                let start_val = start_val.ok_or_else(|| de::Error::missing_field("start"))?;
                let end_val = end_val.ok_or_else(|| de::Error::missing_field("end"))?;
                Ok(Move::new(piece_val_to_u8(&start_val), piece_val_to_u8(&end_val)))
            }
        }

        const FIELDS: &'static [&'static str] = &["start", "end"];
        deserializer.deserialize_struct("Move", FIELDS, MoveVisitor)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn json_arr() {
        // test standard moves
        let mve = Move { start: 7, end: 11};
        let cmp = json!([json!(7), json!(11)]);
        assert_eq!(mve.to_json(), cmp);

        let mve = Move { start: 15, end: 5};
        let cmp = json!([json!(15), json!(5)]);
        assert_eq!(mve.to_json(), cmp);

        // test home
        let mve = Move { start: 22, end: 25};
        let cmp = json!([json!(22), json!("home")]);
        assert_eq!(mve.to_json(), cmp);

        let mve = Move { start: 4, end: 25};
        let cmp = json!([json!(4), json!("home")]);
        assert_eq!(mve.to_json(), cmp);

        // test bar
        let mve = Move { start: 0, end: 19};
        let cmp = json!([json!("bar"), json!(19)]);
        assert_eq!(mve.to_json(), cmp);

        let mve = Move { start: 0, end: 3};
        let cmp = json!([json!("bar"), json!(3)]);
        assert_eq!(mve.to_json(), cmp);

        // json!(Vec<T>) is same as json!([T; 2])
        let mve = Move { start: 17, end: 13};
        let cmp = json!(vec![json!(17), json!(13)]);
        assert_eq!(mve.to_json(), cmp);
    }

    #[test]
    #[should_panic]
    fn invalid_json_arr_end() {
        //! test invalid end
        let mve = Move { start: 18, end: 26 };
        mve.to_json();
    }

    #[test]
    #[should_panic]
    fn invalid_json_arr_start() {
        //! test invalid start
        let mve = Move { start: 27, end: 5 };
        mve.to_json();
    }
}