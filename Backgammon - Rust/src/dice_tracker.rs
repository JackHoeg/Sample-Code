/// Encodes which dice have/haven't been used into a single byte
#[derive(Clone)]
pub struct DiceTracker {
    indices: i8,
}

/**
Stores the indices of unused dice in the 4 least significant bits
Ex:
    dice = [2, 3],  0000 0011
    2 used:         0000 0010
    3 used:         0000 0001
    both used:      0000 0000

When duplicates are rolled, the least signifcant set bit is released,
regardless of which die is used.
*/

impl DiceTracker {
    pub fn new(dice: &Vec<u8>) -> DiceTracker {
        //! creates tracker with dice.len() LSBs set
        debug_assert!(dice.len() == 2 || dice.len() == 4, "dice is not valid length");
        if dice.len() == 2 {
            DiceTracker { indices: 0x03 }
        } else {
            DiceTracker { indices: 0x0F }
        }
    }

    pub fn use_die(&self, die_ind: &usize) -> DiceTracker {
        /*! Returns tracker without bit set at die_ind.
            If there are 4 dice, the lowest set bit is dropped */
        if self.doubled_dice() {
            self.use_4_die()
        } else {
            self.use_2_die(&die_ind)
        }
    }

    #[inline]
    pub fn is_empty(&self) -> bool { self.indices == 0 }

    pub fn num_unique(&self) -> usize {
        /*!
        returns number of unique dice
        useful for efficiently looping through dice
        */
        match self.indices {
            3 => 2,
            0 => 0,
            _ => 1
        }
    }

    pub fn is_valid(&self, ind: usize) -> bool {
        //! returns true if the die at index ind has not been used
        debug_assert!(ind < 2, "how was this index reached?");
        if self.doubled_dice() || self.indices & (0x1 << ind) != 0 {
            true
        } else {
            false
        }
    }

    pub fn get_die_ind(&self, loop_num: &usize) -> usize {
        /*!
        returns index of die based on loop_num
        loop_num must be the result of get_die_ind!
        */
        match loop_num {
            0 => {
                return if self.doubled_dice() || self.indices & 0x1 != 0 {
                    0
                } else {
                    1
                };
            }
            1 => { return 1; }
            _ => panic!("not possible!"),
        }
    }

    pub fn get_die(&self, loop_num: &usize, dice: &Vec<u8>) -> u8 {
        /*!
        returns die based on loop_num
        loop_num must be the result of get_die_ind!
        dice must be the same dice used at construction
        */
        debug_assert!(dice.len() == 2 || dice.len() == 4, "invalid dice!");
        unsafe {
            match loop_num {
                0 => {
                    if self.doubled_dice() || self.indices & 0x1 != 0 {
                        *dice.get_unchecked(0)
                    } else {
                        *dice.get_unchecked(1)
                    }
                }
                1 => { *dice.get_unchecked(1) }
                _ => panic!("not possible!"),
            }
        }
    }

    #[inline]
    fn use_4_die(&self) -> DiceTracker {
        /*!
        returns tracker without the least significant set bit
        if only 1 die remains, the new tracker will be empty
         */
        DiceTracker {
            indices: self.indices ^ lowest_set_bit(&self.indices)
        }
    }

    #[inline]
    fn use_2_die(&self, die_ind: &usize) -> DiceTracker {
        //! returns tracker with die_ind'th lsb set to 0
        debug_assert!(self.indices & 0x1 << die_ind != 0);
        DiceTracker {
            indices: self.indices ^ (0x1 << die_ind)
        }
    }

    #[inline]
    fn doubled_dice(&self) -> bool {
        /*!
            returns true if player rolled doubles (has 4 dice)
            only invoke when dice.len() is unavailable.
        */
        self.indices > 0x03
    }
}

#[inline]
fn lowest_set_bit(in_byte: &i8) -> i8 {
    in_byte & -in_byte
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn l_set() {
        assert_eq!(
            lowest_set_bit(&0b0001), 0x1
        );
        assert_eq!(
            lowest_set_bit(&0b0010), 0x2
        );
        assert_eq!(
            lowest_set_bit(&0b0100), 0x4
        );
        assert_eq!(
            lowest_set_bit(&0b1000), 0x8
        );
        assert_eq!(
            lowest_set_bit(&0b1010), 0x2
        );
        assert_eq!(
            lowest_set_bit(&0b1100), 0x4
        );
    }

    #[test]
    fn four_dice() {
        let in_dice: Vec<u8> = vec!(3, 3, 3, 3);
        let tracker = DiceTracker::new(&in_dice);
        assert!(tracker.doubled_dice());
        assert_eq!(tracker.num_unique(), 1);
        assert_eq!(tracker.get_die_ind(&0), 0);
        assert_eq!(tracker.use_die(&2).indices, 14);
        assert_eq!(tracker.get_die_ind(&1), 1);
        assert_eq!(tracker.get_die(&1, &in_dice), 3);
    }

    #[test]
    fn two_dice() {
        let in_dice: Vec<u8> = vec!(3, 2);
        let mut tracker = DiceTracker::new(&in_dice);
        assert!(!tracker.doubled_dice());
        assert_eq!(tracker.num_unique(), 2);
        assert_eq!(tracker.get_die_ind(&0), 0);
        assert_eq!(tracker.use_die(&1).indices, 1);
        assert_eq!(tracker.use_die(&0).indices, 2);
        assert_eq!(tracker.get_die_ind(&1), 1);
        assert_eq!(tracker.get_die(&1, &in_dice), 2);
        tracker = tracker.use_die(&0);
        assert_eq!(tracker.get_die(&0, &in_dice), 2);
        assert!(tracker.is_valid(1));
    }

    #[test]
    #[should_panic]
    fn bad_index() {
        let in_dice: Vec<u8> = vec!(3, 3, 3, 3);
        let tracker = DiceTracker::new(&in_dice);
        tracker.get_die(&2, &in_dice);
    }
}