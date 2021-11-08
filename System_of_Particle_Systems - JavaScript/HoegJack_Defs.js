/*
	Particle Definitions
	by Jack Hoeg
	Last Edited: February 6, 2020
*/

//
const SYS_CPU = 0;		// Simulation done entirely on CPU
const SYS_GPU = 1;		// Simulation done entirely on GPU
const SYS_HYBRID = 2;	// Simulation done Primarily on GPU, with some CPU support

//Used for GPU Systems
const PART_AGE 	= 0;
const PART_LIFE = 1;
const PART_XPOS = 2;
const PART_YPOS = 3;
const PART_ZPOS = 4;
const PART_XVEL = 5;
const PART_YVEL = 6;
const PART_ZVEL = 7;			//Ftot is not necessary for GPU System
const PART_XACC = 8;			//stores previous acceleration for use
const PART_YACC = 9;			//	in velocity verlet solver
const PART_ZACC = 10;
const PART_MASS = 11;
const PART_HUE 	= 12;
const PART_SAT 	= 13;
const PART_INT	= 14;
const PART_MAXVAR = 15;

//Used for CPU and Hybrid Systems
const CPU_PART_AGE = PART_AGE;
const CPU_PART_LIFE = PART_LIFE;
const CPU_PART_XPOS = PART_XPOS;
const CPU_PART_YPOS = PART_YPOS;
const CPU_PART_ZPOS = PART_ZPOS;
const CPU_PART_XVEL = PART_XVEL;
const CPU_PART_YVEL = PART_YVEL;
const CPU_PART_ZVEL = PART_ZVEL;
const CPU_PART_XACC = PART_XACC;
const CPU_PART_YACC = PART_YACC;		//stores previous acceleration for use
const CPU_PART_ZACC = PART_ZACC;		//	in velocity verlet solver
const CPU_PART_MASS = PART_MASS;
const CPU_PART_HUE	= PART_HUE;
const CPU_PART_SAT	= PART_SAT;
const CPU_PART_INT 	= PART_INT;
const CPU_PART_X_FTOT = CPU_PART_INT + 1;
const CPU_PART_Y_FTOT = CPU_PART_X_FTOT + 1;
const CPU_PART_Z_FTOT = CPU_PART_Y_FTOT + 1;
const CPU_PART_MAXVAR = CPU_PART_Z_FTOT + 1;

const F_NONE = 0; 	// disabled; inactive force-making object
const F_GRAV_E = 1; // global earth gravity: force is -grav_e*mass in 'downDir' direction
const F_GRAV_P = 2; // planetary gravity due to mass of particle e0
const F_DRAG = 3;	// applies a viscous drag
const F_SPRING = 4; // applies spring force between particle e0 and e1
const F_SPRING_MESH = 5; //stores strut parameters for an entire mesh
const F_FLOCK = 6;
const F_STATIC = 7;	// static force, accelerates particles based on mass
const F_FIELD = 8;	// A force field! Attract/Repel
const F_MAXVAR = 9; // number of types of force-causing objects possible

const LIM_NONE = 0; 		// disabled; inactive constraint-causing object
const LIM_VOL = 1; 			// Rect Volume that isn't axis aligned
const LIM_BALL_IN = 2;		// spherical solid barrier centered at px, py, pz; radius
const LIM_BALL_OUT = 3; 	// spherical solid barrier centered at px, py, pz; radius
const LIM_PLATE = 4; 		// arbitrary bouncy rectatngle
const LIM_PLATE_HOLE = 5;	// bouncy rectangle with hole
const LIM_INF_PLANE = 6;	// infinite plane
const LIM_VORTEX = 7; 		// Vortex		
const LIM_COLOR_AGE = 8;	// As age increases, intensity decreases	
const LIM_COLOR_VEL = 9;	// Angle of Velocity Determines Hue	
const LIM_VEL_CMPDR = 10;	// Velocity Compander
const LIM_MAXVAR = 11; 		// number of types of limit-causing objects possible

//Solvers
const SOLV_EULER = 0;		//euler
const SOLV_MIDPOINT = 1;	//midpoint
const SOLV_VEL_VERLET = 2;	//velocity verlet
const SOLV_BACK_EULER = 3;	//backwind euler
const SOLV_BACK_MIDPT = 4;	//backwind midpoint
const SOLV_SYMP_EULER = 5;	//semi-implicit euler
const SOLV_MAX = 6;

// //explicit
// const SOLV_NAIVE = 0;
// const SOLV_EULER = 1;			//s1 + s1dot * h
// const SOLV_MIDPOINT = 2;
// const SOLV_ADAMS_BASH = 3;
// const SOLV_RUNGEKUUTTA = 4;
// //implicit
// const SOLV_BACK_EULER = 5;
// const SOLV_BACK_MIDPT = 6;
// const SOLV_BACK_ADBASH = 7;
// //semi-implicit
// const SOLV_VERLET = 8;
// const SOLV_VEL_VERLET = 9;
// const SOLV_LEAPFROG = 10;
// const SOLV_MAX = 11;

//Emitters
const E_POINT = 0;		// single point
const E_VOL = 1;		// rectangular prism
const E_SPHERE = 2;		// sphere
const E_DISC = 3;		// flat disc
const E_RECT = 4;		// flat quad
const E_MAX = 5;