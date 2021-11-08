use crate::{
    dice_tracker::DiceTracker,
    player_board::flip_move,
    r#move::Move,
};

pub struct TurnNode {
    next: Vec<Box<TurnNode>>,
    scr: usize,
    mve: Move,
    dice: DiceTracker,
    max_depth: u8,
}

impl TurnNode {
    pub fn new(mve: Move, tracker: DiceTracker) -> TurnNode {
        TurnNode {
            max_depth: 1,
            mve,
            dice: tracker,
            scr: 0,
            next: Vec::with_capacity(0),
        }
    }

    #[inline]
    pub fn num_node_branches(&self) -> usize {
        self.next.len()
    }

    #[inline]
    pub fn set_branches(&mut self, branches: Vec<Box<TurnNode>>) {
        self.next = branches;
    }

    #[inline]
    pub fn get_branches(&self) -> &Vec<Box<TurnNode>> {
        &self.next
    }

    #[inline]
    pub fn get_mut_branches(&mut self) -> &mut Vec<Box<TurnNode>> {
        &mut self.next
    }

    #[inline]
    pub fn get_move(&self) -> &Move {
        &self.mve
    }

    #[inline]
    pub fn get_dice_tracker(&self) -> &DiceTracker { &self.dice }

    #[inline]
    pub fn get_max_depth(&self) -> u8 {
        self.max_depth
    }

    pub fn compute_depth(&mut self) -> u8 {
        //! sets max_depth recursively, based on depth of children
        if self.next.is_empty() {
            self.max_depth = 1;
            return self.max_depth;
        } else {
            let mut max: u8 = 0;
            for node in self.next.iter_mut() {
                let depth = node.compute_depth();
                if depth > max {
                    max = depth;
                }
            }
            self.max_depth = max + 1;
            return self.max_depth;
        }
    }

    pub fn prune(&mut self, depth: &u8) {
        //! removes all branches that are of lesser depth
        self.next.retain(|node| &node.get_max_depth() == &(depth - &1));
        for node in self.next.iter_mut() {
            node.prune(&(depth - &1));
        }
    }

    pub fn to_array(&self, arr: &mut Vec<Vec<Move>>) {
        self.add_to_array(&mut Vec::with_capacity(self.max_depth as usize), arr);
    }

    pub fn add_to_array(&self, mve_vec: &mut Vec<Move>, arr: &mut Vec<Vec<Move>>) {
        //! recursively creates Vec<Move> and pushes it to arr
        mve_vec.push(self.mve.clone());
        if self.max_depth == 1 {
            arr.push(mve_vec.to_vec());
        } else {
            for node in self.next.iter() {
                node.add_to_array(&mut mve_vec.clone(), arr);
            }
        }
    }

    pub fn num_paths(&self) -> usize {
        //! recursivly computes the number of turns represented in tree
        match self.max_depth {
            1 => 1,
            2 => self.next.len(),
            _ => {
                let mut sum: usize = 0;
                for node in self.next.iter() {
                    sum += node.num_paths();
                }
                sum
            }
        }
    }

    pub fn flip_tree(&mut self) {
        //! recursively flips perspective of the move (for use by PlayerBoard)
        self.mve = flip_move(&self.mve);
        for node in self.next.iter_mut() {
            node.flip_tree();
        }
    }

    pub fn actual_tree_size(&self) -> usize {
        let mut size = 1;
        for node in self.next.iter() {
            size += node.actual_tree_size();
        }
        size
    }

    #[inline]
    pub fn set_score(&mut self, score: usize) {
        self.scr = score;
    }

    #[inline]
    pub fn get_score(&self) -> &usize {
        &self.scr
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::r#move::Move;
    use crate::dice_tracker::DiceTracker;

    fn testing_dice() -> Vec<u8> {
        vec!(2u8, 3u8)
    }

    fn testing_tree() -> TurnNode {
        let mut node = TurnNode::new(
            Move { start: 5, end: 8},
            DiceTracker::new(&testing_dice()));
        let node1 = TurnNode::new(
            Move { start: 6, end: 8},
            DiceTracker::new(&testing_dice()));
        let node2 = TurnNode::new(
            Move { start: 4, end: 6},
            DiceTracker::new(&testing_dice()));
        let node3 = TurnNode::new(
            Move { start: 3, end: 5},
            DiceTracker::new(&testing_dice()));
        let mut branches = Vec::with_capacity(3);
        branches.push(Box::new(node1));
        branches.push(Box::new(node2));
        branches.push(Box::new(node3));
        node.set_branches(branches);
        node
    }

    fn four_dice() -> Vec<u8> { vec!(2u8, 2u8, 2u8, 2u8) }

    fn asym_tree() -> TurnNode {
        let mut node = TurnNode::new(
            Move { start: 13, end: 11},
            DiceTracker::new(&four_dice()));
        let node1 = TurnNode::new(
            Move { start: 11, end: 9},
            DiceTracker::new(&four_dice()));
        let mut node2 = TurnNode::new(
            Move { start: 15, end: 13},
            DiceTracker::new(&four_dice()));
        let node3 = TurnNode::new(
            Move { start: 16, end: 14},
            DiceTracker::new(&four_dice()));
        let node21 = TurnNode::new(
            Move { start: 11, end: 9},
            DiceTracker::new(&four_dice()));
        let node22 = TurnNode::new(
            Move { start: 16, end: 14},
            DiceTracker::new(&four_dice()));
        let mut n2branches = Vec::with_capacity(2);
        n2branches.push(Box::new(node21));
        n2branches.push(Box::new(node22));
        node2.set_branches(n2branches);
        let mut branches = Vec::with_capacity(3);
        branches.push(Box::new(node1));
        branches.push(Box::new(node2));
        branches.push(Box::new(node3));
        node.set_branches(branches);
        node
    }

    fn test_flip_tree(node: &mut TurnNode, cmp_node: &TurnNode) {
        node.flip_tree();
        compare_flipped(node, cmp_node);

        fn compare_flipped(norm_node: &TurnNode, cmp_node: &TurnNode) {
            let node_move = norm_node.get_move();
            let cmp_move = cmp_node.get_move();
            assert_eq!(node_move, &flip_move(cmp_move));
            let norm_branches = norm_node.get_branches();
            let cmp_branches = cmp_node.get_branches();
            for i in 0..norm_branches.len() {
                compare_flipped(&norm_branches[i], &cmp_branches[i]);
            }
        }
    }

    #[test]
    fn scores() {
        let mut node = testing_tree();
        assert_eq!(node.get_score(), &0usize);
        node.set_score(17);
        assert_eq!(node.get_score(), &17usize);
        node.set_score(22);
        assert_eq!(node.get_score(), &22usize);
    }

    #[test]
    fn flip() {
        let tt = testing_tree();
        let mut main_tt = testing_tree();
        test_flip_tree(&mut main_tt, &tt);
        test_flip_tree(&mut asym_tree(), &asym_tree());
    }

    #[test]
    fn counting_stuff() {
        let mut node = testing_tree();
        assert_eq!(node.actual_tree_size(), 4);
        node.compute_depth();
        assert_eq!(node.max_depth, 2);
        assert_eq!(node.num_paths(), 3);
    }

    #[test]
    fn depth() {
        let mut tt = testing_tree();
        assert_eq!(tt.get_max_depth(), 1);
        tt.compute_depth();
        assert_eq!(tt.get_max_depth(), 2);
        assert_eq!(tt.next[0].max_depth, 1);

        let mut ast = asym_tree();
        assert_eq!(ast.get_max_depth(), 1);
        ast.compute_depth();
        assert_eq!(ast.get_max_depth(), 3);
        assert_eq!(ast.next[0].max_depth, 1);
        assert_eq!(ast.next[1].max_depth, 2);
        assert_eq!(ast.next[2].max_depth, 1);
        assert_eq!(ast.next[1].next[0].max_depth, 1);
        assert_eq!(ast.next[1].next[1].max_depth, 1);
    }

    #[test]
    fn pruning() {
        let cmp_tt = testing_tree();
        let mut tt = testing_tree();
        tt.compute_depth();
        tt.prune(&tt.get_max_depth());
        assert_eq!(tt.next.len(), cmp_tt.next.len());
        tt.prune(&10);
        assert_eq!(tt.next.len(), 0);

        let mut ast = asym_tree();
        ast.compute_depth();
        ast.prune(&ast.get_max_depth());
        assert_eq!(ast.next.len(), 1);
        assert_eq!(ast.next[0].mve, asym_tree().next[1].mve);
        assert_eq!(ast.next[0].next.len(), 2);
    }
}