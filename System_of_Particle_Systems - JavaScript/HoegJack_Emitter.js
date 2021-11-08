/*
	Emitter
	by Jack Hoeg
	Last Edited: Ferbruary 7, 2020
*/
 
/**
 * Constructor for Emitter
 *
 * @param {Number} etype emitter type code
 */
function Emitter(etype, a, b, c, d) {
	this.emitType = etype;
	
	this.xDirRange = glMatrix.vec2.fromValues(-1.0, 1.0);//minimum and maximum direction values
	this.yDirRange = glMatrix.vec2.fromValues(-1.0, 1.0);
	this.zDirRange = glMatrix.vec2.fromValues(-1.0, 1.0);
	this.dirRange = glMatrix.vec3.fromValues(2.0, 2.0, 2.0); //numerical values of dirRange
	
	this.velRange = glMatrix.vec2.fromValues(0.5, 2.0);
	this.massRange = glMatrix.vec2.fromValues(2.0, 5.0);
	this.lifeRange = glMatrix.vec2.fromValues(2.0, 5.0);
	this.hueRange = glMatrix.vec2.fromValues(0.0, 360.0);
	this.satRange = glMatrix.vec2.fromValues(0.5, 1.0);
	this.intRange = glMatrix.vec2.fromValues(1.0, 1.0)
	
	//booleans to determine what needs randoms
	this.lifeRand = true;
	this.velRand = true;
	this.massRand = true;
	this.hueRand = true;
	this.satRand = true;
	this.intRand = false;
	
	this.init(a, b, c, d);
}

//=============INITIALIZERS==============//

/**
 * Handles emitter parameter setting based on type
 */
Emitter.prototype.init = function(a, b, c, d) {
	switch(this.emitType) {
		default:
		case E_VOL:
			if (typeof(a) != "undefined" && typeof(b) != "undefined")
				this.initVol(a, b);
			else
				this.initVol([0.0, 0.0, 5.0], [2.0, 2.0, 4.0]);
			break;
		case E_POINT:
			if (typeof(a) != "undefined")
				this.initPoint(a);
			else
				this.initPoint([0.0, 0.0, 5.0]);
			break;
		case E_SPHERE:
			if (typeof(a) != "undefined" && typeof(b) != "undefined")
				this.initSphere(a, b);
			else
				this.initSphere([0.0, 0.0, 5.0], 1.0);
			break;
		case E_DISC:
			if (typeof(a) != "undefined" && typeof(b) != "undefined")
				this.initDisc(a, b, c);
			else
				this.initDisc([0, 0, 5], [0, 0, 1], 2);
			break;
		case E_RECT:
			if (typeof(a) != "undefined" && typeof(b) != "undefined")
				this.initRect(a, b, c, d);
			else
				this.initRect([0, 0, 5], [0, 0, 1], 2, 2);
			break;
	}
}

/**
 * Initializes Axis-Aligned Volume Emitter
 *
 * @param {vec3} pos position at center of volume
 * @param {vec3} dim dimensions of volume
 */
Emitter.prototype.initVol = function(pos, dim) {
	this.pos = glMatrix.vec3.clone(pos);
	this.dim = glMatrix.vec3.clone(dim);
	this.xRange = glMatrix.vec2.fromValues(	-this.dim[0] / 2,
											this.dim[0] / 2);
	this.yRange = glMatrix.vec2.fromValues(	-this.dim[1] / 2,
											this.dim[1] / 2);
	this.zRange = glMatrix.vec2.fromValues(	-this.dim[2] / 2,
											this.dim[2] / 2);
}

/**
 * Initializes Point Emitter
 *
 * @param {vec3} pos position of point
 */
Emitter.prototype.initPoint = function(pos) {
	this.pos = glMatrix.vec3.clone(pos);
}

/**
 * Initializes Spherical Emitter
 *
 * @param {vec3} pos position at center of sphere
 * @param {Number} radius of sphere
 */
Emitter.prototype.initSphere = function(pos, rad) {
	this.pos = glMatrix.vec3.clone(pos);
	this.radius = rad;
}

/**
 * Initializes Disc Emitter
 *
 * @param {vec3} pos position at center of disk
 * @param {vec3} n normal to disk
 * @param {Number} radius of disk
 */
Emitter.prototype.initDisc = function(pos, n, rad) {
	this.pos = glMatrix.vec3.clone(pos);
	this.norm = glMatrix.vec3.clone(n);
	glMatrix.vec3.normalize(this.norm, this.norm);
	this.radius = rad;
	
	this.rotQuat = glMatrix.quat.create();
	glMatrix.quat.rotationTo(this.rotQuat, [0.0, 0.0, 1.0], this.norm);
}

/**
 * Initializes Rectangular Emitter
 *
 * @param {vec3} pos position at center of Rect
 * @param {vec3} n normal to rect
 * @param {Number} w width
 * @param {Number} l length
 */
Emitter.prototype.initRect = function(pos, n, w, l) {
	this.pos = glMatrix.vec3.clone(pos);
	this.norm = glMatrix.vec3.clone(n);
	glMatrix.vec3.normalize(this.norm, this.norm);
	this.wid = w;
	this.len = l;
	
	this.rotQuat = glMatrix.quat.create();
	glMatrix.quat.rotationTo(this.rotQuat, [0.0, 0.0, 1.0], this.norm);
	console.log(this.rotQuat);
}

//===============Controllers============//

/**
 * Constrain Velocity Direction
 *
 * @param {Array} a new xDirRange
 * @param {Number} a specifies which range to update
 * @param {Array} b new yDirRange or xDirRange
 * @param {Array} c new zDirRange
 */
Emitter.prototype.constrainDirection = function(a, b, c) {
	if (typeof(a) == "Array") {
		this.xDirRange[0] = a[0];
		this.xDirRange[1] = a[1];
		this.dirRange[0] = this.xDirRange[1] - this.xDirRange[0];
		if (typeof(b) == "Array") {
			this.yDirRange[0] = b[0];
			this.yDirRange[1] = b[1];
			this.dirRange[1]  = this.yDirRange[1] - this.yDirRange[0];
			if (typeof(c) == "Array") {
				this.zDirRange[0] = c[0];
				this.zDirRange[1] = c[1];
				this.dirRange[2]  = this.zDirRange[1] - this.zDirRange[0];
			}
		}
	} else if (typeof(a) == "Number") {
		if (a == 0) {
			this.xDirRange[0] = b[0];
			this.xDirRange[1] = b[1];
			this.dirRange[0] = this.xDirRange[1] - this.xDirRange[0];
		} else if (a == 1) {
			this.yDirRange[0] = b[0];
			this.yDirRange[1] = b[1];
			this.dirRange[1]  = this.yDirRange[1] - this.yDirRange[0];
		} else {
			this.zDirRange[0] = b[0];
			this.zDirRange[1] = b[1];
			this.dirRange[2]  = this.zDirRange[1] - this.zDirRange[0];
		}
	}
}

/*w
 * Sets Range for specified parameter
 *
 * @param {Number} a ID of parameter to change
 * @param {Array} b array containing lower and upper bound
 */
Emitter.prototype.setRange = function(a, b) {
	var target;
	var isTarget;
	
	switch(a) {
		default:
			return;
			break;
		case CPU_PART_LIFE:
			target = this.lifeRange;
			isTarget = this.lifeRand;
			break;
		case CPU_PART_XVEL:
		case CPU_PART_YVEL:
		case CPU_PART_ZVEL:
			target = this.velRange;
			isTarget = this.velRand
			break;
		case CPU_PART_MASS:
			target = this.massRange;
			isTarget = this.massRand;
			break;
		case CPU_PART_HUE:
			target = this.hueRange;
			isTarget = this.hueRand;
			break;
		case CPU_PART_SAT:
			target = this.satRange;
			isTarget = this.satRand;
			break;
		case CPU_PART_INT:
			target = this.intRange;
			isTarget = this.intRand;
			break;
	}
	
	target[0] = b[0];
	target[1] = b[1];
	if (b[0] === b[1])
		isTarget = false;
	else
		isTarget = true;
	
}

//=============MAKE PARTICLES===========//

/**
 * Makes a new Particle from the current emitter
 *
 * @param s {Float32Array} state variable
 * @param i {index} where particle should be written
 */
Emitter.prototype.makeParticle = function(s, i) {
	s[i+PART_AGE]  = 0;
	if (this.lifeRand === true)
		s[i+PART_LIFE] = this.randRange(this.lifeRange);
	else
		s[i+PART_LIFE] = this.lifeRange[0];

	switch (this.emitType) {
		case E_POINT:
			this.makePartPoint(s, i);
			break;
		default:
		case E_VOL:
			this.makePartVol(s, i);
			break;
		case E_SPHERE:
			this.makePartSphere(s, i);
			break;
		case E_DISC:
			this.makePartDisc(s, i);
			break;
		case E_RECT:
			this.makePartRect(s, i);
			break;
	}
	
	var velVec = new Float32Array(3);
	if (this.velRand === true)
		velVec = this.randVecRand(this.velRange)
	else {
		velVec[0] = this.velRange[0];
		velVec[1] = this.velRange[0];
		velVec[2] = this.velRange[0];
	}
	s[i+PART_XVEL] = velVec[0];
	s[i+PART_YVEL] = velVec[1];
	s[i+PART_ZVEL] = velVec[2];
	
	if (this.massRand === true)
		s[i+PART_MASS] = this.randRange(this.massRange);
	else
		s[i+PART_MASS] = this.massRange[0];
	
	if (this.hueRand === true)
		s[i+PART_HUE] = this.randRange(this.hueRange);
	else
		s[i+PART_HUE] = this.hueRange[0];
		
	if (this.satRand === true)
		s[i+PART_SAT] = this.randRange(this.satRange);
	else
		s[i+PART_SAT] = this.satRange[0];
		
	if (this.intRand === true)
		s[i+PART_INT] = this.randRange(this.intRange);
	else
		s[i+PART_INT] = this.intRange[0];
}

/**
 * Makes a new Particle from point emitter
 *
 * @param s {Float32Array} state variable
 * @param i {index} where particle should be written
 */
Emitter.prototype.makePartPoint = function(s, i) {
	s[i+PART_XPOS] = this.pos[0];
	s[i+PART_YPOS] = this.pos[1];
	s[i+PART_ZPOS] = this.pos[2];
}

/**
 * Makes a new Particle from volume emitter
 *
 * @param s {Float32Array} state variable
 * @param i {index} where particle should be written
 */
Emitter.prototype.makePartVol = function(s, i) {
	s[i+PART_XPOS] = this.pos[0] + this.randRange(this.xRange);
	s[i+PART_YPOS] = this.pos[1] + this.randRange(this.yRange);
	s[i+PART_ZPOS] = this.pos[2] + this.randRange(this.zRange);
}

/**
 * Makes a new Particle from sphere emitter
 *
 * @param s {Float32Array} state variable
 * @param i {index} where particle should be written
 */
Emitter.prototype.makePartSphere = function(s, i) {
	var tmp = this.randVecRand([0.0, this.radius]);
	s[i+PART_XPOS] = tmp[0] + this.pos[0];
	s[i+PART_YPOS] = tmp[1] + this.pos[1];
	s[i+PART_ZPOS] = tmp[2] + this.pos[2];
}

/**
 * Makes a new Particle from disc emitter
 *
 * @param s {Float32Array} state variable
 * @param i {index} where particle should be written
 */
Emitter.prototype.makePartDisc = function(s, i) {
	var randV = glMatrix.vec3.create();
	glMatrix.vec2.random(randV, this.randRange([0.0, this.radius]));
	glMatrix.vec3.transformQuat(randV, randV, this.rotQuat);

	s[i+PART_XPOS] = this.pos[0] + randV[0];
	s[i+PART_YPOS] = this.pos[1] + randV[1];
	s[i+PART_ZPOS] = this.pos[2] + randV[2];
}

/**
 * Makes a new Particle from rect emitter
 *
 * @param s {Float32Array} state variable
 * @param i {index} where particle should be written
 */
Emitter.prototype.makePartRect = function(s, i) {
	var randV = glMatrix.vec3.create();
	randV[0] = this.randRange([-this.wid / 2, this.wid / 2]);
	randV[1] = this.randRange([-this.len / 2, this.len / 2]);
	glMatrix.vec3.transformQuat(randV, randV, this.rotQuat);

	s[i+PART_XPOS] = this.pos[0] + randV[0];
	s[i+PART_YPOS] = this.pos[1] + randV[1];
	s[i+PART_ZPOS] = this.pos[2] + randV[2];
}

//=========UNIFORM HANDLER=========//

/*
	TODO: 
		the GLSL API recommends packing inputs into vec4 to better utilize the hardware
			see section 4.3.4
		make getUniforms a struct? maybe?
		the errors that get thrown in get location take up to much space!
*/

/**
 * Generates GLSL to declare Emitter uniforms
 *
 */
Emitter.prototype.getUniforms = function() {
	var str = `
		uniform vec2 u_eVelRange;
		uniform vec2 u_eMassRange;
		uniform vec2 u_eLifeRange;
		uniform vec2 u_eHueRange;
		uniform vec2 u_eSatRange;
		uniform vec2 u_eIntRange;
	`;
	switch(this.emitType) {
		default:
			break;
		case E_VOL:
			str += `
				uniform vec2 u_eXRange;
				uniform vec2 u_eYRange;
				uniform vec2 u_eZRange;
			`;
		case E_POINT:
			str += "uniform vec3 u_ePos;";
			break;
		case E_SPHERE:
			str += `
				uniform vec3 u_ePos;
				uniform float u_eRadius;
			`;
	}
	return str;
}

/**
 * Stores the uniform locations in the emitter
 *
 * @param {ShaderLoc} shaderLoc location of shader that emitter belongs to
 */
Emitter.prototype.getUniformLocations = function(shaderLoc) {
	this.u_eVelRange = gl.getUniformLocation(shaderLoc, 'u_eVelRange');
	if(this.u_eVelRange < 0) {
		console.log(this.constructor.name + 
								'.getUniformLocation() Failed to get GPU location of uniform u_eVelRange');
		return -1;	// error exit.
	}
	
	this.u_eMassRange = gl.getUniformLocation(shaderLoc, 'u_eMassRange');
	if(this.u_eVelRange < 0) {
		console.log(this.constructor.name + 
								'.getUniformLocation() Failed to get GPU location of uniform u_eMassRange');
		return -1;	// error exit.
	}
	
	this.u_eLifeRange = gl.getUniformLocation(shaderLoc, 'u_eLifeRange');
	if(this.u_eLifeRange < 0) {
		console.log(this.constructor.name + 
								'.getUniformLocation() Failed to get GPU location of uniform u_eLifeRange');
		return -1;	// error exit.
	}
	
	this.u_eHueRange = gl.getUniformLocation(shaderLoc, 'u_eHueRange');
	if(this.u_eHueRange < 0) {
		console.log(this.constructor.name + 
								'.getUniformLocation() Failed to get GPU location of uniform u_eHueRange');
		return -1;	// error exit.
	}
	
	this.u_eSatRange = gl.getUniformLocation(shaderLoc, 'u_eSatRange');
	if(this.u_eVelRange < 0) {
		console.log(this.constructor.name + 
								'.getUniformLocation() Failed to get GPU location of uniform u_eSatRange');
		return -1;	// error exit.
	}
	
	this.u_eIntRange = gl.getUniformLocation(shaderLoc, 'u_eIntRange');
	if(this.u_eIntRange < 0) {
		console.log(this.constructor.name + 
								'.getUniformLocation() Failed to get GPU location of uniform u_eIntRange');
		return -1;	// error exit.
	}
	
	switch(this.emitType) {
		default:
			break;
		case E_VOL:
			this.u_eXRange = gl.getUniformLocation(shaderLoc, 'u_eXRange');
			if(this.u_eXRange < 0) {
				console.log(this.constructor.name + 
							'.getUniformLocation() Failed to get GPU location of uniform u_eXRange');
				return -1;	// error exit.
			}
			
			this.u_eYRange = gl.getUniformLocation(shaderLoc, 'u_eYRange');
			if(this.u_eYRange < 0) {
				console.log(this.constructor.name + 
							'.getUniformLocation() Failed to get GPU location of uniform u_eYRange');
				return -1;	// error exit.
			}
			
			this.u_eZRange = gl.getUniformLocation(shaderLoc, 'u_eZRange');
			if(this.u_eZRange < 0) {
				console.log(this.constructor.name + 
							'.getUniformLocation() Failed to get GPU location of uniform u_eZRange');
				return -1;	// error exit.
			}
		case E_POINT:
			this.u_ePos = gl.getUniformLocation(shaderLoc, 'u_ePos');
			if(this.u_ePos < 0) {
				console.log(this.constructor.name + 
							'.getUniformLocation() Failed to get GPU location of uniform u_ePos');
				return -1;	// error exit.
			}
			break;
		case E_SPHERE:
			this.u_ePos = gl.getUniformLocation(shaderLoc, 'u_ePos');
			if(this.u_ePos < 0) {
				console.log(this.constructor.name + 
							'.getUniformLocation() Failed to get GPU location of uniform u_ePos');
				return -1;	// error exit.
			}
			
			this.u_eRad = gl.getUniformLocation(shaderLoc, 'u_eRadius');
			if(this.u_eRad < 0) {
				console.log(this.constructor.name + 
							'.getUniformLocation() Failed to get GPU location of uniform u_eRadius');
				return -1;	// error exit.
			}
			break;
	}
}

/**
 * Binds uniforms to currently equipped shader
 */
Emitter.prototype.bindUniforms = function() {
	gl.uniform2fv(this.u_eVelRange, this.velRange);
	gl.uniform2fv(this.u_eMassRange, this.massRange);
	gl.uniform2fv(this.u_eLifeRange, this.lifeRange);
	gl.uniform2fv(this.u_eHueRange, this.hueRange);
	gl.uniform2fv(this.u_eSatRange, this.satRange);
	gl.uniform2fv(this.u_eIntRange, this.intRange);
	
	switch(this.emitType) {
		default:
			break;
		case E_VOL:
			gl.uniform2fv(this.u_eXRange, this.xRange);
			gl.uniform2fv(this.u_eYRange, this.yRange);
			gl.uniform2fv(this.u_eZRange, this.zRange);
		case E_POINT:
			gl.uniform3fv(this.u_ePos, this.pos);
			break;
		case E_SPHERE:
			gl.uniform3fv(this.u_ePos, this.pos);
			gl.uniform1f(this.u_eRad, this.radius);
			break;
	}
}

//=========GLSL Variations=========//

/**
 * Gets GLSL string of particle emitter
 *
 * @return {String} GLSL of function
 */
Emitter.prototype.getMakeParticle = function() {
	switch(this.emitType) {
		case E_POINT:
			return this.getEPoint();
			break;
		default:
		case E_VOL:
			return this.getEVol();
			break;
		case E_SPHERE:
			return this.getESphere();
			break;
	}

	//way to write more adaptive glsl
	// var str = `
// 		/**
// 		 * Makes a new Particle from the current emitter
// 		 * @param {int} emitType type of emitter being used
// 		 */
// 		void makeParticle(int emitType) {
// 			switch (emitType) {
// 			
// 			}
// 		}
// 	`;
}

/**
 * Generates GLSL for E_VOL emitter
 *
 * @return {String} GLSL for string
 */
Emitter.prototype.getEPoint = function() {
	var str = `
		/**
		 * Makes a new particle from point emitter
		 *
		 */
		void makeParticlePoint() {			
			v_Position = u_ePos;
			float velMag = rand(vec2(v_Position.y, a_Position.z)) * (u_eVelRange.y - u_eVelRange.x) + u_eVelRange.x;
			v_Velocity = randVec(velMag);
			
			v_Mass = rand(vec2(a_Mass, a_Position.y)) * (u_eMassRange.y - u_eMassRange.x) + u_eMassRange.x;
			v_Age = 0.0;
			v_Life = rand(vec2(v_Mass, v_Velocity.y)) * (u_eLifeRange.y - u_eLifeRange.x) + u_eLifeRange.x;
			
			v_HSI.r = rand(vec2(v_Life, v_Position.x)) * (u_eHueRange.y - u_eHueRange.x) + u_eHueRange.x;
			v_HSI.g = rand(vec2(v_Life, v_HSI.r)) * (u_eSatRange.y - u_eSatRange.x) + u_eSatRange.x;
			v_HSI.b = rand(vec2(v_Position.z, v_HSI.r)) * (u_eIntRange.y - u_eIntRange.x) + u_eIntRange.x;
		}
	`;
	return str;
}

/**
 * Generates GLSL for E_VOL emitter
 *
 * @return {String} GLSL for string
 */
Emitter.prototype.getEVol = function() {
	var str = `
		/**
		 * Makes a new Particle from volume emitter
		 *
		 */
		void makeParticleVol() {
			float xRand = rand(a_Position.yz) * (u_eXRange.y - u_eXRange.x) + u_eXRange.x;
			float yRand = rand(a_Position.xz) * (u_eYRange.y - u_eYRange.x) + u_eYRange.x;
			float zRand = rand(a_Position.xy) * (u_eZRange.y - u_eZRange.x) + u_eZRange.x;
			
			v_Position = u_ePos + vec3(xRand, yRand, zRand);
			float velMag = rand(vec2(v_Position.y, a_Position.z)) * (u_eVelRange.y - u_eVelRange.x) + u_eVelRange.x;
			v_Velocity = randVec(velMag);
			
			v_Mass = rand(vec2(a_Mass, a_Position.y)) * (u_eMassRange.y - u_eMassRange.x) + u_eMassRange.x;
			v_Age = 0.0;
			v_Life = rand(vec2(v_Mass, v_Velocity.y)) * (u_eLifeRange.y - u_eLifeRange.x) + u_eLifeRange.x;
			
			v_HSI.r = rand(vec2(v_Life, v_Position.x)) * (u_eHueRange.y - u_eHueRange.x) + u_eHueRange.x;
			v_HSI.g = rand(vec2(v_Life, v_HSI.r)) * (u_eSatRange.y - u_eSatRange.x) + u_eSatRange.x;
			v_HSI.b = rand(vec2(v_Position.z, v_HSI.r)) * (u_eIntRange.y - u_eIntRange.x) + u_eIntRange.x;
		}
	`;
	return str;
}

/**
 * Generates GLSL for E_SPHERE emitter
 *
 * @return {String} GLSL for string
 */
Emitter.prototype.getESphere = function() {
	var str = `
		/**
		 * Makes a new Particle from volume emitter
		 *
		 */
		void makeParticleSphere() {
			v_Position = randVec(rand(vec2(a_Position.z, a_Position.x)) * u_eRadius) + u_ePos;
			float velMag = rand(vec2(v_Position.y, a_Position.z)) * (u_eVelRange.y - u_eVelRange.x) + u_eVelRange.x;
			v_Velocity = randVec(velMag);
			
			v_Mass = rand(vec2(a_Mass, a_Position.y)) * (u_eMassRange.y - u_eMassRange.x) + u_eMassRange.x;
			v_Age = 0.0;
			v_Life = rand(vec2(v_Mass, v_Velocity.y)) * (u_eLifeRange.y - u_eLifeRange.x) + u_eLifeRange.x;
			
			v_HSI.r = rand(vec2(v_Life, v_Position.x)) * (u_eHueRange.y - u_eHueRange.x) + u_eHueRange.x;
			v_HSI.g = rand(vec2(v_Life, v_HSI.r)) * (u_eSatRange.y - u_eSatRange.x) + u_eSatRange.x;
			v_HSI.b = rand(vec2(v_Position.z, v_HSI.r)) * (u_eIntRange.y - u_eIntRange.x) + u_eIntRange.x;
		}
	`;
	return str;
}

/**
 * Gets GLSL string of emitter call
 *
 * @return {String} GLSL of function
 */
Emitter.prototype.getEmitterCall = function() {
	switch(this.emitType) {
		case E_POINT:
			return this.getEPointCall();
			break;
		default:
		case E_VOL:
			return this.getEVolCall();
			break;
		case E_SPHERE:
			return this.getESphereCall();
			break;
	}
}

/**
 * Generates GLSL to call E_POINT emitter
 */
Emitter.prototype.getEPointCall = function() {
	// var str = "makeParticlePoint(" 	+ glMatrix.vec3.str(this.pos) + ", "
// 									+ glMatrix.vec2.str(this.velRange) + ");\n";
	var str = "makeParticlePoint();\n";
	return str;
}

/**
 * Generates GLSL to call E_VOL emitter
 */
Emitter.prototype.getEVolCall = function() {
	var str = "makeParticleVol();\n";
	return str;
}


/**
 * Generates GLSL to call E_SPHERE emitter
 */
Emitter.prototype.getESphereCall = function() {
	var str = "makeParticleSphere();\n";
	return str;
}

//===============HELPERS===========//

/**
 * Generates a random float in the provided range
 *
 * @param {Array} range to draw from
 */
Emitter.prototype.randRange = function(range) {
	return Math.random() * (range[1] - range[0]) + range[0];
}

/**
 * Generates a random vector in the specified range
 *
 * @param {Number} Range of magnitude to compute
 */
Emitter.prototype.randVecRand = function(range) {
	var randVec = glMatrix.vec3.create
	glMatrix.vec3.random(randVec, this.randRange(range));
	return randVec;
}

/**
 * Generates a random vector of specified scale
 *
 * @param {Number} scale of magnitude to compute
 */
Emitter.prototype.randVec = function(scale) {
	var randVec = glMatrix.vec3.create();
	glMatrix.vec3.random(randVec, scale);
	return randVec;
}