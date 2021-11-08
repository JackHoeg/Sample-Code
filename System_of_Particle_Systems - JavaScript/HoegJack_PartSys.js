/*
	Particle System
	by Jack Hoeg
	Last Edited: Ferbruary 6, 2020
	
	This is a conversion from WebGL 1.0 and GLSL 100
	By taking advantage of WebGL 2.0's transformFeedback buffers,
	hardware-accelerated physics simulation should be possible.
*/

/*	
	Integration of WebGL 2.0 and GLSL 300 ES is primarily based on:
		https://webgl2fundamentals.org/webgl/lessons/webgl1-to-webgl2.html
		https://webgl2fundamentals.org/webgl/lessons/webgl2-whats-new.html
		https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
 */
 
 /*
 	Though my implementation of Transform Feedback isn't based on any one reference,
 	I spent a great deal of time trying to understand these sources:
 		https://gpfault.net/posts/webgl2-particles.txt.html
 		http://webglsamples.org/WebGL2Samples/#transform_feedback_interleaved
 		https://open.gl/feedback
 		https://www.ibiblio.org/e-notes/webgl/gpu/bounce.htm
  */

/*
	TODO: 
		WHAT IS A FENCE SYNC???
		Hybrid: Treat as CPU when solver requires applyAllForces call
		Convert HSItoRGB to Radians to take pressure off CPU
 */

/*
	Steps to Initialize Particle System: (Order Matters)
		1. Call Constructor
		2. Add Forces and Limits via addForce and addLimit
		3. Call pickSys
		4. Call initEmitter
		5. Call initParticles
		6. Call compileShader
 */

/**
 * Particle System Constructor
 *
 * @param {n} number of particles in system
 */
function PartSys(n) {
	this.transformVaryings = ["v_Age", "v_Life", "v_Position","v_Velocity", "v_Acc", "v_Mass",
								"v_HSI"];
	this.hybridVaryings = ["v_Age", "v_Life", "v_Position","v_Velocity", "v_Acc", "v_Mass", 
								"v_HSI", "v_Ftot"];
	
	this.sysType = SYS_GPU;	//Defaults to GPU based system
	
	            //-----------------------GPU memory locations:
	this.vboLoc;
	this.shaderLoc;
	
	this.modelMat = glMatrix.mat4.create();
	this.u_MvpMatLoc;	
	
	//Particle System Variables
	this.partCount = n; //particle count
	
	this.s1;				//current state
	this.s1dot;				//derivative of s1
	this.s2;				//next state
	this.forceList = [];	//set of Force-Applying Objects
	this.limitList = [];	//set of Constraint-Applying Objects
	
	this.sInd = this.partCount * PART_MAXVAR; // # indices in s
	
	this.drawCon = true;	// draw constraints
	this.aging = false; 	// do particles have a lifetime?   
	this.isNudge = false; 
	this.orb = true;		// Stylize the points to look like balls
	this.blend = false;
	
	this.solverType = SOLV_EULER;
	
	this.fCount = new Uint8Array(F_MAXVAR); //tracks # each kind of force/lim
	this.lCount = new Uint8Array(LIM_MAXVAR);
}

/**
 * A non-essential name for the system
 *
 * @param {String} n name of system
 */
PartSys.prototype.setName = function(n) {
	this.name = n;
}

/**
 * Generates the program, VBO, VAO, Uniforms, and Attributes
 * Do not call until after forces, limits, emitter, and particles have been created
 */
PartSys.prototype.compileShader = function() {
	this.VSHADER_SOURCE = this.getVShader();
  	this.FSHADER_SOURCE = this.getFShader();
  	
  	// Create Program
  	if (this.sysType === SYS_CPU) {
  		this.shaderLoc = createProgram(gl, this.VSHADER_SOURCE, this.FSHADER_SOURCE);
  	} else if (this.sysType === SYS_GPU) {
  		this.shaderLoc = createProgram(gl, this.VSHADER_SOURCE, this.FSHADER_SOURCE,
  											this.transformVaryings);
  	} else if (this.sysType === SYS_HYBRID) {
  		this.shaderLoc = createProgram(gl, this.VSHADER_SOURCE, this.FSHADER_SOURCE,
  											this.hybridVaryings);
  	}
  	
	if (!this.shaderLoc) {
   		console.log(this.constructor.name + 
    						'.init() failed to create executable Shaders on the GPU. Bye!');
    	return;
  	}

	gl.program = this.shaderLoc;
  	
  	// Store Attribute / 
  	var a_PosLoc = gl.getAttribLocation(this.shaderLoc, 'a_Position');
  	if(a_PosLoc < 0) {
    	console.log(this.constructor.name + 
    							'.init() Failed to get GPU location of attribute a_Position');
    	return -1;	// error exit.
  	}
  	
  	var a_MassLoc = gl.getAttribLocation(this.shaderLoc, 'a_Mass');
  	if(a_MassLoc < 0) {
    	console.log(this.constructor.name + 
    							'.init() Failed to get GPU location of attribute a_Mass');
    	return -1;	// error exit.
  	}
  	
  	var a_HSILoc = gl.getAttribLocation(this.shaderLoc, 'a_HSI');
  	if(a_HSILoc < 0) {
    	console.log(this.constructor.name + 
    							'.init() Failed to get GPU location of attribute a_HSI');
    	return -1;	// error exit.
  	}
  	
  	var a_AgeLoc;
  	var a_LifeLoc;
  	var a_VelLoc;
  	var a_AccLoc;
  	var a_FtotLoc;
  	
  	if (this.sysType != SYS_CPU) { // Gets GPU, HYBRID Specific Attribs, Uniforms
		a_AgeLoc = gl.getAttribLocation(this.shaderLoc, 'a_Age');
		if(a_AgeLoc < 0) {
			console.log(this.constructor.name + 
									'.init() Failed to get GPU location of attribute a_Age');
			return -1;	// error exit.
		}
		
		a_LifeLoc = gl.getAttribLocation(this.shaderLoc, 'a_Life');
		if(a_AgeLoc < 0) {
			console.log(this.constructor.name + 
									'.init() Failed to get GPU location of attribute a_Life');
			return -1;	// error exit.
		}
	
		a_VelLoc = gl.getAttribLocation(this.shaderLoc, 'a_Velocity');
		if(a_VelLoc < 0) {
			console.log(this.constructor.name + 
									'.init() Failed to get GPU location of attribute a_Velocity');
			return -1;	// error exit.
		}
	
		a_AccLoc = gl.getAttribLocation(this.shaderLoc, 'a_Acc');
		if(a_AccLoc < 0) {
			console.log(this.constructor.name + 
									'.init() Failed to get GPU location of attribute a_Acc');
			return -1;	// error exit.
		}
	
		if (this.sysType != SYS_GPU) {
			a_FtotLoc = gl.getAttribLocation(this.shaderLoc, 'a_Ftot');
			if (a_FtotLoc < 0) {
				console.log(this.constructor.name + 
									'.init() Failed to get GPU location of attribute a_Ftot');
				return -1;	// error exit.
			}
		}

		this.u_isAging = gl.getUniformLocation(this.shaderLoc, 'u_isAging');
		if(this.u_isAging < 0) {
			console.log(this.constructor.name + 
									'.init() Failed to get GPU location of uniform u_isAging');
			return -1;	// error exit.
		}
	
		this.u_isNudge = gl.getUniformLocation(this.shaderLoc, 'u_isNudge');
		if(this.u_isNudge < 0) {
			console.log(this.constructor.name + 
									'.init() Failed to get GPU location of uniform u_isNudge');
			return -1;	// error exit.
		}

		this.u_timeStep = gl.getUniformLocation(this.shaderLoc, 'u_timeStep');
		if(this.u_timeStep < 0) {
			console.log(this.constructor.name + 
									'.init() Failed to get GPU location of uniform u_timeStep');
			return -1;	// error exit.
		}
		
		this.u_solver = gl.getUniformLocation(this.shaderLoc, 'u_solver');
		if(this.u_solver < 0) {
			console.log(this.constructor.name + 
									'.init() Failed to get GPU location of uniform u_solver');
			return -1;	// error exit.
		}
		
		this.emit.getUniformLocations(this.shaderLoc);
		
		for(i = 0; i < this.forceList.length; i++) {
			this.forceList[i].getUniformLocations(this.shaderLoc);
		}
		
		for(i = 0; i < this.limitList.length; i++) {
			this.limitList[i].getUniformLocations(this.shaderLoc);
		}
  	}

	this.u_runModeID = gl.getUniformLocation(this.shaderLoc, 'u_runMode');
	if(this.u_runModeID < 0) {
    	console.log(this.constructor.name + 
    							'.init() Failed to get GPU location of uniform u_runModeID');
    	return -1;	// error exit.
  	}

	this.u_MvpMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_MvpMatrix');
  	if (!this.u_MvpMatLoc) { 
    	console.log(this.constructor.name + 
    							'.init() failed to get GPU location for u_MvpMatrix uniform');
    	return;
  	}  
  	
  	// create Vertex Array Object
  	this.vaoLoc = gl.createVertexArray();
  	gl.bindVertexArray(this.vaoLoc);
  	
  	// create Vetex Buffer Object
	this.vboLoc = gl.createBuffer();	
  	if (!this.vboLoc) {
    	console.log(this.constructor.name + 
    						'.init() failed to create VBO in GPU. Bye!'); 
    	return;
  	}
  	gl.bindBuffer(gl.ARRAY_BUFFER, this.vboLoc);
  	if (this.sysType === SYS_GPU)
  		gl.bufferData(gl.ARRAY_BUFFER, this.s1, gl.STREAM_READ); //WebGL rewrites the buffer
  	else
  		gl.bufferData(gl.ARRAY_BUFFER, this.s1, gl.STREAM_DRAW); //CPU rewrites the buffer
	
	var FSIZE = this.s1.BYTES_PER_ELEMENT;   
	var vboBytes = this.s1.length * FSIZE;    
	var vboStride = vboBytes / this.partCount;
	
	// Enable Vertex Attributes
	var vboFcount_a_Position =  3;
	var vboOffset_a_Position = PART_XPOS * FSIZE;
  	gl.enableVertexAttribArray(a_PosLoc);
  	gl.vertexAttribPointer(
		a_PosLoc,
		vboFcount_a_Position,
		gl.FLOAT,			
		false,	
		vboStride,
		vboOffset_a_Position);		
	
	var vboFcount_a_Mass =  1;
	var vboOffset_a_Mass = PART_MASS * FSIZE;
	gl.enableVertexAttribArray(a_MassLoc);
	gl.vertexAttribPointer(
		a_MassLoc,
		vboFcount_a_Mass,
		gl.FLOAT,			
		false,	
		vboStride,
		vboOffset_a_Mass);
		
	var vboFcount_a_HSI =  3;
	var vboOffset_a_HSI = PART_HUE * FSIZE;
  	gl.enableVertexAttribArray(a_HSILoc);
  	gl.vertexAttribPointer(
		a_HSILoc,
		vboFcount_a_HSI,
		gl.FLOAT,			
		false,	
		vboStride,
		vboOffset_a_HSI);		

	if (this.sysType != SYS_CPU) {
		var vboFcount_a_Age =  1;
		var vboOffset_a_Age = PART_AGE * FSIZE;
		gl.enableVertexAttribArray(a_AgeLoc);
		gl.vertexAttribPointer(
			a_AgeLoc,
			vboFcount_a_Age,
			gl.FLOAT,			
			false,	
			vboStride,
			vboOffset_a_Age);	
			
		var vboFcount_a_Life =  1;
		var vboOffset_a_Life = PART_LIFE * FSIZE;
		gl.enableVertexAttribArray(a_LifeLoc);
		gl.vertexAttribPointer(
			a_LifeLoc,
			vboFcount_a_Life,
			gl.FLOAT,			
			false,	
			vboStride,
			vboOffset_a_Life);		
		
		var vboFcount_a_Velocity =  3;
		var vboOffset_a_Velocity = PART_XVEL * FSIZE;
		gl.enableVertexAttribArray(a_VelLoc);
		gl.vertexAttribPointer(
			a_VelLoc,
			vboFcount_a_Velocity,
			gl.FLOAT,			
			false,	
			vboStride,
			vboOffset_a_Velocity);
		
		var vboFcount_a_Acc =  3;
		var vboOffset_a_Acc = PART_XACC * FSIZE;
		gl.enableVertexAttribArray(a_AccLoc);
		gl.vertexAttribPointer(
			a_AccLoc,
			vboFcount_a_Acc,
			gl.FLOAT,			
			false,	
			vboStride,
			vboOffset_a_Acc);	
		
		if (this.sysType === SYS_HYBRID) {
			var vboFcount_a_Ftot =  3;
			var vboOffset_a_Ftot = CPU_PART_X_FTOT * FSIZE;
			gl.enableVertexAttribArray(a_FtotLoc);
			gl.vertexAttribPointer(
				a_FtotLoc,
				vboFcount_a_Ftot,
				gl.FLOAT,			
				false,	
				vboStride,
				vboOffset_a_Ftot);
		}
  	}
  	
  	gl.bindVertexArray(null);
  	
  	if (this.sysType != SYS_CPU) {
		this.vboOut = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vboOut);
		gl.bufferData(gl.ARRAY_BUFFER, this.s1.length * FSIZE, gl.STREAM_READ);
	}
	
	if (this.sysType === SYS_GPU)
		delete this.s1;
		
	needRefresh = true;
}

/**
 * Determines which type of system to generate (CPU, GPU, or Hybrid)
 * Sets this.sysType accordingly. If Hybrid, makes array of Hybrid force indices
 * Also creates state variables
 */
PartSys.prototype.pickSys = function() {
	var hybForces = [];
	for (i = 0; i < this.forceList.length; i++) {
		switch(this.forceList[i].forceType) {
			default:
			case F_NONE:
			case F_GRAV_E:
			case F_DRAG:
				break;
			case F_SPRING:
			case F_SPRING_MESH:
			case F_FLOCK:
			case F_GRAV_P:
				hybForces.push(i);
				break;
		}
	}
	
	//CPU Checks should go here
// 	for (i = 0; i < this.limitList.length; i++) {
// 		switch (this.limitList[i].limitType) {
// 			default:
// 			case LIM_NONE:
// 				break;
// 		}
// 	}
	
	if (hybForces.length > 0 && this.sysType != SYS_CPU) {
		this.sysType = SYS_HYBRID;
		this.hybForces = new Uint16Array(hybForces);
	}

	if (this.sysType != SYS_GPU) {
		this.sInd = this.partCount * CPU_PART_MAXVAR;
		this.s1dot = new Float32Array(this.sInd);
		this.s2 = new Float32Array(this.sInd);
		this.sM = new Float32Array(this.sInd);
		this.sMdot = new Float32Array(this.sInd);
	} 
	this.s1 = new Float32Array(this.sInd);

}

/**
 * Initializes particle emitter based on type
 *
 * @param {Number} etype constant number of emitter type
 * @param {var} defined by etype
 */
PartSys.prototype.initEmitter = function(etype, a, b, c, d) {
	this.eType = etype;
	this.emit = new Emitter(etype, a, b, c, d);
}

/**
 * Initializes all particles in this system
 *
 */
PartSys.prototype.initParticles = function() {
	if (this.sysType === SYS_GPU) {
		for (i=0; i < this.sInd; i += PART_MAXVAR) {
			this.emit.makeParticle(this.s1, i);
			this.s1[i + PART_AGE] += this.emit.lifeRange[0];;
		}
	} else {
		for (i=0; i < this.sInd; i += CPU_PART_MAXVAR) {
			this.emit.makeParticle(this.s1, i);
			this.s1[i + PART_AGE] += this.emit.lifeRange[0];
		}
		this.s2 = Float32Array.from(this.s1);
	}
}

/**
 * Makes a new Particle from the emitter
 * Assumes all FTOT are set to 0
 *
 * @param s {Float32Array} state variable
 * @param i {index} where particle should be written
 */
PartSys.prototype.makeParticle = function(s, i) {
	this.emit.makeParticle(s, i);
}

/**
 * Add a force to the force list
 *
 * @param {Uint16} type of force to create
 * @param {var} a, b, c, d, e determined by type
 */
PartSys.prototype.addForce = function(type, a, b, c, d, e, f, g, h) {
	var tmp = new CForcer(type, a, b, c, d, e, f, g, h);
	this.forceList.push(tmp);
	this.fCount[type]++;
}

/**
 * Add a constraint to the limit list
 *
 * @param {Uint16} type of limit to create
 * @param {var} a, b, c, d, e, f determined by type
 */
PartSys.prototype.addLimit = function(type, a, b, c, d, e, f) {
	var tmp = new CLimit(type, a, b, c, d, e, f);
	this.limitList.push(tmp);
	this.lCount[type]++;
}

/**
 * Applies forces to state-variable
 *
 * @param {Float32Array} s state-variable
 * @param {Array} F CForcer array to iterate through
 */
PartSys.prototype.applyAllForces = function(s, F) {
   	for (i=0; i < (this.sInd); i += CPU_PART_MAXVAR) {
		s[i+CPU_PART_X_FTOT] = 0;
		s[i+CPU_PART_Y_FTOT] = 0;
		s[i+CPU_PART_Z_FTOT] = 0;	
	}
	for (i=0; i < (this.sInd); i += CPU_PART_MAXVAR) {		
		if (this.isNudge === true){
			var randVec = glMatrix.vec3.create();
			glMatrix.vec3.random(randVec, 4.0);
			this.s2[i+PART_XVEL] += randVec[0];
			this.s2[i+PART_YVEL] += randVec[1];
			this.s2[i+PART_ZVEL] += randVec[2];
		}
		for (j=0; j < F.length; j++) {
			F[j].calculate(s, i);
		}
	}
}

/**
 * Applies CPU forces to state-variable
 *
 * @param {Float32Array} s state-variable
 * @param {Array} F CForcer array
 * @param {Uint16Array} Ind array containing the indices of cpu forces to calc
 */
PartSys.prototype.applyCPUForces = function(s, F, Ind) {	
	for (i=0; i < (this.sInd); i += CPU_PART_MAXVAR) {
		for (j=0; j < Ind.length; j++) {
			F[Ind[j]].calculate(s, i);
		}
	}
}


/*
	TODO: ApplyAllForcesInd is O(n^2) ––– FIX IT
*/

/**
 * Applies All forces to a single index of s
 *
 * @param {Float32Array} s state-variable
 * @param {Array} F CForcer array
 * @param {Uint16} Index specifying which particle to apply forces to.
 */
PartSys.prototype.applyAllForcesInd = function(s, F, Ind) {
	s[Ind+CPU_PART_X_FTOT] = 0;
	s[Ind+CPU_PART_Y_FTOT] = 0;
	s[i+CPU_PART_Z_FTOT] = 0;	
	for (j=0; j < F.length; j++) {
		F[j].calculate(s, i);
	}
}

/*
	TODO:
		Allow mass to change over time
		store inverse mass to speed up calculations (in some cases)
*/

/**
 * Computes the time-derivative sDot
 *
 * @param {Float32Array} s state-variable to derive from
 * @param {Float32Array} sdot state-variable to store the derivative in
 */
PartSys.prototype.dotFinder = function(s, sdot) {
	for (i=0; i < (this.sInd); i += CPU_PART_MAXVAR) {
		sdot[i+CPU_PART_AGE] = 1;
		sdot[i+CPU_PART_XPOS] = s[i+CPU_PART_XVEL]; //copy velocity
		sdot[i+CPU_PART_YPOS] = s[i+CPU_PART_YVEL];
		sdot[i+CPU_PART_ZPOS] = s[i+CPU_PART_ZVEL];
		
		//currently assumes no mass change
		sdot[i+CPU_PART_XVEL] = s[i+CPU_PART_X_FTOT] / s[i+CPU_PART_MASS]; //calculate accel
		sdot[i+CPU_PART_YVEL] = s[i+CPU_PART_Y_FTOT] / s[i+CPU_PART_MASS];
		sdot[i+CPU_PART_ZVEL] = s[i+CPU_PART_Z_FTOT] / s[i+CPU_PART_MASS];
		
// 		sdot[i+CPU_PART_X_FTOT] = 0; //assumes no force change
// 		sdot[i+CPU_PART_Y_FTOT] = 0;
// 		sdot[i+CPU_PART_Z_FTOT] = 0;
		
// 		sdot[i+CPU_PART_MASS] = 0; //assumes no mass change
	}
}

/**
 * Computes s2, based on s1 and s1dot
 * 
 * @param {Float32Array} s1 state-variable, current state
 * @param {Float32Array} s1dot state-variable that holds derivative of s1
 *
 * @return {Float32Array} s2 state-variable, next state
 */
PartSys.prototype.solver = function(s1, s1dot) {
	var s2 = Float32Array.from(s1);
	switch (this.solverType) {
		case SOLV_EULER:
			this.eulerSolver(s1, s1dot, s2, g_timeStep);
			break;
		case SOLV_MIDPOINT:
			this.midpointSolver(s1, s1dot, s2, g_timeStep);
			break;
		default:
		case SOLV_VEL_VERLET:
			this.velVerletSolver(s1, s1dot, s2, g_timeStep);
			break;
		case SOLV_BACK_EULER:
			this.backEulerSolver(s1, s1dot, s2, g_timeStep);
			break;
		case SOLV_BACK_MIDPT:
			this.backMidpointSolver(s1, s1dot, s2, g_timeStep);
			break;
		case SOLV_SYMP_EULER:
			this.symplecticEulerSolver(s1, s1dot, s2, g_timeStep);
			break;
	}
	return s2;
}

/**
 * Applies constraints to all changes between s1 and s2, and modifies s2
 *
 * @param {Float32Array} s1 state-variable, current state
 * @param {Float32Array} s2 state-variable, next state
 * @param {Array} C CForcer Array
 */
PartSys.prototype.doConstraint = function(s1, s2, C) {
	for (i=0; i < this.sInd; i += CPU_PART_MAXVAR) {
		for (j=0; j < C.length; j++) {
			C[j].calculate(s1, s2, i);
		}
	}
}

/**
 * Updates VBO's contents from this.s2
 *
 */
PartSys.prototype.render = function() {
	//Do I need to bind the buffer like this?
	gl.useProgram(this.shaderLoc);	
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vboLoc);
	
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.s2);
	//Do I need to have a draw call here?
}

/**
 * Replaces the contents of this.s1 with this.s2
 *
 */
PartSys.prototype.swap = function() {
	this.s1 = this.s2;
}

/**
 * Adds some random velocity to all particles
 */
PartSys.prototype.nudge = function() {
	this.isNudge = true;
}

/**
 * Draws all particles, and constraints if active
 *
 */
PartSys.prototype.draw = function(cam) {
	if (this.hybApply === true) { //perform minimal CPU Calculations
		this.applyCPUForces(this.s1, this.forceList, this.hybForces);
	}
	else if (this.sysType === SYS_CPU) { //perform calculations on CPU
		if (g_runMode > 1) { //0=rest, 1=pause, 2=step, 3=run
			this.applyAllForces(this.s1, this.forceList);
			this.dotFinder(this.s1, this.s1dot);
			this.s2 = this.solver(this.s1, this.s1dot);
			this.doConstraint(this.s1, this.s2, this.limitList);
		}
	}

	gl.useProgram(this.shaderLoc);	
	gl.bindVertexArray(this.vaoLoc);
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vboLoc);
	
	if (this.hybApply === true) {
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.s1);
		this.hybApply = false;
	}
	
	gl.uniform1i(this.u_runModeID, g_runMode);
	gl.uniformMatrix4fv(this.u_MvpMatLoc, false, cam.mvp);
	if (this.sysType != SYS_CPU) {
		gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.vboOut);
	
		gl.uniform1i(this.u_isAging, this.aging);
		gl.uniform1i(this.u_isNudge, this.isNudge);
		gl.uniform1f(this.u_timeStep, g_timeStep);
		gl.uniform1i(this.u_solver, this.solverType);
		this.emit.bindUniforms();
		for (i=0; i < this.forceList.length; i++)
			this.forceList[i].bindUniforms();
		for (i=0; i < this.limitList.length; i++)
			this.limitList[i].bindUniforms();
		gl.beginTransformFeedback(gl.POINTS);
	} else {
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.s2);
	}
	
	//blending based on https://stackoverflow.com/questions/32802490/additive-blending-of-positive-and-negative-color-fragments-in-a-single-render-pa
	if (this.blend === true) {
		gl.enable(gl.BLEND);
		gl.blendFuncSeparate(gl.ONE_MINUS_SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
		gl.blendEquation(gl.FUNC_ADD);
	} else if (this.blend2 === true) {
		gl.enable(gl.BLEND);
		gl.blendFuncSeparate(gl.DST_ALPHA, gl.SRC_ALPHA, gl.ONE, gl.ONE);
		gl.blendEquation(gl.FUNC_ADD);
	}
	gl.drawArrays(gl.POINTS, 0, this.partCount);
	if (this.blend === true || this.blend2 === true) {
		gl.disable(gl.BLEND);
	}
	
	if (this.sysType != SYS_CPU) {
		gl.endTransformFeedback();
	
		if (this.sysType == SYS_GPU && g_runMode > 1) {
			gl.copyBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, gl.ARRAY_BUFFER, 0, 0, 
										this.sInd * 4);
		} 
		else if (this.sysType == SYS_HYBRID && g_runMode > 1){
			gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.s1);
			this.hybApply = true; //Should apply forces
		}
	
		gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
	} else {
		this.swap();
	}
	gl.bindVertexArray(null);	// protect VAO
	
	if (this.isNudge) this.isNudge = false;
}

//=============Solver Methods=================================================//

/**
 * Computes s2, based on s1 and s1dot using the Euler method
 * 
 * @param {Float32Array} s1 state-variable, current state
 * @param {Float32Array} s1dot state-variable that holds derivative of s1
 * @param {Float32Array} s2 state-variable, next state
 * @param {float} h timestep used to calculate
 */
PartSys.prototype.eulerSolver = function(s1, s1dot, s2, h) {
	for (i=0; i<this.sInd;i+=CPU_PART_MAXVAR) {
		if (this.aging) {
			s2[i+CPU_PART_AGE] += s1dot[i+CPU_PART_AGE] * h;
			if (s2[i+CPU_PART_AGE] > s2[i+CPU_PART_LIFE]) {
				this.makeParticle(s2, i);
				continue;
			}
		}
		s2[i+CPU_PART_XPOS] += s1dot[i+CPU_PART_XPOS] * h;
		s2[i+CPU_PART_YPOS] += s1dot[i+CPU_PART_YPOS] * h;
		s2[i+CPU_PART_ZPOS] += s1dot[i+CPU_PART_ZPOS] * h;
		
		s2[i+CPU_PART_XVEL] += s1dot[i+CPU_PART_XVEL] * h;
		s2[i+CPU_PART_YVEL] += s1dot[i+CPU_PART_YVEL] * h;
		s2[i+CPU_PART_ZVEL] += s1dot[i+CPU_PART_ZVEL] * h;
		
		//used for VEL-VERLET is it worth storing here?
		s2[i+CPU_PART_XACC] = s1dot[i+CPU_PART_XVEL];
		s2[i+CPU_PART_YACC] = s1dot[i+CPU_PART_YVEL];
		s2[i+CPU_PART_ZACC] = s1dot[i+CPU_PART_ZVEL];
	}
}

/**
 * Computes s2, based on s1 and s1dot using the Midpoint method
 * 
 * @param {Float32Array} s1 state-variable, current state
 * @param {Float32Array} s1dot state-variable that holds derivative of s1
 * @param {Float32Array} s2 state-variable, next state
 * @param {float} h timestep used to calculate
 */
PartSys.prototype.midpointSolver = function(s1, s1dot, s2, h) {
	this.sM.set(s1);
	this.eulerSolver(s1, s1dot, this.sM, h * 0.5);
	this.dotFinder(this.sM, this.sMdot);
	this.eulerSolver(s1, this.sMdot, s2, h);
}

/**
 * Computers s2 based on the Velocity Verlet Method
 *
 * @param {Float32Array} s1 state-variable, current state
 * @param {Float32Array} s1dot state-variable that holds derivative of s1
 * @param {Float32Array} s2 state-variable, next state
 * @param {float} h timestep used to calculate
 */
PartSys.prototype.velVerletSolver = function(s1, s1dot, s2, h) {
	var ho2 = 0.5 * h;	// h/2
	var hsq2 = ho2 * h;	// h^2 / 2
	
	for (i = 0; i < this.sInd; i += CPU_PART_MAXVAR) {
		if (this.aging) {
			s2[i+CPU_PART_AGE] += s1dot[i+CPU_PART_AGE] * h;
			if (s2[i+CPU_PART_AGE] > s2[i+CPU_PART_LIFE]) {
				this.makeParticle(s2, i);
				continue;
			}
		}
		//compute position
		s2[i+CPU_PART_XPOS] = s1[i+CPU_PART_XPOS] + s1[i+CPU_PART_XVEL] * h
								+ s1[CPU_PART_XACC] * hsq2;
		s2[i+CPU_PART_YPOS] = s1[i+CPU_PART_YPOS] + s1[i+CPU_PART_YVEL] * h
								+ s1[CPU_PART_YACC] * hsq2;
		s2[i+CPU_PART_ZPOS] = s1[i+CPU_PART_ZPOS] + s1[i+CPU_PART_ZVEL] * h
								+ s1[CPU_PART_ZACC] * hsq2;
	}
	this.applyAllForces(s2, this.forceList);
	for (i = 0; i < this.sInd; i += CPU_PART_MAXVAR) {								
		s2[i+CPU_PART_XACC] = s2[i+CPU_PART_X_FTOT] / s2[i+CPU_PART_MASS];
		s2[i+CPU_PART_YACC] = s2[i+CPU_PART_Y_FTOT] / s2[i+CPU_PART_MASS];
		s2[i+CPU_PART_ZACC] = s2[i+CPU_PART_Z_FTOT] / s2[i+CPU_PART_MASS];
		
		s2[i+CPU_PART_XVEL] = s1[i+CPU_PART_XVEL]
								+ (s2[i+CPU_PART_XACC] + s1[i+CPU_PART_XACC]) * ho2;
		s2[i+CPU_PART_YVEL] = s1[i+CPU_PART_YVEL]
								+ (s2[i+CPU_PART_YACC] + s1[i+CPU_PART_YACC]) * ho2;
		s2[i+CPU_PART_ZVEL] = s1[i+CPU_PART_ZVEL]
								+ (s2[i+CPU_PART_ZACC] + s1[i+CPU_PART_ZACC]) * ho2;
	}
	
}

/**
 * Computes s2, based on s1 and s1dot using the Backwind Euler method
 * 
 * @param {Float32Array} s1 state-variable, current state
 * @param {Float32Array} s1dot state-variable that holds derivative of s1
 * @param {Float32Array} s2 state-variable, next state
 * @param {float} h timestep used to calculate
 */
PartSys.prototype.backEulerSolver = function(s1, s1dot, s2, h) {
	this.eulerSolver(s1, s1dot, s2, h);
	this.applyAllForces(s2, this.forceList);
	this.dotFinder(s2, s1dot);
	for (k=0; k<this.sInd;k+=CPU_PART_MAXVAR) {
		if (s2[k+CPU_PART_AGE] < s1[k+CPU_PART_AGE])
			continue;
	
		s2[k+CPU_PART_XPOS] = s1[k+CPU_PART_XPOS] + (s1dot[k+CPU_PART_XPOS] * h);
		s2[k+CPU_PART_YPOS] = s1[k+CPU_PART_YPOS] + (s1dot[k+CPU_PART_YPOS] * h);
		s2[k+CPU_PART_ZPOS] = s1[k+CPU_PART_ZPOS] + (s1dot[k+CPU_PART_ZPOS] * h);
		
		s2[k+CPU_PART_XVEL] = s1[k+CPU_PART_XVEL] + (s1dot[k+CPU_PART_XVEL] * h);
		s2[k+CPU_PART_YVEL] = s1[k+CPU_PART_YVEL] + (s1dot[k+CPU_PART_YVEL] * h);
		s2[k+CPU_PART_ZVEL] = s1[k+CPU_PART_ZVEL] + (s1dot[k+CPU_PART_ZVEL] * h);
		
		//used for VEL-VERLET is it worth storing here?
		s2[k+CPU_PART_XACC] = s1dot[k+CPU_PART_XVEL];
		s2[k+CPU_PART_YACC] = s1dot[k+CPU_PART_YVEL];
		s2[k+CPU_PART_ZACC] = s1dot[k+CPU_PART_ZVEL];
	}
}

/**
 * Computes s2, based on s1 and s1dot using the Backwind Midpoint method
 * 
 * @param {Float32Array} s1 state-variable, current state
 * @param {Float32Array} s1dot state-variable that holds derivative of s1
 * @param {Float32Array} s2 state-variable, next state
 * @param {float} h timestep used to calculate
 */
PartSys.prototype.backMidpointSolver = function(s1, s1dot, s2, h) {
	// Reference: https://en.wikipedia.org/wiki/Midpoint_method
	this.midpointSolver(s1, s1dot, s2, h);
	this.dotFinder(s2, this.sMdot);
	for (i=0; i<this.sInd;i+=CPU_PART_MAXVAR) {
		if (s2[i+CPU_PART_AGE] < s1[i+CPU_PART_AGE])
			continue;
		this.sM[i+CPU_PART_XPOS] = s2[i+CPU_PART_XPOS] - (h/2)*this.sMdot[i+CPU_PART_XPOS];
		this.sM[i+CPU_PART_YPOS] = s2[i+CPU_PART_YPOS] - (h/2)*this.sMdot[i+CPU_PART_YPOS];
		this.sM[i+CPU_PART_ZPOS] = s2[i+CPU_PART_ZPOS] - (h/2)*this.sMdot[i+CPU_PART_ZPOS];
		
		this.sM[i+CPU_PART_XVEL] = s2[i+CPU_PART_XVEL] - (h/2)*this.sMdot[i+CPU_PART_XVEL];
		this.sM[i+CPU_PART_YVEL] = s2[i+CPU_PART_YVEL] - (h/2)*this.sMdot[i+CPU_PART_YVEL];
		this.sM[i+CPU_PART_ZVEL] = s2[i+CPU_PART_ZVEL] - (h/2)*this.sMdot[i+CPU_PART_ZVEL];
	}
	this.dotFinder(this.sM, this.sMdot);
	for (i=0; i<this.sInd;i+=CPU_PART_MAXVAR) {
		if (s2[i+CPU_PART_AGE] < s1[i+CPU_PART_AGE])
			continue;
		this.sM[i+CPU_PART_XPOS] = s2[i+CPU_PART_XPOS] - h*this.sMdot[i+CPU_PART_XPOS];
		this.sM[i+CPU_PART_YPOS] = s2[i+CPU_PART_YPOS] - h*this.sMdot[i+CPU_PART_YPOS];
		this.sM[i+CPU_PART_ZPOS] = s2[i+CPU_PART_ZPOS] - h*this.sMdot[i+CPU_PART_ZPOS];
		
		this.sM[i+CPU_PART_XVEL] = s2[i+CPU_PART_XVEL] - h*this.sMdot[i+CPU_PART_XVEL];
		this.sM[i+CPU_PART_YVEL] = s2[i+CPU_PART_YVEL] - h*this.sMdot[i+CPU_PART_YVEL];
		this.sM[i+CPU_PART_ZVEL] = s2[i+CPU_PART_ZVEL] - h*this.sMdot[i+CPU_PART_ZVEL];
	}
	//find residue
	for (i=0; i<this.sInd;i+=CPU_PART_MAXVAR) {
		if (s2[i+CPU_PART_AGE] < s1[i+CPU_PART_AGE])
			continue;
		this.sMdot[i+CPU_PART_XPOS] = this.sM[i+CPU_PART_XPOS] - s1[i+CPU_PART_XPOS];
		this.sMdot[i+CPU_PART_YPOS] = this.sM[i+CPU_PART_YPOS] - s1[i+CPU_PART_YPOS];
		this.sMdot[i+CPU_PART_ZPOS] = this.sM[i+CPU_PART_ZPOS] - s1[i+CPU_PART_ZPOS];
		
		this.sMdot[i+CPU_PART_XVEL] = this.sM[i+CPU_PART_XVEL] - s1[i+CPU_PART_XVEL];
		this.sMdot[i+CPU_PART_YVEL] = this.sM[i+CPU_PART_YVEL] - s1[i+CPU_PART_YVEL];
		this.sMdot[i+CPU_PART_ZVEL] = this.sM[i+CPU_PART_ZVEL] - s1[i+CPU_PART_ZVEL];
	}
	//remove half-residue
	for (i=0; i<this.sInd;i+=CPU_PART_MAXVAR) {
		if (s2[i+CPU_PART_AGE] < s1[i+CPU_PART_AGE])
			continue;
		s2[i+CPU_PART_XPOS] = s2[i+CPU_PART_XPOS] - this.sMdot[i+CPU_PART_XPOS]/2;
		s2[i+CPU_PART_YPOS] = s2[i+CPU_PART_YPOS] - this.sMdot[i+CPU_PART_YPOS]/2;
		s2[i+CPU_PART_ZPOS] = s2[i+CPU_PART_ZPOS] - this.sMdot[i+CPU_PART_ZPOS]/2;
		
		s2[i+CPU_PART_XVEL] = s2[i+CPU_PART_XVEL] - this.sMdot[i+CPU_PART_XVEL]/2;
		s2[i+CPU_PART_YVEL] = s2[i+CPU_PART_YVEL] - this.sMdot[i+CPU_PART_YVEL]/2;
		s2[i+CPU_PART_ZVEL] = s2[i+CPU_PART_ZVEL] - this.sMdot[i+CPU_PART_ZVEL]/2;
	}
}

/**
 * Computes s2, based on s1 and s1dot using the Semi-Implicit Euler method
 */
PartSys.prototype.symplecticEulerSolver = function(s1, s1dot, s2, h) {
	//Based on https://en.wikipedia.org/wiki/Semi-implicit_Euler_method
	this.eulerSolver(s1, s1dot, s2, h);
	for (i=0; i<this.sInd;i+=CPU_PART_MAXVAR) {
		if (s2[i+CPU_PART_AGE] < s1[i+CPU_PART_AGE])
			continue;
		s2[i+CPU_PART_XPOS] = s1[i+CPU_PART_XPOS] + s2[i+CPU_PART_XVEL] * h;
		s2[i+CPU_PART_YPOS] = s1[i+CPU_PART_YPOS] + s2[i+CPU_PART_YVEL] * h;
		s2[i+CPU_PART_ZPOS] = s1[i+CPU_PART_ZPOS] + s2[i+CPU_PART_ZVEL] * h;
	}
}

//=============GENERATE GLSL CODE=============================================//

//----VSHADER

/*
 * Compiles GLSL into one String
 *
 * @return {String} VSHADER_SOURCE
 */
PartSys.prototype.getVShader = function() {
	var str = this.getHeader();
	str += this.getUniforms();
	str += this.getAttributes();
	str += this.getVariables();
	str += this.getVaryings();
	str += this.getHelpers();
	
	if (this.sysType != SYS_CPU) {
		str += this.getEmitter();
		str += this.getVertexCode();
	}
	
	str += this.getMain();
	return str;
}

/*
 * Generates GLSL code for makeParticle()
 */
PartSys.prototype.getHeader = function() {
	var str = `#version 300 es
		precision mediump float;	
	`;
	return str;
}

/*
 * Generates GLSL code for makeParticle()
 */
PartSys.prototype.getEmitter = function() {
	return this.emit.getMakeParticle();
}

/*
 * Generates GLSL code to call makeParticle()
 */
PartSys.prototype.getEmitterCall = function() {
	return this.emit.getEmitterCall();
}

/*
 * Generates GLSL code for Helper Functions and Constants
 */
PartSys.prototype.getHelpers = function() {
	var str = `
		const float PI = 3.1415926535897932384626433832795;
		`;
	str += this.getRand();	
	str += this.getRandVec();
	return str;
}

/*
 * Generates GLSL code for rand(vec2 co)
 */ 
PartSys.prototype.getRand = function() {
	var str = `
		/**
		 * Generates a pseudorandom number between 0 and 1
		 * http://www.science-and-fiction.org/rendering/noise.html
		 * https://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl/4275343#4275343
		 * https://stackoverflow.com/questions/12964279/whats-the-origin-of-this-glsl-rand-one-liner
		 *
		 * @param {vec2} co used as a seed for the noise.
		 * @return {float} random number between 0 and 1
		 */
		float rand(vec2 co){
   			return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
		}
	`;
	return str;
}

/*
 * Generates GLSL code for randVec(float scale)
 */ 
PartSys.prototype.getRandVec = function() {
	var str = `
		/**
		 * Returns a random vec3 of magnitude scale
		 * Based on gl-matrix
		 */
		vec3 randVec(float scale) {
			float r = rand(a_Position.xz) * 2.0 * PI;
			float z = rand(a_Position.yz) * 2.0 - 1.0;
			float zScale = sqrt(1.0 - z * z) * scale;
			return vec3(cos(r) * zScale, sin(r) * zScale, z * scale);
		}
	`;
	return str;
}

/*
 * Generates GLSL code for Uniforms
 */
PartSys.prototype.getUniforms = function() {
	var str = `
		uniform mat4  u_MvpMatrix;
		uniform int   u_runMode;
	`;
	if (this.sysTyoe != SYS_CPU) {
		str += `
		uniform bool  u_isAging;
		uniform bool  u_isNudge;
		uniform float u_timeStep;
		uniform int   u_solver;
		`;
		str += this.emit.getUniforms();
		if (typeof(this.forceList[0]) != "undefined")
			str += this.forceList[0].getStructs();
		if (typeof(this.limitList[0]) != "undefined")
			str += this.limitList[0].getStructs();
		
		for(i=0; i < this.fCount.length; i++) {
			if (this.fCount[i] >= 1) {
				var tally = 0;
				for (j = 0; j < this.forceList.length; j++) {
					if (this.forceList[j].forceType == i) {
						this.forceList[j].id = tally + 1;
						tally++;
					}
				}
			}
		}
		
		for(i=0; i < this.lCount.length; i++) {
			if (this.lCount[i] >= 1) {
				var tally = 0;
				for (j = 0; j < this.limitList.length; j++) {
					if (this.limitList[j].limitType == i) {
						this.limitList[j].id = tally + 1;
						tally++;
					}
				}
			}
		}
		
		for (i=0; i < this.forceList.length; i++) {
			str += this.forceList[i].getUniforms(this.fCount[this.forceList[i].forceType]);
		}
		
		for (i=0; i < this.limitList.length; i++) {
			str += this.limitList[i].getUniforms(this.lCount[this.limitList[i].limitType]);
		}
	}
	return str;
}

/*
 * Generates GLSL code for Attributes
 */
PartSys.prototype.getAttributes = function() {
	var str = `
		in vec3	  a_Position;
		in vec3   a_HSI;
		in float  a_Mass;
		`;
	if (this.sysType != SYS_CPU) {
		str += `
		in vec3   a_Velocity;
		in vec3	  a_Acc;
		in float  a_Age;
		in float  a_Life;
		`;
		if (this.sysType === SYS_HYBRID) {
			str += `
		in vec3   a_Ftot;
			`;
		}
	}
	return str;
}

/*
 * Generates GLSL code for Variables
 */
PartSys.prototype.getVariables = function() {
	var str = "";
	if (this.sysType != SYS_CPU) {
		str += `
			vec3 dotPos;			//velocity
			vec3 dotVel;			//acceleration
		
			vec3 dotMPos;			//midpoint velocity
			vec3 dotMVel;			//midpoint acceleration
		
			vec3 MPos;				//midpoint position
			vec3 MVel;				//midpoint velocity
		`;
		if (this.sysType == SYS_GPU) {
			str += `	vec3 v_Ftot = vec3(0.0, 0.0, 0.0);	// Treated like varying for compatability
			`;
		}
	} else {
		str += `	vec3 v_HSI;	// Treated like varying for compatability
		`;
	}
	return str;
}

/*
 * Generates GLSL code for Varyings
 */
PartSys.prototype.getVaryings = function() {
	var str = `
		out vec4  v_Color;
	`;
	if (this.sysType != SYS_CPU) {
		str += `
		out float v_Age;
		out float v_Life;
		out vec3  v_Position;
		out vec3  v_Velocity;
		out vec3  v_Acc;
		out float v_Mass;
		out vec3  v_HSI;
		`;
		if (this.sysType == SYS_HYBRID) {
			str += `
				out vec3 v_Ftot;
			`;
		}
	}
	return str;
}

/*
 * Generates GLSL code for forces and limits
 */
PartSys.prototype.getVertexCode = function() {
	var str = "";
	/* CALCULATIONS */
	
	for (i=0; i < this.forceList.length; i++) {
		var type = this.forceList[i].forceType;
		if (this.fCount[type] == this.forceList[i].id) {
			str += this.forceList[i].getCalc();
		}
	}
	
	for (i=0; i < this.limitList.length; i++) {
		var type = this.limitList[i].limitType;
		if (this.lCount[type] == this.limitList[i].id) {
			str += this.limitList[i].getCalc();
		}
	}
	
	/* Apply All Forces */
	str += this.getApplyForces();
		
	/* Dot Finder */
	str += this.getDotFinder();
	
	/* Solver */
	str += this.getSolver();
	
	/* Do Constraint */
	str += this.getConstraint();

	return str;
}

/*
 * Generates GLSL for applyAllForces()
 */
PartSys.prototype.getApplyForces = function() {
	var str = `
		/**
		 * Accumulates forces in Ftot
		 */
		void applyAllForces(int mode) {
			`;
			
	for (i=0; i < this.forceList.length; i++) {
		str += this.forceList[i].getCall();
	}
	
	str += `
		}
		`;
	return str;
}

/*
 * Generates GLSL for dotFinder()
 */
PartSys.prototype.getDotFinder = function() {
	var str = `
		/**
		 * Finds the derivative of all of the attributes
		 *
		 * @param {int} mode determines which mode to be in
		 */
		void dotFinder(int mode) {
			if (mode == 0) {	//standard
				dotPos = a_Velocity;
				dotVel = v_Ftot / a_Mass;
			} else if (mode == 1) { //midpoint special call
				dotMPos = MVel;
				dotMVel = v_Ftot / a_Mass;
			} else if (mode == 2) { //back midpt special
				dotMPos = v_Velocity;
			}
		}
		`;
	return str;
}

/*
 * Generates GLSL for solver()
 */
PartSys.prototype.getSolver = function() {
	var str = `
		/**
		 * Euler Solver
		 *
		 * @param {int} mode that determines why it is being called
		 * @param {float} step size of timeStep
		 */ 
		void eulerSolver(int mode, float step) {
			if (mode == 0) { //standard Euler Solver
				v_Position = a_Position + (dotPos * step);
				v_Velocity = a_Velocity + (dotVel * step);
				v_Acc = v_Ftot / a_Mass;
			} else if (mode == 1) { //midpoint first call
				MPos = a_Position + (dotPos * step);
				MVel = a_Velocity + (dotVel * step);
			} else if (mode == 2) { //midpoint second call
				v_Position = a_Position + (dotMPos * step);
				v_Velocity = a_Velocity + (dotMVel * step);
				v_Acc = v_Ftot / a_Mass;
			}
		}
		
		/**
		 * Midpoint Solver
		 *
		 * @param {float} step size of timeStep
		 */ 
		void midpointSolver(float step) {
			eulerSolver(1, step * 0.5);
			dotFinder(1);
			eulerSolver(2, step);
		}
		
		/**
		 * Velocity Verlet Solver
		 *
		 * @param {float} step size of timeStep
		 */ 
		void velVerletSolver(float step) {		
			v_Position = a_Position + a_Velocity * step + a_Acc * (step * step * 0.5);
			v_Ftot = vec3(0.0, 0.0, 0.0);
			applyAllForces(1);
			v_Acc = v_Ftot / a_Mass;
			v_Velocity = a_Velocity + (v_Acc + a_Acc) * (step * 0.5);
		}
	
		/**
		 * Back Euler Solver
		 *
		 * @param {float} step size of timeStep
		 */
		void backEulerSolver(float step) {
			eulerSolver(1, step);
			v_Ftot = vec3(0.0, 0.0, 0.0);
			applyAllForces(1);
			dotFinder(1);
			eulerSolver(2, step);
		}
		
		/**
		 * Symplectic Euler Solver
		 *
		 * @param {float} step size of timeStep
		 */
		void backMidpointSolver(float step) {
			midpointSolver(step);
			dotFinder(2);
			MPos = v_Position - (step / 2.0) * dotMPos;
			MVel = v_Velocity - (step / 2.0) * dotMVel;
			dotFinder(1);
			MPos = v_Position - dotMPos * step;
			MVel = v_Velocity - dotMVel * step;
			dotMPos = MPos - a_Position;
			dotMVel = MVel - a_Velocity;
			v_Position -= dotMPos / 2.0;
			v_Velocity -= dotMVel / 2.0;
		}
		
		/**
		 * Symplectic Euler Solver
		 *
		 * @param {float} step size of timeStep
		 */
		void symplecticEulerSolver(float step) {
			eulerSolver(0, step);
			v_Position = a_Position + v_Velocity * step;
		}
	
		/**
		 * Uses the derivatives to generate the next state
		 */
		void solver() {
			if (u_isAging)
				v_Age = a_Age + u_timeStep;
			else
				v_Age = a_Age;
			
			switch (u_solver) {
				default:
				case 0: //SOLV_EULER
					eulerSolver(0, u_timeStep);
					break;
				case 1: //SOLV_MIDPOINT
					midpointSolver(u_timeStep);
					break;
				case 2: //VEL_VERLET
					velVerletSolver(u_timeStep);
					break;
				case 3: //BACK_EULER
					backEulerSolver(u_timeStep);
					break;
				case 4: //BACK_MIDPT
					backMidpointSolver(u_timeStep);
					break;
				case 5:
					symplecticEulerSolver(u_timeStep);
					break;
			}
			
			v_Mass = a_Mass;
		}
		`;
	return str;
}

/*
 * Generates GLSL for doConstraint()
 */
PartSys.prototype.getConstraint = function() {
	var str = `
		/**
		 * Checks to see if any particles have been effected by the constraints
		 */
		void doConstraint() {
		`;
		
	for (i=0; i < this.limitList.length; i++) {
		str += this.limitList[i].getCall();
	}
	
	str += `
		}
		`;
	return str;
}

/*
 * Generates GLSL for main()
 */
PartSys.prototype.getMain = function() {
	var str = `
		void main() {`;
	if (this.sysType != SYS_CPU) {
		if (this.sysType == SYS_HYBRID) {
			str += `
			v_Ftot = a_Ftot;
			`;
		}
		str += `
			if (u_runMode > 1) {
				v_HSI = a_HSI;
				v_Life = a_Life;
				if (a_Age < a_Life) {
					applyAllForces(0);
					dotFinder(0);
					solver();
					doConstraint();
				} else {`;
		str += this.getEmitterCall();
		if (this.lCount[LIM_COLOR_AGE] > 0) {
			for (i=0; i < this.limitList.length; i++) {
				if (this.limitList[i].limitType == LIM_COLOR_AGE) {
					str += this.limitList[i].getCall();
				}
			}
		}
		str += `			
				}
			} else {
				v_Age = a_Age;
				v_Life = a_Life;
				v_Position = a_Position.xyz;
				v_Velocity = a_Velocity;
				v_Acc = a_Acc;
				v_Mass = a_Mass;
				v_HSI = a_HSI;
			}
			
			if (u_isNudge) {				//adds random velocity to all particles
				v_Velocity += randVec(4.0);
			}
		`;
	}
	
	if (this.sysType == SYS_HYBRID) {
		str += "v_Ftot = vec3(0.0, 0.0, 0.0);"	
	}
	
	if (this.sysType === SYS_CPU) {
		str += `
			gl_PointSize = a_Mass * 4.0;
			gl_Position = u_MvpMatrix * vec4(a_Position, 1.0);
			v_HSI = a_HSI;
		`;
	} else {
		str += `
			gl_PointSize = v_Mass * 4.0;
			gl_Position = u_MvpMatrix * vec4(v_Position, 1.0);
		`;
	}
	str += `
			if (u_runMode == 0) {
				v_Color = vec4(0.0, rand(vec2(gl_VertexID, gl_VertexID)) + 0.5, 1.0, 1.0);		//red: 0 == reset
			}
			else if (u_runMode <= 2) {
				v_Color = vec4(20.0, rand(vec2(gl_VertexID, gl_VertexID)) + 0.5, 1.0, 1.0);		//yellow: <= 2
			}
			else {
				v_Color = vec4(v_HSI, 1.0);
			}
		}
	`;
	return str;
}

//------FSHADER

/*
 * Compiles GLSL into one String
 *
 * @return {String} FSHADER_SOURCE
 */
PartSys.prototype.getFShader = function() {
	var str = this.getHeader();
	str += this.getFIO();
	str += this.getFHelpers();
	str += this.getFMain();
	return str;
}

/*
 * Generates GLSL for I/O
 */
PartSys.prototype.getFIO = function() {
	var str = `
		in vec4 v_Color;
	`;						//keeps inputs and outputs separte
	str += `
		out vec4 myOutputColor;
	`;
	return str;
}

/*
 * Generates GLSL for Helpers – Provides Abstraction
 */ 
PartSys.prototype.getFHelpers = function() {
	var str = this.getHSItoRGB();
	return str;
}

/*
 * Generates GLSL for HSItoRGB(vec3 HSI)
 */
PartSys.prototype.getHSItoRGB = function() {
	var str = `
		/**
		 * Converts Hue, Saturation, Intensity to RGB
		 *
		 * @param {vec3} HSI H degrees, S[0, 1], I[0, 1]
		 */
		vec3 HSItoRGB(vec3 HSI) {
			float hPrime = mod(HSI.x, 360.0);
			if (hPrime < 0.0)
				hPrime += 360.0;
			hPrime /= 60.0;
			float Z = 1.0 - abs(mod(hPrime, 2.0) - 1.0);
			float C = (3.0 * HSI.y * HSI.z) / (1.0 + Z);
			float X = C * Z;
			float m = HSI.z * (1.0 - HSI.y);
			
			vec3 RGB;
			if (hPrime <= 3.0) {
				if (hPrime <= 1.0) {
					RGB.r = C;
					RGB.g = X;
				} else {
					RGB.r = X;
					RGB.g = C;
				}
				RGB.b = 0.0;
			} else if (hPrime <= 5.0) {
				if (hPrime <= 4.0) {
					RGB.r = 0.0;
					RGB.g = X;
				} else {
					RGB.r = X;
					RGB.g = 0.0;
				}
				RGB.b = C;
			} else {
				RGB.r = C;
				RGB.g = 0.0;
				RGB.b = X;
			}
			
			RGB.rgb += m;
			RGB.rgb = min(RGB.xyz, 1.0);
			return RGB;
		}
	`;
	return str;
}

/*
 * Generates GLSL for main()
 */
PartSys.prototype.getFMain = function() {
	var str = `
		void main() {
	`;
	str += `
			float dist = distance(gl_PointCoord, vec2(0.5));
			if (dist < 0.5) {`;
	if (this.orb === true)
		str += `
				myOutputColor = vec4((1.0-2.0*dist) * HSItoRGB(v_Color.rgb), 1.0);
		`;
	else if (this.blend === true)
		str += `
				myOutputColor = vec4(HSItoRGB(v_Color.rgb), 0.25);`;
	else if (this.blend2 === true)
		str += `
				myOutputColor = vec4(HSItoRGB(v_Color.rgb), 0.6);`;
	else
		str += `
				myOutputColor = vec4(HSItoRGB(v_Color.rgb), 1.0);`;
	str += `
			} else {discard;}
	`;
	str += `
		}
	`;
	return str;
}