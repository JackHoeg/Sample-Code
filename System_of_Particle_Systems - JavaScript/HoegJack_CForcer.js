/*
	CForcer
	by Jack Hoeg
	Last Edited: February 7, 2020
*/

/*
	TODO:
		Forces to Add:
			- Mass change over life
			- Color change from distance
			- Attract / Repel from point (interactive)
			- Random
			- Traveling Waves
		Add fluid density to drag
		Vortex as a force?
		Align to Spline
 */

/**
 * Constructor for CForcer
 *
 * @param {Number} type determines which type of forcer to initialize
 */
function CForcer(type, a, b, c, d, e, f, g, h) {
	this.forceType = type;
	this.init(a, b, c, d, e, f, g, h);
	this.id = 0;
}

//====INITITALIZATION====//

/**
 * Determines which initF function to call based on this.forceType
 *
 */
CForcer.prototype.init = function(a, b, c, d, e, f, g, h) {
	switch(this.forceType) {
		case F_GRAV_E:
			if (typeof(a) != "undefined" && typeof(b) != "undefined")
				this.initFGravE(a, b);
			else
				this.initFGravE(9.832, [0.0, 0.0, -1.0]);
			break;
		case F_GRAV_P:
			if (typeof(a) != "undefined" && typeof(b) != "undefined")
				this.initFGravP(a, b);
			else
				this.initFGravP(1.0, 0);
			break;
		case F_DRAG:
			if (typeof(a) != "undefined")
				this.initFDrag(a);
			else
				this.initFDrag(0.15);
			break;
		case F_SPRING:
			if (typeof(a) != "undefined" && typeof(b) != "undefined")
				this.initFSpring(a, b, c, d, e);
			else
				this.initFSpring(0, CPU_PART_MAXVAR);
			break;
		case F_SPRING_MESH:
			this.initFSpringMesh();
			break;
		case F_FLOCK:
			if (typeof(a) != "undefined" && typeof(b) != "undefined")
				this.initFFlock(a, b, c, d, e, f, g, h);
			else 
				this.initFFlock(2, 10, 10, 15, 20, 90, 150, 1);
			break;
		case F_STATIC:
			if (typeof(a) != "undefined" && typeof(b) != "undefined")
				this.initFStatic(a, b);
			else
				this.initFStatic([0.0, 0.0, 1.0], 15.0);
			break;
		case F_FIELD:
			if (typeof(a) != "undefined" && typeof(b) != "undefined")
				this.initFField(a, b, c, d);
			else
				this.initFField([0, 0, 0], 5, 5, 2);
		default:
		case F_NONE:
			break;
	}
}

/**
 * Initializes earth (or large-body) gravity
 *
 * @param {float} acc acceleration due to gravity
 * @param {vec3} down direction vector
 */
CForcer.prototype.initFGravE = function(acc, down) {
	this.grav_e = acc;	//earth's gravity g (causes force m*g)
	this.downDir = glMatrix.vec3.fromValues(down[0], down[1], down[2]);	//earth's 'down' direction
}

/**
 * Initializes planetary gravity
 *
 * @param {float} gp planetary gravitational constant
 * @param {Uint16} ind index of particle to attract everybody to
 */
CForcer.prototype.initFGravP = function(gp, ind) {
	this.grav_p = gp;						//planetary gravitational constant
	this.e0 = 0;							//particle starting index
	this.r = 2;								//planet radius prevents divide by zero
}

/**
 * Initializes drag force
 *
 * @param {float} kd coefficient of drag
 */
CForcer.prototype.initFDrag = function(kd) {
	this.K_drag = kd;						//viscous drag (vel * m * K_drag)
}

/**
 * Initializes spring force
 *
 * @param {Number} ind1 index of particle 1
 * @param {Number} ind2 index of particle 2
 * @param {Number} ks spring constant
 * @param {Number} kd damping constant
 * @param {Number} len rest length
 */
CForcer.prototype.initFSpring = function(ind1, ind2, ks, kd, len) {
	this.Ks = ks;							//spring constant
	this.Ds = kd;							//damping constant
	this.len_s = len;						//spring rest-length
	this.e0 = ind1;							//particle starting index
	this.e1 = ind2;							//particle starting index
}

/**
 * Initializes spring mesh
 *
 */
CForcer.prototype.initFSpringMesh = function() {
	/**
	 * Creates a struct for struts
	 */
	function strut(k, d, l, vi, fi) {
		this.Ks = k;	//spring constant
		this.Ds = d;	//damping constant
		this.len = l;	//spring rest-length
		this.vi = vi;	//vertex indices
		this.fi = fi;	//face indices
	}
	
	this.strutInd = new UInt16Array(); //strut indicies
	this.vertAng = new Float32Array(); //vertex angles
}

/**
 * Initializes Flocking
 *
 * @param {float} ka collision avoidance coefficient
 * @param {float} kv velocity matching coefficient
 * @param {float} kc centering coefficient
 * @param {float} r1 lower distance bound
 * @param {float} r2 upper distance bound
 * @param {float} fron frontal view cone, degrees
 * @param {float} per peripheral view cone, degrees
 * @param {float} ar residual acceleration
 */
CForcer.prototype.initFFlock = function(ka, kv, kc, r1, r2, fron, per, ar) {
	this.Ka = ka;	//	Collision Avoidance
	this.Kv	= kv;	//	Velocity Matching
	this.Kc = kc;	//	Centering
	this.R1 = r1;	//	distance threshold one
	this.R2 = r2;	//	distance threshold two
	this.frontal= glMatrix.glMatrix.toRadian(fron);	// degrees of frontal view
	this.periph = glMatrix.glMatrix.toRadian(per);	// degrees of peripheral
	this.Ar = ar;		//Residual Acceleration (Max Accel)
}

/**
 * Initializes Static Force
 *
 * @param {vec3} d direction of force
 * @param {float} mag magnitude of force
 */
CForcer.prototype.initFStatic = function(d, mag) {
	this.dir = glMatrix.vec3.clone(d);
	glMatrix.vec3.normalize(this.dir, this.dir);
	glMatrix.vec3.scale(this.dir, this.dir, mag);
}

/**
 * Initializes Field Force
 *
 * @param {vec3} pos position of force
 * @param {float} r radius of force
 * @param {float} strength strength of force
 * @param {float} p additive accel
 */
CForcer.prototype.initFField = function(pos, r, strength, p) {
	this.modelMat = glMatrix.mat4.create();

	this.pos = glMatrix.vec3.clone(pos);
	this.radius = r;
	this.strength = strength;
	this.addAcc = p;
	
	this.vboContents = generator.sphere(pos, r, 24);
	this.iboContents = generator.sphereIndLS(24);
}

//====CALCULATION====//

/*
	TODO:
		GRAV_P has a tendency to hurl particles into infinity
 */

/**
 * Determines which calc function to call in order to calculate force
 * Assumes s[i+PART_X_FTOT], s[i+PART_Y_FTOT], s[i+PART_Z_FTOT] === 0
 *
 * @param {Float32Array} s state-variable being modified
 * @param {Number} i index of particle to check
 */
CForcer.prototype.calculate = function(s, i) {
	switch(this.forceType) {
		case F_GRAV_E:
			this.calcFGravE(s, i);
			break;
		case F_GRAV_P:
			this.calcFGravP(s, i);
			break;
		case F_DRAG:
			this.calcFDrag(s, i);
			break;
		case F_SPRING:
			this.calcFSpring(s, i);
			break;
		case F_SPRING_MESH:
			this.calcFSpringMesh(s, i);
			break;
		case F_FLOCK:
			this.calcFFlock(s, i);
			break;
		case F_STATIC:
			this.calcFStatic(s, i);
			break;
		case F_FIELD:
			this.calcFField(s, i);
			break;
		default:
		case F_NONE:
			break;
	}
}

/**
 * Calculates the earth's (or any large-body's) gravity acting on a particle
 *
 * @param {Float32Array} s state-variable being modified
 * @param {Number} i index of particle to check
 */
CForcer.prototype.calcFGravE = function(s, i) {
	// TODO: Might be faster if PART_MASS < PART_X_FTOT, Y_FTOT, Z_FTOT?
	var forc = this.grav_e * s[i + CPU_PART_MASS];
	s[i+CPU_PART_X_FTOT] += this.downDir[0] * forc;
	s[i+CPU_PART_Y_FTOT] += this.downDir[1] * forc;
	s[i+CPU_PART_Z_FTOT] += this.downDir[2] * forc;
}

/**
 * Calculates the planetary gravity acting on a particle
 *
 * @param {Float32Array} s state-variable being modified
 * @param {Number} i index of particle to check
 */
CForcer.prototype.calcFGravP = function(s, i) {
	if (i != this.e0) {
		var dirVec = glMatrix.vec3.fromValues(	s[this.e0+CPU_PART_XPOS] - s[i+CPU_PART_XPOS],	//direction vector
										s[this.e0+CPU_PART_YPOS] - s[i+CPU_PART_YPOS],
										s[this.e0+CPU_PART_ZPOS] - s[i+CPU_PART_ZPOS]);
		var forc = this.grav_p * s[this.e0+CPU_PART_MASS] * s[i+CPU_PART_MASS];
		var distSq = glMatrix.vec3.sqrLen(dirVec) + this.r; 				//x^2 + y^2 + z^2
		forc /= distSq;											//F = (GMm)/(r^2)
		var dist = glMatrix.vec3.length(dirVec); 				//distance
		var divMag = 1.0/dist;									//1 / magnitude
		forc *= divMag;											//normalize and apply force simult.
		glMatrix.vec3.scale(dirVec, dirVec, forc);
		s[i+CPU_PART_X_FTOT] += dirVec[0];
		s[i+CPU_PART_Y_FTOT] += dirVec[1];
		s[i+CPU_PART_Z_FTOT] += dirVec[2];
	}
}

/**
 * Calculates the force of drag acting on a particle
 *
 * @param {Float32Array} s state-variable being modified
 * @param {Number} i index of particle to check
 */
CForcer.prototype.calcFDrag = function(s, i) {
	// TODO: Might be faster if PART_MASS < PART_XVEL, YVEL, ZVEL?
	var mass_drag = s[i+CPU_PART_MASS] * this.K_drag;
	s[i+CPU_PART_X_FTOT] -= s[i+CPU_PART_XVEL] * mass_drag;
	s[i+CPU_PART_Y_FTOT] -= s[i+CPU_PART_YVEL] * mass_drag;
	s[i+CPU_PART_Z_FTOT] -= s[i+CPU_PART_ZVEL] * mass_drag;
}

/**
 * Calculates the spring force acting on 2 particles
 *
 * @param {Float32Array} s state-variable being modified
 * @param {Number} i index of particle to check
 */
CForcer.prototype.calcFSpring = function(s, i) {
	if (i == this.e0) {
		var dirVec = glMatrix.vec3.fromValues(	s[this.e1+CPU_PART_XPOS] - s[this.e0+CPU_PART_XPOS],
										s[this.e1+CPU_PART_YPOS] - s[this.e0+CPU_PART_YPOS],
										s[this.e1+CPU_PART_ZPOS] - s[this.e0+CPU_PART_ZPOS]);
		var dist = glMatrix.vec3.len(dirVec);
		var displaceLength = dist - this.len_s;
		glMatrix.vec3.normalize(dirVec, dirVec);
		
		var fs = this.Ks * displaceLength;
		var fd = this.Ds;
		glMatrix.vec3.scale(dirVec, dirVec, fs); //dirVec = Fs
		
		
		
		s[this.e0+CPU_PART_X_FTOT] += dirVec[0] - fd * s[this.e0+CPU_PART_XVEL];
		s[this.e0+CPU_PART_Y_FTOT] += dirVec[1] - fd * s[this.e0+CPU_PART_YVEL];
		s[this.e0+CPU_PART_Z_FTOT] += dirVec[2] - fd * s[this.e0+CPU_PART_ZVEL];
	 	
	 
		s[this.e1+CPU_PART_X_FTOT] -= dirVec[0] + fd * s[this.e1+CPU_PART_XVEL];
		s[this.e1+CPU_PART_Y_FTOT] -= dirVec[1] + fd * s[this.e1+CPU_PART_YVEL];
		s[this.e1+CPU_PART_Z_FTOT] -= dirVec[2] + fd * s[this.e1+CPU_PART_ZVEL];
	}
}

/**
 * Calculates the damped spring force acting on a particle
 *
 */
CForcer.prototype.calcFSpringMesh = function(s, i) {
	//ma = Fe + Fk + Fd or ma = Fe - kx - dv
}

// TODO: Add Steering to Flocking

/**
 * Calculates flocking!
 *
 */
 CForcer.prototype.calcFFlock = function(s, i) {
 	var iPos = glMatrix.vec3.create();
 	iPos[0] = s[i+CPU_PART_XPOS];
 	iPos[1] = s[i+CPU_PART_YPOS];
 	iPos[2] = s[i+CPU_PART_ZPOS];
 	
 	var iVel = glMatrix.vec3.create();
 	iVel[0] = s[i+CPU_PART_XVEL];
 	iVel[1] = s[i+CPU_PART_YVEL];
 	iVel[2] = s[i+CPU_PART_ZVEL];
 	
 	var ar = this.Ar;
 	
 	var iAcc = glMatrix.vec3.create(); 	//sum
 	var iAccA = glMatrix.vec3.create();	//collision avoidance
 	var iAccV = glMatrix.vec3.create(); //velocity matching
 	var iAccC = glMatrix.vec3.create(); //centering
 	
 	var jPos = glMatrix.vec3.create();
 	var jVel = glMatrix.vec3.create();
 	
 	var ijDirec = glMatrix.vec3.create(); //vector between i and j
 	
 	for (j = 0; j < s.length; j += CPU_PART_MAXVAR) {
 		if (j == i)
 			continue;
 		
 		jPos[0] = s[j+CPU_PART_XPOS];
 		jPos[1] = s[j+CPU_PART_YPOS];
 		jPos[2] = s[j+CPU_PART_ZPOS];
 		jVel[0] = s[j+CPU_PART_XVEL];
 		jVel[1] = s[j+CPU_PART_YVEL];
 		jVel[2] = s[j+CPU_PART_ZVEL];
 		
 		glMatrix.vec3.subtract(ijDirec, jPos, iPos);
 		
 		var Kd;		//distance weighting factor;
 		var distance = glMatrix.vec3.len(ijDirec);
 		
 		
 		if (distance < this.R1) {
 			Kd = 1.0;
 		} else if (distance <= this.R2) {
 			Kd = (this.R2 - distance) / (this.R2 - this.R1);
 		} else {
 			Kd = 0;
 			continue;	//if zero move on to next boid
 		}
 		
 		var Kang;	//fov weighting factor
 		var ijAng = Math.abs(glMatrix.vec3.angle(iVel, jPos));
 		
 		if (ijAng <= this.frontal / 2.0) {
 			Kang = 1.0;
 		} else if (ijAng <= this.peripheral / 2.0) {
 			Kang = ((this.peripheral / 2.0) - ijAng) / ((this.peripheral - this.frontal)/2);
 		} else {
 			Kang = 0;
 			continue;	//if zero move on to next boid
 		}
		
		var Kdang = Kd * Kang;
		
		glMatrix.vec3.scaleAndAdd(iAccC, iAccC, ijDirec, Kdang * this.Kc); //centering
		
 		glMatrix.vec3.normalize(ijDirec, ijDirec);
 		glMatrix.vec3.scaleAndAdd(iAccA, iAccA, ijDirec, Kdang * -this.Ka / distance); //avoid
 		
 		glMatrix.vec3.subtract(jVel, jVel, iVel);
 		glMatrix.vec3.scaleAndAdd(iAccV, iAccV, jVel, Kdang * this.Kv); //velocity
 	}
 	
 	var mag = glMatrix.vec3.len(iAccA);
 	glMatrix.vec3.normalize(iAccA, iAccA);
 	glMatrix.vec3.scale(iAccA, iAccA, Math.min(ar, mag));
 	
 	glMatrix.vec3.add(iAcc, iAcc, iAccA);
 	ar -= glMatrix.vec3.len(iAccA);
 	
 	mag = glMatrix.vec3.len(iAccV);
 	glMatrix.vec3.normalize(iAccV, iAccV);
 	glMatrix.vec3.scale(iAccV, iAccV, Math.min(ar, mag));
 	
 	glMatrix.vec3.add(iAcc, iAcc, iAccV);
 	ar -= glMatrix.vec3.len(iAccV);
 	
 	mag = glMatrix.vec3.len(iAccC);
 	glMatrix.vec3.normalize(iAccV, iAccC);
 	glMatrix.vec3.scale(iAccC, iAccC, Math.min(ar, mag));
 	
 	glMatrix.vec3.add(iAcc, iAcc, iAccC);
 	
 	glMatrix.vec3.scale(iAcc, iAcc, s[i+CPU_PART_MASS]);
 	s[i+CPU_PART_X_FTOT] = iAcc[0];
 	s[i+CPU_PART_Y_FTOT] = iAcc[1];
 	s[i+CPU_PART_Z_FTOT] = iAcc[2];
 	
 	
 	//not relevant without rotation
//  	var ux = glMatrix.vec3.create();
//  	glMatrix.vec3.normalize(ux, iVel);
//  	var uy = glMatrix.vec3.create(); 
//  	glMatrix.vec3.cross(uy, iVel, iAcc);
//  	glMatrix.vec3.normalize(uy, uy);
//  	var uz = glMatrix.vec3.create();
//  	glMatrix.vec3.cross(ux, uy);
//  	glMatrix.vec3.normalize(uz, uz);

 }
 
/**
 * Calculates the earth's (or any large-body's) gravity acting on a particle
 *
 * @param {Float32Array} s state-variable being modified
 * @param {Number} i index of particle to check
 */
CForcer.prototype.calcFStatic = function(s, i) {
	s[i+CPU_PART_X_FTOT] += this.dir[0];
	s[i+CPU_PART_Y_FTOT] += this.dir[1];
	s[i+CPU_PART_Z_FTOT] += this.dir[2];
}

/**
 * Calculates the force from a gravitational attractor
 * 
 * @param {Float32Array} s state-variable being modified
 * @param {Number} i index of particle to check
 */
CForcer.prototype.calcFField = function(s, i) {
	var posAfter = glMatrix.vec3.fromValues(	s[i+CPU_PART_XPOS],
												s[i+CPU_PART_YPOS],
												s[i+CPU_PART_ZPOS]);
	var diff = glMatrix.vec3.create();
	glMatrix.vec3.subtract(diff, this.pos, posAfter);

	var dist = glMatrix.vec3.length(diff);
	
	if ((dist > this.radius) || (this.strength < 0 && dist < 1))
		return;
	
	dist = 1 / dist;
	glMatrix.vec3.scale(diff, diff, dist); //normalize
	
	var acc = glMatrix.vec3.create();
	
	var coef = -this.strength * Math.pow(dist, this.addAcc);
	glMatrix.vec3.scale(acc, diff, coef * s[i+CPU_PART_MASS]);
	
	s[i+CPU_PART_X_FTOT] += acc[0]; 
	s[i+CPU_PART_Y_FTOT] += acc[1];
	s[i+CPU_PART_Z_FTOT] += acc[2];
}

//=============UNIFORMS=======================================================//

/**
 * Generates GLSL for the structs of each force
 *
 */
CForcer.prototype.getStructs = function() {
	var str = `
		struct F_GRAV_E {
			vec3 downDir;
			float acc;
		};
		
		struct F_DRAG {
			float K_drag;
		};
		
		struct F_STATIC {
			vec3 dir;
		};
		
		struct F_FIELD {
			vec3 pos;
			float radius;
			float strength;
			float addAcc;
		};
	`;
	return str;
}

/**
 * Generates GLSL for uniforms of each force
 *
 * @param {Number} t total indices of struct to create
 */
CForcer.prototype.getUniforms = function(t) {
	if (t != this.id)
		return "";
	
	var str = "";
	switch(this.forceType) {
		default:
			break;
		case F_GRAV_E:
			str += "uniform F_GRAV_E u_fGravE[" + t + "];\n";
			break;
		case F_DRAG:
			str += "uniform F_DRAG u_fDrag[" + t + "];\n";
			break;
		case F_STATIC:
			str += "uniform F_STATIC u_fStatic[" + t + "];\n";
			break;
		case F_FIELD:
			str += "uniform F_FIELD u_fField[" + t + "];\n";
			break;
	}
	return str;
}

/**
 * Stores the uniform locations in the force
 *
 * @param {ShaderLoc} shaderLoc location of shader that the force belongs to
 */
CForcer.prototype.getUniformLocations = function(shaderLoc) {
	switch(this.forceType) {
		default:
			break;
		case F_GRAV_E:
			this.u_downDir = gl.getUniformLocation(shaderLoc, 'u_fGravE[' + (this.id - 1) + '].downDir');
			this.u_acc = gl.getUniformLocation(shaderLoc, 'u_fGravE[' + (this.id - 1) + '].acc');
			break;
		case F_DRAG:
			this.u_kDrag = gl.getUniformLocation(shaderLoc, 'u_fDrag[' + (this.id - 1) + '].K_drag');
			break;
		case F_STATIC:
			this.u_dir = gl.getUniformLocation(shaderLoc, 'u_fStatic[' + (this.id - 1) + '].dir');
			break;
		case F_FIELD:
			this.u_pos = gl.getUniformLocation(shaderLoc, 'u_fField[' + (this.id - 1) + '].pos');
			this.u_radius = gl.getUniformLocation(shaderLoc, 'u_fField[' + (this.id - 1) + '].radius');
			this.u_strength = gl.getUniformLocation(shaderLoc, 'u_fField[' + (this.id - 1) + '].strength');
			this.u_addAcc = gl.getUniformLocation(shaderLoc, 'u_fField[' + (this.id - 1) + '].addAcc');
			break;
	}
}

/**
 * Binds uniforms to currently equipped shader
 */
CForcer.prototype.bindUniforms = function() {
	switch(this.forceType) {
		default:
			break;
		case F_GRAV_E:
			gl.uniform3fv(this.u_downDir, this.downDir);
			gl.uniform1f(this.u_acc, this.grav_e);
			break;
		case F_DRAG:
			gl.uniform1f(this.u_kDrag, this.K_drag);
			break;
		case F_STATIC:
			gl.uniform3fv(this.u_dir, this.dir);
			break;
		case F_FIELD:
			gl.uniform3fv(this.u_pos, this.pos);
			gl.uniform1f(this.u_radius, this.radius);
			gl.uniform1f(this.u_strength, this.strength);
			gl.uniform1f(this.u_addAcc, this.addAcc);
			break;
	}
}

//=============GENERATE GLSL CODE=============================================//

//=============Calculations

/**
 * Generates a string of GLSL code to handle the calculation in shader
 *
 * @return {String} string of calc function
 */
CForcer.prototype.getCalc = function() {
	switch(this.forceType) {
		default:
		case F_SPRING:
		case F_SPRING_MESH:
  		case F_NONE:
  			return "";
  			break;
  		case F_GRAV_E:
  			return this.getFGraveECalc();
  			break;
  		case F_DRAG:
  			return this.getFDragCalc();
  			break;
  		case F_STATIC:
  			return this.getFStaticCalc();
  			break;
  		case F_FIELD:
  			return this.getFFieldCalc();
  			break;
	}
}

/**
 * Generates a string of GLSL code to handle the calculation in shader
 *
 * @return {String} string of calc function
 */
CForcer.prototype.getFGraveECalc = function() {
	var str = `
		/**
		 * Calculates force of gravity
		 *
		 * @param {vec3} downDir downward direction vector
		 * @param {float} acc acceleration due to gravity
		 */
		void fGravECalc(vec3 downDir, float acc) {
			float force = acc * a_Mass;
			v_Ftot += downDir * force;
		}
	`;
	return str;
}

/**
 * Generates a string of GLSL code to handle the calculation in shader
 *
 * @return {String} string of calc function
 */
CForcer.prototype.getFDragCalc = function() {
	var str = `
		/**
		 * Calculates force of drag
		 *
		 * @param {int} mode tells whether to use in or out values
		 * @param {float} K_drag coefficient of drag
		 */
		void fDragCalc(int mode, float K_drag) {
			float mass_drag = a_Mass * K_drag;
			if (mode == 0)
				v_Ftot -= a_Velocity * mass_drag;
			else
				v_Ftot -= v_Velocity * mass_drag;
		}
	`;
	return str;
}

/**
 * Generates a string of GLSL code to handle the calculation in shader
 *
 * @return {String} string of calc function
 */
CForcer.prototype.getFStaticCalc = function() {
	var str = `
		/**
		 * Calculates force of drag
		 *
		 * @param {vec3} dir direction and magnitude of force
		 */
		void fStaticCalc(vec3 dir) {
			v_Ftot += dir;
		}
	`;
	return str;
}

/**
 * Generates a string of GLSL code to handle the calculation in shader
 *
 * @return {String} string of calc function
 */
CForcer.prototype.getFFieldCalc = function() {
	var str = `
		/**
		 * Calculates force of drag
		 *
		 * @param {vec3} dir direction and magnitude of force
		 */
		void fFieldCalc(vec3 pos, float radius, float strength, float addAcc) {
			vec3 diff = pos - a_Position;
			float dist = length(diff);
			
			if (dist > radius || (strength < 0.0 && dist < 10.0))
				return;
			
			dist = 1.0 / dist;
			diff *= dist;
			
			diff *= -strength * pow(dist, addAcc);
			
			v_Ftot += diff;
		}
	`;
	return str;
}

//=============Apply All Forces

/**
 * Generates a string of GLSL code to go inside the doConstraint Function
 *
 * @return {String} string to call calc function
 */
CForcer.prototype.getCall = function() {
	switch(this.forceType) {
		default:
  		case F_NONE:
  			return "";
  			break;
  		case F_GRAV_E:
  			return this.getFGravECall();
  			break;
  		case F_DRAG:
  			return this.getFDragCall();
  			break;
  		case F_STATIC:
  			return this.getFStaticCall();
  			break;
  		case F_FIELD:
  			return this.getFFieldCall();
  			break;
	}
}

/**
 * Generates a string of GLSL code to go inside the applyAllForces Function
 * Not currently uniform capable. 
 *
 * @return {String} string to call calc function
 */
CForcer.prototype.getFGravECall = function() {
	var str = "fGravECalc(u_fGravE[" + (this.id - 1) + "].downDir, u_fGravE[" + (this.id - 1) + "].acc"
							+ ");\n\t\t\t";
	return str;
}

/**
 * Generates a string of GLSL code to go inside the applyAllForces Function
 * Not currently uniform capable. 
 *
 * @return {String} string to call calc function
 */
CForcer.prototype.getFDragCall = function() {
	var str = "fDragCalc(mode,  u_fDrag[" + (this.id -  1) + "].K_drag);\n";
	return str;
}

/**
 * Generates a string of GLSL code to go inside the applyAllForces Function
 * Not currently uniform capable. 
 *
 * @return {String} string to call calc function
 */
CForcer.prototype.getFStaticCall = function() {
	var str = "fStaticCalc(u_fStatic[" + (this.id - 1) + "].dir);\n";
	return str;
}

/**
 * Generates a string of GLSL code to go inside the applyAllForces Function
 * Not currently uniform capable. 
 *
 * @return {String} string to call calc function
 */
CForcer.prototype.getFFieldCall = function() {
	var str = "fFieldCalc(u_fField[" + (this.id - 1) + "].pos, u_fField[" + 
							(this.id - 1) + "].radius, u_fField[" + (this.id - 1) + 
							"].strength, u_fField[" + (this.id - 1) + "].addAcc);\n";
	return str;
}