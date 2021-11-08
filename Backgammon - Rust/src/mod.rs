use serde_json::Value;

pub const BAR: u8 = 0;
pub const HOME: u8 = 25;
pub const NUM_CHECKERS: usize = 15;

#[inline]
pub fn piece_val_to_u8(val: &Value) -> u8 {
    //converts json position Value to u8
    if val == "bar" {
        BAR
    } else if val == "home" {
        HOME
    } else {
        let output = val.as_u64().unwrap() as u8;
        debug_assert!(
            output != BAR && output < HOME,
            "expected 'bar', 'home' or u8 | 0 < val < 25, given {}",
            output
        );
        output
    }
}

#[inline]
pub fn piece_u8_to_val(val: u8) -> Value {
    //converts u8 position to json Value
    debug_assert!(val <= HOME, "u8 positions must be <= 25, given {}", val);
    match val {
        BAR => Value::from("bar"),
        HOME => Value::from("home"),
        _ => Value::from(val),
    }
}

//TODO: Consider making a transparent PlayerPositions struct for all of the below functions

#[inline]
pub fn try_bop(positions: &mut [u8; NUM_CHECKERS], bop_val: &u8) {
    unsafe {
        let first_ind = first_binary_search(positions, bop_val, 0, NUM_CHECKERS);
        if let Ok(x) = first_ind {
            if x == NUM_CHECKERS - 1 || &positions[x + 1] != bop_val {
                let end_ind = last_binary_search(positions, &BAR, 0, x);
                move_checker_with_index(positions, &BAR, (first_ind, end_ind));
            }
        }
    }
}

#[inline]
pub fn count_occur(positions: &[u8; NUM_CHECKERS], cnt_val: &u8) -> u8 {
    let mut tally: u8 = 0;
    let first_ind;
    unsafe {
        first_ind = first_binary_search(positions, cnt_val, 0, NUM_CHECKERS);
    }
    if let Ok(x) = first_ind {
        for i in x..NUM_CHECKERS {
            if &positions[i] == cnt_val { tally += 1; } else { break; }
        }
    }
    tally
}

pub fn move_checker(positions: &mut [u8; NUM_CHECKERS], start_val: &u8, end_val: &u8) {
    //! moves checker while maintaining sorted list
    let indices = double_binary_search(positions, start_val, end_val);
    move_checker_with_index(positions, end_val, indices);
}

#[inline]
fn move_checker_with_index(positions: &mut [u8; NUM_CHECKERS], end_val: &u8, indices: (Result<usize, usize>, Result<usize, usize>)) {
    //! moves checker while maintaining sorted list
    let (r1, r2) = indices;
    let start_ind = r1.ok().expect("position not found");
    let end_ind = match r2 {
        Ok(x) => x,
        Err(x) => x,
    };

    unsafe {
        if start_ind < end_ind {
            for i in start_ind..end_ind - 1 {
                *positions.get_unchecked_mut(i) = *positions.get_unchecked(i + 1);
            }
            *positions.get_unchecked_mut(end_ind - 1) = *end_val;
            return;
        } else if end_ind < start_ind {
            for i in (end_ind + 1..start_ind + 1).rev() {
                *positions.get_unchecked_mut(i) = *positions.get_unchecked(i - 1);
            }
        }
        *positions.get_unchecked_mut(end_ind) = *end_val;
    }
}

#[inline]
fn double_binary_search(positions: &[u8; NUM_CHECKERS], targ1: &u8, targ2: &u8) -> (Result<usize, usize>, Result<usize, usize>) {
    debug_assert_eq!(positions.len(), NUM_CHECKERS, "double_binary_search requires Vec of len 15 for safety");
    let r1;
    let r2;

    if targ1 < targ2 {
        unsafe {
            r1 = last_binary_search(positions, targ1, 0, NUM_CHECKERS);
            r2 = first_binary_search(positions, targ2, 0, NUM_CHECKERS);
        }
    } else {
        unsafe {
            r1 = first_binary_search(positions, targ1, 0, NUM_CHECKERS);
            r2 = last_binary_search(positions, targ2, 0, NUM_CHECKERS);
        }
    }

    return (r1, r2);
}

#[inline]
unsafe fn first_binary_search(positions: &[u8; NUM_CHECKERS], targ: &u8, low: usize, high: usize) -> Result<usize, usize> {
    debug_assert!(high >= low, "high < low! not allowed!");
    // adapted from rust src: https://doc.rust-lang.org/src/core/slice/mod.rs.html#2112-2114
    let mut left = low;
    let mut right = high;
    let mut result = Err(left);
    while left < right {
        let mid = (left + right) >> 1;
        if &positions.get_unchecked(mid) < &targ {
            left = mid + 1;
        } else {
            if &positions.get_unchecked(mid) == &targ {
                result = Ok(mid);
            }
            right = mid;
        }
    }

    if result.is_err() {
        result = Err(left);
    }
    return result;
}

#[inline]
unsafe fn last_binary_search(positions: &[u8; NUM_CHECKERS], targ: &u8, low: usize, high: usize) -> Result<usize, usize> {
    debug_assert!(high >= low, "high < low! not allowed!");
    // adapted from rust src: https://doc.rust-lang.org/src/core/slice/mod.rs.html#2112-2114
    let mut left = low;
    let mut right = high;
    let mut result = Err(left);
    while left < right {
        let mid = (left + right) >> 1;
        if &positions.get_unchecked(mid) > &targ {
            right = mid;
        } else {
            if &positions.get_unchecked(mid) == &targ {
                result = Ok(mid);
            }
            left = mid + 1;
        }
    }

    if result.is_err() {
        result = Err(left);
    }
    return result;
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use rand::Rng;

    #[test]
    fn val_to_u8() {
        assert_eq!(piece_val_to_u8(&json!("bar")), BAR);
        assert_eq!(piece_val_to_u8(&json!("home")), HOME);
        assert_eq!(piece_val_to_u8(&json!(4)), 4);
        assert_eq!(piece_val_to_u8(&json!(17)), 17);
    }

    #[test]
    fn u8_to_val() {
        assert_eq!(piece_u8_to_val(BAR), json!("bar"));
        assert_eq!(piece_u8_to_val(HOME), json!("home"));
        assert_eq!(piece_u8_to_val(4), json!(4));
        assert_eq!(piece_u8_to_val(17), json!(17));
    }

    #[test]
    #[should_panic]
    fn panic_u8_to_val() {
        piece_u8_to_val(26);
    }

    #[test]
    #[should_panic]
    fn panic_val_to_u8() {
        piece_val_to_u8(&json!("x"));
    }

    const TEST_POSITIONS: [u8; NUM_CHECKERS] = [3, 3, 5, 5, 7, 8, 9, 11, 11, 12, 13, 13, 13, 13, 15];

    fn naive_move_checkers(positions: &[u8; NUM_CHECKERS], start_val: &u8, end_val: &u8) -> [u8; NUM_CHECKERS] {
        let index = positions.binary_search(start_val).ok().unwrap();
        let mut new_pos = positions.clone();
        new_pos[index] = *end_val;
        new_pos.sort();
        new_pos
    }

    #[test]
    #[should_panic]
    fn move_nonexistent() {
        let mut positions = TEST_POSITIONS.clone();
        move_checker(&mut positions, &10, &11);
    }

    #[test]
    fn move_up() {
        let mut positions = TEST_POSITIONS.clone();
        move_checker(&mut positions, &5, &10);
        assert_eq!(positions, naive_move_checkers(&TEST_POSITIONS, &5, &10));
        positions = TEST_POSITIONS.clone();
        move_checker(&mut positions, &3, &25);
        assert_eq!(positions, naive_move_checkers(&TEST_POSITIONS, &3, &25));
    }

    #[test]
    fn move_down() {
        let mut positions = TEST_POSITIONS.clone();
        move_checker(&mut positions, &11, &0);
        assert_eq!(positions, naive_move_checkers(&TEST_POSITIONS, &11, &0));
        positions = TEST_POSITIONS.clone();
        move_checker(&mut positions, &13, &12);
        assert_eq!(positions, naive_move_checkers(&TEST_POSITIONS, &13, &12));
    }

    #[test]
    fn move_random() {
        let mut positions = TEST_POSITIONS.clone();
        let mut naive_pos = TEST_POSITIONS.clone();

        let mut rng = rand::thread_rng();

        for _ in 0..100_000 {
            let start_ind = rng.gen_range(0..NUM_CHECKERS);
            let start_val = positions[start_ind];
            let end_val = rng.gen_range(BAR..HOME + 1);
            move_checker(&mut positions, &start_val, &end_val);
            naive_pos = naive_move_checkers(&naive_pos, &start_val, &end_val);
            assert_eq!(positions, naive_pos);
        }
    }

    #[test]
    fn double_bs() {
        assert_eq!(
            double_binary_search(&TEST_POSITIONS, &3, &5),
            (Ok(1), Ok(2))
        );
        assert_eq!(
            double_binary_search(&TEST_POSITIONS, &5, &3),
            (Ok(2), Ok(1))
        );
        assert_eq!(
            double_binary_search(&TEST_POSITIONS, &5, &10),
            (Ok(3), Err(7))
        );
        assert_eq!(
            double_binary_search(&TEST_POSITIONS, &4, &10),
            (Err(2), Err(7))
        );
        assert_eq!(
            double_binary_search(&TEST_POSITIONS, &8, &BAR),
            (Ok(5), Err(0))
        );
        assert_eq!(
            double_binary_search(&TEST_POSITIONS, &8, &HOME),
            (Ok(5), Err(15))
        );
        assert_eq!(
            double_binary_search(&TEST_POSITIONS, &13, &13),
            (Ok(10), Ok(13))
        );
    }

    #[test]
    fn bops() {
        let mut positions = TEST_POSITIONS;
        try_bop(&mut positions, &5);
        assert_eq!(positions, TEST_POSITIONS);
        try_bop(&mut positions, &3);
        assert_eq!(positions, TEST_POSITIONS);
        try_bop(&mut positions, &11);
        assert_eq!(positions, TEST_POSITIONS);
        try_bop(&mut positions, &4);
        assert_eq!(positions, TEST_POSITIONS);

        let mut comp_pos = naive_move_checkers(&TEST_POSITIONS, &8, &0);
        try_bop(&mut positions, &8);
        assert_eq!(positions, comp_pos);

        comp_pos = naive_move_checkers(&mut comp_pos, &9, &0);
        try_bop(&mut positions, &9);
        assert_eq!(positions, comp_pos);

        try_bop(&mut positions, &8);
        assert_eq!(positions, comp_pos);

        positions = [0,1,2,2,2,2,6,6,6,6,8,15,15,20,22];
        comp_pos = naive_move_checkers(&mut positions.clone(), &22, &0);
        try_bop(&mut positions, &22);
        assert_eq!(positions, comp_pos);
    }

    #[test]
    fn count() {
        let positions = TEST_POSITIONS;
        assert_eq!(count_occur(&positions, &3), 2);
        assert_eq!(count_occur(&positions, &5), 2);
        assert_eq!(count_occur(&positions, &7), 1);
        assert_eq!(count_occur(&positions, &8), 1);
        assert_eq!(count_occur(&positions, &9), 1);
        assert_eq!(count_occur(&positions, &11), 2);
        assert_eq!(count_occur(&positions, &12), 1);
        assert_eq!(count_occur(&positions, &13), 4);
        assert_eq!(count_occur(&positions, &15), 1);
        assert_eq!(count_occur(&positions, &1), 0);
        assert_eq!(count_occur(&positions, &14), 0);
        assert_eq!(count_occur(&positions, &6), 0);
    }
}